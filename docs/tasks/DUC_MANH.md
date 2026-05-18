# Đức + Mạnh — Backend Track

**Branch:** `backend/duc`
**Folders:** `backend/` (Đức) · `data/` (Mạnh) · `tools/` (Mạnh)

---

## Phân công

| Người | Làm gì |
|---|---|
| **Đức** | Core engine: ingest → retrieval → scoring → explanation → `/match` |
| **Mạnh** | Synthetic data + Internal test UI để debug từng layer |

Hai người làm song song, không block nhau — Mạnh không cần chờ Đức xong engine mới test được.

---

# Đức — Core Engine

## Thứ tự build (mỗi bước test xong mới qua bước tiếp)

### B3 — `backend/ingest.py`

Implement `main()` — scaffold đã có, chỉ cần điền logic:

```python
def main():
    profiles = json.loads(Path(settings.data_path).read_text(encoding="utf-8"))
    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    collection = client.get_or_create_collection(settings.collection_name)
    texts  = [build_text(p) for p in profiles]
    embeds = model.encode(texts).tolist()
    collection.upsert(
        ids=[p["id"] for p in profiles],
        embeddings=embeds,
        documents=texts,
        metadatas=[flatten_metadata(p) for p in profiles]
    )
    print(f"Ingested {len(profiles)} profiles. Count: {collection.count()}")
```

✅ Test: `python ingest.py` → "Ingested 25 profiles. Count: 25"

---

### B4 — `backend/retrieval.py`

```python
def retrieve_candidates(brief: BriefRequest, top_k: int = 20) -> list[dict]:
    query = (f"Campaign for {brief.brand} in {brief.industry}. "
             f"Type: {brief.campaign_type}. Tone: {brief.tone}. {brief.description}")
    model = SentenceTransformer(MODEL_NAME)
    vec   = model.encode([query]).tolist()
    col   = chromadb.PersistentClient(path=settings.chroma_persist_dir) \
                    .get_collection(settings.collection_name)
    res   = col.query(query_embeddings=vec, n_results=top_k)
    return [{"id": res["ids"][0][i], "metadata": res["metadatas"][0][i]}
            for i in range(len(res["ids"][0]))]
```

✅ Test: gọi hàm với brief test, in top 5 names — xem có relate không.

**Lưu ý quan trọng:** Cache model ở module level — không khởi tạo lại mỗi request:
```python
# Đầu file, ngoài function
_model = None
def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model
```

---

### B5 — `backend/scoring.py`

Dùng weights từ `data/scoring_design.md` của Sơn+Thành khi có. Nếu chưa có thì dùng default, refactor sau — không block.

```python
WEIGHTS = {
    "genre_match": 0.25, "style_match": 0.20, "specialty_match": 0.20,
    "performance": 0.15, "availability": 0.10, "experience": 0.05, "budget_fit": 0.05,
}

def score_candidate(meta: dict, brief: BriefRequest) -> dict:
    b = {}
    b["genre_match"]     = 1.0 if meta["primary_genre"] == brief.campaign_type else 0.3
    b["style_match"]     = 1.0 if meta["primary_style"] == brief.tone else 0.2
    b["specialty_match"] = 1.0 if brief.industry in meta["specialties"].split(",") else 0.2
    b["performance"]     = min(meta["avg_views"] / 20_000_000, 1.0) * 0.5 + \
                           (meta["satisfaction"] / 5.0) * 0.5
    b["availability"]    = 1.0 if meta["availability_status"] == "available" else 0.2
    b["experience"]      = min(meta["years_experience"] / 20, 1.0)
    b["budget_fit"]      = 1.0 if meta["budget_min_usd"] <= brief.budget_usd \
                                   <= meta["budget_max_usd"] else 0.1
    total     = sum(b[k] * WEIGHTS[k] for k in WEIGHTS) * 100
    breakdown = {k: round(b[k] * WEIGHTS[k] * 100, 1) for k in WEIGHTS}
    return {"score": round(total, 1), "score_breakdown": breakdown}

def rank_candidates(candidates, brief, top_n=5):
    scored = [{**c, **score_candidate(c["metadata"], brief)} for c in candidates]
    return sorted(scored, key=lambda x: x["score"], reverse=True)[:top_n]
```

✅ Test: print score breakdown cho top 3 với brief Vinamilk TVC.

---

### B6 — `backend/explanation.py`

Cần `OPENAI_API_KEY` từ Trung qua DM. Làm sau B3–B5 xong.

Scaffold đã có sẵn và đã dùng OpenAI. Chỉ cần verify prompt output có nhắc tên brand + kinh nghiệm cụ thể, không generic.

---

### B7 — Wire up `/match`

`main.py` scaffold đã có, uncomment và đảm bảo không còn `raise NotImplementedError`.

```bash
uvicorn main:app --reload --port 8000

# Test nhanh:
curl -X POST http://localhost:8000/match \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Vinamilk", "industry": "FMCG",
    "campaign_type": "TVC", "tone": "emotional_storytelling",
    "budget_usd": 40000, "timeline_weeks": 6,
    "description": "TVC Tet, mothers 25-40, warm authentic", "top_n": 5
  }'
```

Khi `/match` trả JSON đúng → **ping Mạnh** để test trên test UI, **ping Duy** để swap mock → real.

---

# Mạnh — Synthetic Data + Test UI

## M1 — Mở rộng synthetic data

**Vấn đề với 25 profiles hiện tại:** Quá ít để test edge cases — chỉ có vài người per genre, nên retrieval và scoring không có nhiều variation để phân tích.

**Mục tiêu:** Tạo thêm 25 profiles nữa (tổng 50) với controlled variation:

```python
# tools/gen_profiles.py
# Tạo profiles đảm bảo coverage:
# - Mỗi genre: ít nhất 8 directors (TVC, digital_content, social_media, music_video, corporate)
# - Mỗi tone: ít nhất 5 directors
# - Budget range đa dạng: $3K–$200K
# - Mix: available/booked (70/30)
# - Performance range: avg_views từ 500K đến 25M
# - Experience: 1 năm đến 20 năm
```

Thêm profiles vào `data/directors_mockup.json` — giữ schema y hệt 25 cái đã có, chỉ thêm records.

**Tại sao quan trọng:** Với 25 profiles, top-20 retrieval gần như lấy hết data → Layer 1 không có ý nghĩa. Cần ít nhất 50 để retrieval thật sự filter được.

---

## M2 — Internal Test UI (`tools/test_ui.py`)

Đây là **Streamlit app** để Đức và team debug từng layer — không phải dashboard cho Thành, không cần đẹp.

```bash
pip install streamlit --break-system-packages
streamlit run tools/test_ui.py
```

### Giao diện cần có:

**Tab 1 — Brief Input + Full Result**
```
[ Brand ]  [ Industry ]  [ Campaign type ]  [ Tone ]
[ Budget slider ]  [ Timeline ]  [ Description ]
[ Top N ]  →  [ RUN ]

Kết quả:
  Rank | Name          | Score | Genre | Style | Specialty | ...
   1   | Nguyễn M.Khoa | 87.4  | 25.0  | 18.0  | 20.0      | ...
   2   | Trần P.Linh   | 74.1  | 22.5  | 16.0  | 20.0      | ...
```

**Tab 2 — Layer Inspector**

Xem từng layer riêng biệt để debug:
```
Layer 1 (Retrieval): top 20 candidates từ ChromaDB + cosine distance
Layer 2 (Scoring):   full score breakdown table + sort by any dimension
Layer 3 (Explain):   explanation text per candidate (nếu có API key)
```

**Tab 3 — Weight Playground**

Sliders để thay đổi weights real-time và thấy ranking thay đổi ngay:
```
genre_match    [====|----] 0.25
style_match    [===|----- ] 0.20
specialty_match[===|----- ] 0.20
performance    [==|------] 0.15
availability   [=|-------] 0.10
experience     [---------] 0.05
budget_fit     [---------] 0.05

→ Kết quả re-rank ngay khi kéo slider
```

Tab 3 đặc biệt quan trọng — Sơn và Thành có thể ngồi kéo slider và thấy ngay tác động, không cần chờ Đức sửa code.

**Tab 4 — Batch Test**

Chạy nhiều briefs cùng lúc và so sánh:
```python
# Load test_briefs.json của Sơn
# Với mỗi brief: chạy /match, so sánh vs expected_top3
# Hiển thị: brief label | expected | actual | overlap% | pass/fail
```

### Code khung để bắt đầu:

```python
# tools/test_ui.py
import streamlit as st
import requests, json

API = "http://localhost:8000"

st.title("Matching Engine — Internal Test UI")

tab1, tab2, tab3, tab4 = st.tabs(["Result", "Layer Inspector", "Weight Playground", "Batch Test"])

with tab1:
    brand    = st.text_input("Brand", "Vinamilk")
    industry = st.selectbox("Industry", ["FMCG","F&B","Banking","Insurance","Beauty","Tech"])
    # ... các field khác
    if st.button("Run"):
        r = requests.post(f"{API}/match", json={...}).json()
        st.dataframe(r["shortlist"])  # hiện kết quả dạng bảng

with tab3:
    st.subheader("Weight Playground")
    weights = {}
    weights["genre_match"]     = st.slider("Genre match",      0.0, 0.5, 0.25)
    weights["style_match"]     = st.slider("Style match",      0.0, 0.5, 0.20)
    weights["specialty_match"] = st.slider("Specialty match",  0.0, 0.5, 0.20)
    weights["performance"]     = st.slider("Performance",      0.0, 0.5, 0.15)
    weights["availability"]    = st.slider("Availability",     0.0, 0.3, 0.10)
    weights["experience"]      = st.slider("Experience",       0.0, 0.2, 0.05)
    weights["budget_fit"]      = st.slider("Budget fit",       0.0, 0.2, 0.05)
    # gọi /match với custom weights, hiện kết quả re-ranked
```

---

## Dependency

| Mạnh cần | Khi nào |
|---|---|
| Không cần gì để bắt đầu M1 | Làm ngay |
| Backend `/match` chạy | Để test Tab 1, 2, 4 |
| `data/test_briefs.json` của Sơn | Để chạy Tab 4 (Batch Test) |
| Đức expose endpoint `/match?weights=...` | Để Weight Playground gọi API với custom weights |

Mạnh bắt đầu M1 (synthetic data) ngay, M2 (test UI) bắt đầu sau khi Đức xong B7.
