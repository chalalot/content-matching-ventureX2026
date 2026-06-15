# Layer 1 — Semantic Retrieval

> Owner: Mạnh · File: [backend/retrieval.py](../../backend/retrieval.py)

## Mục đích

Từ 1 brief (text + metadata), lọc nhanh director/KOL → trả về **top-K candidate gần nhất về ngữ nghĩa** cho Layer 2 chấm điểm. Không quyết định ai thắng — chỉ thu hẹp tập tìm kiếm.

> Có file song song [retrieval_kol.py](../../backend/retrieval_kol.py) cho pipeline KOL (cùng cơ chế, collection `kols`, 53 profiles).

## Cập nhật 2026-06-14 — Over-fetch (sửa retrieval miss)

> Thay đổi **KHÔNG nằm trong logic retrieval** — model embedding, query text, và cosine search giữ nguyên 100%. Chỉ đổi **độ sâu retrieve** gọi từ [main.py](../../backend/main.py): `top_k=20` → `RETRIEVAL_TOP_K = 60` (dùng cho cả director và KOL).

**Vấn đề đo được** (qua eval harness [backend/eval/](../../backend/eval/)): 2 KOL đúng nhưng bị *miss* ngay ở Layer 1 — không lọt top-20 nên Layer 2 **không bao giờ thấy** để chấm:
- Sơn Tùng M-TP (Premium) — cosine rank **#43/53**
- Phương Ly — cosine rank **#28/53**

**Nguyên nhân:** pool KOL có 53 nhưng chỉ lấy top-20 → Layer 1 lọc quá gắt, loại candidate tốt *trước khi* Layer 2 kịp chấm. (Layer 2 vốn rank lại toàn bộ bằng rule deterministic, nên đưa nhiều candidate vào là an toàn & rẻ.)

**Cách sửa:** nâng `top_k` để Layer 2 nhìn thấy gần như cả pool. Không động vào cách Layer 1 *tìm* candidate, chỉ đổi *bao nhiêu* candidate được chuyển sang Layer 2.

**Kết quả (đo bằng eval):**

| Set | recall@5 | MRR |
|---|---|---|
| KOL (easy) | 0.90 → **1.00** | 1.00 → 1.00 |
| KOL (hard) | 0.80 → **1.00** | 0.64 → **1.00** |
| Director | 1.00 → 1.00 (không đổi) | 1.00 → 1.00 |

**Caveat:** cách này hợp lý vì catalog còn nhỏ (`top_k=60` ≈ lấy hết 53 KOL / 25 director). Khi catalog lớn (hàng trăm+), `top_k=60` lại trở thành filter thật → **lúc đó mới** cần cải thiện chất lượng retrieval (embedding mạnh hơn / query rewrite / rerank).

**Đã thử & loại:** reshape query KOL cho giống format corpus — đo thấy *hòa* (sửa được Phương Ly nhưng làm Đức Phúc rớt khỏi top-20) nên đã **revert**. Logic retrieval giữ nguyên.

## Cơ chế (4 bước)

```
BriefRequest
     │
     ▼  _build_query_text()
"Brand: Vinamilk. Industry: FMCG. Campaign type: TVC.
 Tone: emotional_storytelling. Description: ..."
     │
     ▼  SentenceTransformer("all-MiniLM-L6-v2").encode()
[0.12, -0.34, ..., 0.07]   ← 384-dim vector
     │
     ▼  ChromaDB.query(n_results=top_k)
top-K vectors gần nhất (cosine)
     │
     ▼  _hydrate_metadata()   (unpack raw_json để lấy `bio`)
[{"id": "DIR-003", "metadata": {...}}, ...]
```

### 1. Compose query text
Ghép 5 field của `BriefRequest`: `brand`, `industry`, `campaign_type`, `tone`, `description` thành 1 đoạn text. **Cố ý giống format `build_text()` trong [ingest.py](../../backend/ingest.py)** để query và document nằm cùng "semantic space".

### 2. Embed
Dùng `sentence-transformers/all-MiniLM-L6-v2` (cùng model với ingest):
- 384 chiều, multilingual OK
- Encode ~5ms cho 1 query
- Model load 1 lần qua `@lru_cache` ở module level

### 3. Vector search trong ChromaDB
Persistent client đọc từ `backend/chroma_db/`. Collection `directors` đã được ingest sẵn 25 documents với metadata flatten + `raw_json` đầy đủ. Search bằng cosine similarity, trả `top_k` results.

### 4. Hydrate metadata
ChromaDB flatten metadata không có field `bio` (Layer 3 cần). Giải pháp: parse `raw_json` (đã được nhét lúc ingest) để bổ sung `bio` vào dict trả ra, **không phải sửa code Đức**.

## Contract output

```python
[
  {
    "id": "DIR-003",
    "metadata": {
      "name", "primary_genre", "primary_style",
      "specialties",        # CSV string
      "notable_brands",     # CSV string
      "availability_status", "available_from",
      "budget_min_usd", "budget_max_usd",
      "years_experience",
      "avg_views", "satisfaction",
      "collaboration_style",
      "bio",                # hydrated from raw_json
      ...
    }
  },
  ...
]
```

→ Layer 2 (`rank_candidates`) consume trực tiếp, không cần adapter.

## Vì sao chọn ChromaDB (không FAISS)

- [ingest.py](../../backend/ingest.py) đã wire sẵn ChromaDB pipeline → tránh viết trùng
- Persistent client = zero-infra cho POC hackathon
- FAISS chỉ là index thuần, ChromaDB tặng kèm metadata storage + persistence

## Singleton & startup cost

| Op | Cold | Warm |
|---|---|---|
| Load model | ~5s | 0ms (cached) |
| Connect Chroma | ~1s | 0ms (cached) |
| Encode + search | ~10ms | ~10ms |

→ Cold start lần đầu request ~6s; sau đó **mọi request ~10ms**. Đáp ứng tiêu chí "< 5s" thoải mái.

## Edge cases

- **Collection rỗng** → raise `RuntimeError` với message hướng dẫn chạy `ingest.py`
- **`top_k > collection.count()`** → tự cap về số documents có thật
- **Field `bio` thiếu** → fallback chuỗi rỗng, không crash

## Cách chạy & test

```powershell
# (1 lần) Build ChromaDB
cd backend
uv run python ingest.py

# Chạy 10 unit tests
uv run pytest test_retrieval.py -v -s
```

Test cover:
- top-K size + uniqueness (3 briefs)
- metadata contract đủ 14 fields cho Layer 2/3
- response time < 5s
- relevance smoke (luxury brief → fashion/luxury director top 5)

## KHÔNG làm ở Layer 1

- Không chấm điểm hay rank (đó là Layer 2)
- Không generate explanation (đó là Layer 3)
- Không filter cứng theo budget/availability — chỉ retrieve broad, để Layer 2 xử lý
- Không hybrid search (BM25 + dense) — overkill cho POC
