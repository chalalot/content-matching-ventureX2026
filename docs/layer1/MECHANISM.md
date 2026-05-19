# Layer 1 — Semantic Retrieval

> Owner: Mạnh · File: [backend/retrieval.py](../../backend/retrieval.py)

## Mục đích

Từ 1 brief (text + metadata), lọc nhanh 25 director → trả về **top-K candidate gần nhất về ngữ nghĩa** cho Layer 2 chấm điểm. Không quyết định ai thắng — chỉ thu hẹp tập tìm kiếm.

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
