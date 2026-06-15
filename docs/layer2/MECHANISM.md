# Layer 2 — Weighted Scoring

> Owner: Mạnh · File: [backend/scoring.py](../../backend/scoring.py)

## Mục đích

Nhận candidates từ Layer 1 (mặc định **top-60**, xem `RETRIEVAL_TOP_K` ở Layer 1) → chấm điểm rule-based theo 7 dimension → sort → trả top-N (default 5). Quyết định ai thắng, ai thua.

> Có scorer song song [scoring_kol.py](../../backend/scoring_kol.py) cho KOL — cùng kiến trúc 7-dimension nhưng dimension đặc thù KOL (`niche_match`, `platform_match`, `audience_fit`, `engagement`, `reach`, `budget_fit`, `availability`).

## Cập nhật 2026-06-14 — KOL niche synonym map

> Phạm vi: **scoring.py (director) KHÔNG đổi** — eval không phát hiện lỗi nào ở pipeline director. Thay đổi nằm ở scorer KOL [scoring_kol.py](../../backend/scoring_kol.py).

**Vấn đề đo được** (eval [backend/eval/](../../backend/eval/)): brief có `target_niche = "Fashion"` (mô tả về workwear) → creator @WorkwearWendy (`main_niche = "Workwear"`) bị **floor 0.2** vì so khớp chuỗi chính xác (`"Workwear" != "Fashion"`), tụt xuống **#8**. Workwear thực chất *là* fashion.

**Cách sửa:** thêm `_NICHE_GROUPS` (synonym map) trong scoring_kol.py — niche cùng nhóm được điểm trung gian thay vì floor:

| Quan hệ niche | Điểm |
|---|---|
| Trùng khớp (exact) | `1.0` |
| Liên quan (cùng nhóm) | `0.6` ← `RELATED_NICHE_SCORE` (tunable) |
| Không liên quan | `0.2` |

Nhóm hiện tại (cố ý **hẹp** để không làm loãng precision): `{beauty, skincare, makeup}`, `{fashion, workwear}`, `{fitness, wellness}`.

**Kết quả:** @WorkwearWendy **#8 → #1**. KOL (hard) recall@5 0.80 → **1.00**, MRR 0.82 → **1.00**.
Đánh đổi nhỏ: KOL (easy) precision@k 0.83 → 0.67 — creator niche *liên quan* lọt vào top-k (hành vi hợp lý), nhưng **recall@5 & MRR vẫn 1.00** (không expected nào rớt khỏi top-5).

**Caveat (honest):** đây là map **hardcode** — phải tự maintain, chỉ phủ các cặp đã liệt kê (vd "Cooking" vs "Food" chưa có). Giải pháp tổng quát hơn: match niche bằng **semantic similarity** (tận dụng embedding, không cần list) — cân nhắc khi vocab niche lớn. Chi tiết: [docs/plan/layer1-layer2-improvement-plan.md](../plan/layer1-layer2-improvement-plan.md).

## Cơ chế

```
Layer 1 output: [{id, metadata}, ...]   +   BriefRequest
                            │
                            ▼  for each candidate:
              ┌─────────────────────────────┐
              │  7 hàm _xxx_score()          │
              │  → raw [0.0, 1.0]            │
              │  × MAX_POINTS (= weight×100) │
              │  → pts theo dimension        │
              └─────────────────────────────┘
                            │
                            ▼
       ScoreBreakdown(genre_match, style_match, ...)
       total = sum(parts)   ← 0–100
                            │
                            ▼  sort desc + slice top_n
       [{id, metadata, score, score_breakdown}, ...]
```

## 7 Dimensions (v1 từ OVERVIEW.md)

| Dim | Weight | Max pts | Rule |
|---|---|---|---|
| `genre_match` | 25% | 25 | `primary_genre == campaign_type` → 1.0, khác → 0.3 |
| `style_match` | 20% | 20 | `primary_style == tone` → 1.0, khác → 0.2 |
| `specialty_match` | 20% | 20 | `industry ∈ specialties.split(",")` → 1.0, khác → 0.2 |
| `performance` | 15% | 15 | `0.7 × satisfaction/5 + 0.3 × min(views, 5M)/5M` |
| `availability` | 10% | 10 | `"available"` → 1.0, `"booked"` → 0.2 |
| `experience` | 5% | 5 | `min(years_experience / 20, 1.0)` |
| `budget_fit` | 5% | 5 | `budget_min ≤ brief.budget_usd ≤ budget_max` → 1.0, khác → 0.1 |

## Vì sao chọn rule-based

- **Explainable** — mỗi điểm có thể giải thích bằng 1 câu cho business (cần thiết cho dashboard score breakdown)
- **Không cần training data** — POC hackathon không có ground truth
- **Deterministic** — cùng input → cùng output, dễ test
- **Easy to tune** — sửa weight/threshold mà không retrain

## Đặc thù implementation

### `_specialty_score` — parse CSV string

ChromaDB chỉ chấp nhận primitive trong metadata → `ingest.py` flatten list thành CSV string `"FMCG,F&B,Healthcare"`. Layer 2 split lại bằng `","`, strip whitespace, dùng set membership check.

### `_performance_score` — bias satisfaction

Công thức `0.7 × satisfaction + 0.3 × views` ưu tiên chất lượng (client_satisfaction_score 1–5) hơn lượt xem. Lý do: brand quan tâm "ai dễ làm việc + chất lượng cao" > "ai viral nhất". `VIEWS_CAP = 5M` tránh outlier (Độ Mixi 10M+ skew toàn bộ thang điểm).

### Defensive defaults

Mọi `meta.get(field, default)` với default an toàn (0 hoặc empty string). Mockup data có thể bị Sơn update sai field name → không crash, chỉ trả điểm thấp.

## Contract với Layer 1 & main.py

### Input
```python
candidates: list[dict]   # từ Layer 1, mỗi dict có "metadata" với 9 field cần thiết
brief: BriefRequest      # 4 field dùng: campaign_type, tone, industry, budget_usd
top_n: int = 5
```

### Output
```python
[
  {
    "id": "DIR-XXX",
    "metadata": {...},                # passthrough từ Layer 1
    "score": 87.5,                    # 0–100, đã round 2 chữ số
    "score_breakdown": {              # match Pydantic ScoreBreakdown
        "genre_match": 25.0,
        "style_match": 20.0,
        "specialty_match": 20.0,
        "performance": 12.45,
        "availability": 10.0,
        "experience": 4.5,
        "budget_fit": 5.0,
    }
  },
  ...
]
```

→ [main.py:42-47](../../backend/main.py) consume trực tiếp, `score_breakdown` truyền vào `ScoreBreakdown(**c["score_breakdown"])` để build response.

## Integration với Layer 1

Đã wire sẵn trong [main.py:31-32](../../backend/main.py):
```python
candidates = retrieve_candidates(brief, top_k=RETRIEVAL_TOP_K)  # Layer 1 (=60)
ranked = rank_candidates(candidates, brief, top_n=...)         # Layer 2
```

Test `test_layer1_layer2_pipeline_smoke` (trong [test_scoring.py](../../backend/test_scoring.py)) verify end-to-end: real Chroma retrieve → score → rank → top 5 sorted, không crash.

## Performance

- 20 candidates × 7 dim = ~140 dict lookups + ít phép tính float
- Đo đạc: ~5–10 ms cho 20 candidates
- Không async, không cần optimize ở scope POC

## Cách chạy & test

```powershell
cd backend
uv run python ingest.py            # nếu chroma_db/ chưa có
uv run pytest test_scoring.py -v   # 14 tests
```

## KHÔNG làm ở Layer 2

- Không generate explanation (Layer 3 lo)
- Không LLM, không embedding (rule-based thuần)
- Không cá nhân hóa weights theo brief — dùng đúng OVERVIEW v1 cho toàn bộ
- Không xét `available_from` date (chỉ status string `available`/`booked`)
- Không multi-genre/multi-style — chỉ compare primary

## Tunable knobs (cho mentor session sau)

- `WEIGHTS` dict — đổi tỉ lệ 7 dim
- `VIEWS_CAP = 5_000_000` — threshold để normalize views
- `EXPERIENCE_CAP = 20` — số năm coi là "kinh nghiệm tối đa"
- Hằng số 0.7/0.3 trong `_performance_score` — tỉ lệ satisfaction vs views
- Penalty score (0.3, 0.2, 0.1) cho các case mismatch — tăng để "phạt" gắt hơn
