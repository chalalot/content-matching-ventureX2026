# Task Assignments — AI Matching Engine

> Mỗi người chỉ cần làm phần của mình. Trung sẽ review và merge vào `main`.
> Branch convention: `feat/<your-name>/<short-description>`

---

## Trung — Founder

**Focus:** Architecture, Layer 3, review tổng thể

| Task | File | Ghi chú |
|------|------|---------|
| Setup GitHub repo, branch protection, invite team | — | Làm trước khi team bắt đầu |
| Implement `generate_explanation()` | `backend/layer3_explanation/explanation.py` | Dùng template-based trước, đủ cho POC |
| Review PR của Mạnh (Layer 1) | — | |
| Review PR của Đồng Đức (Layer 2 + routes) | — | |
| Viết `docs/architecture.md` (sơ đồ hệ thống) | `docs/architecture.md` | Mermaid flowchart |

---

## Mạnh — Backend Developer

**Focus:** Layer 1 — Semantic Retrieval

| Task | File | Ghi chú |
|------|------|---------|
| Implement `CandidateRetriever.build_index()` | `backend/layer1_retrieval/retrieval.py` | Dùng `sentence-transformers` + FAISS |
| Implement `CandidateRetriever.search()` | `backend/layer1_retrieval/retrieval.py` | Trả về top-20 candidates |
| Viết unit test cho retrieval | `backend/layer1_retrieval/test_retrieval.py` | Test với ít nhất 3 brief mẫu |
| Đảm bảo response time < 5s | — | Ghi vào PR description |

**Hướng dẫn nhanh:**
```python
# Model nhẹ, hỗ trợ tiếng Việt:
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

# Encode và build FAISS index:
embeddings = model.encode(texts, normalize_embeddings=True)
index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(embeddings)

# Search:
query_vec = model.encode([brief_text], normalize_embeddings=True)
scores, indices = index.search(query_vec, top_k)
```

---

## Đồng Đức — Backend Developer

**Focus:** Layer 2 (Scoring) + API Routes

| Task | File | Ghi chú |
|------|------|---------|
| Implement `score_candidates()` | `backend/layer2_scoring/scoring.py` | Rule-based dùng `WEIGHTS` đã có sẵn |
| Wire 3 layers vào `POST /match` | `backend/api/routes.py` | Layer1 → Layer2 → Layer3 → response |
| Test endpoint với `curl` hoặc Postman | — | Ghi kết quả vào PR |
| Viết `__init__.py` cho các package | `backend/layer*/\_\_init\_\_.py` | Cần để import hoạt động |

**Hướng dẫn nhanh:**
```bash
# Chạy server:
cd matching-engine
uvicorn backend.main:app --reload

# Test health:
curl http://localhost:8000/api/health

# Test match:
curl -X POST http://localhost:8000/api/match \
  -H "Content-Type: application/json" \
  -d '{"brief_text": "gameshow hài thực tế", "genres": ["reality_tv"], "style_tags": ["comedic"], "top_n": 3}'
```

---

## Duy — Frontend Developer

**Focus:** Dashboard UI

| Task | File | Ghi chú |
|------|------|---------|
| Verify match engine hoạt động end-to-end khi backend lên | `frontend/src/app/match-engine/page.tsx` | Test với backend local |
| Thêm filter UI: lọc theo genre, sort theo score | `frontend/src/components/match-engine/` | Client-side controls |
| Improve candidate card: thêm genre tags, availability badge | `frontend/src/components/match-engine/CandidateCard.tsx` | Dùng data từ `feature_breakdown` |
| Responsive check trên mobile | `frontend/src/app/` | |

**Hướng dẫn chạy frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Sơn — Researcher

**Focus:** Data & Validation

| Task | File | Ghi chú |
|------|------|---------|
| Thêm 10+ director profiles vào mockup data | `data/mockup/director_profiles.json` | Đa dạng genre, style, outcome |
| Tạo 5 brief mẫu dùng để test (text + expected genre/style) | `data/mockup/test_briefs.json` | Dùng cho unit test và demo |
| Viết notebook phân tích mockup data | `notebooks/01_data_exploration.ipynb` | Distribution của genres, styles, outcomes |
| Kiểm tra schema compliance của tất cả profiles | `data/schema/candidate_schema.json` | Dùng `jsonschema` library |

**Brief mẫu format:**
```json
[
  {
    "id": "brief_001",
    "brief_text": "Chương trình thực tế dạng gameshow hài...",
    "expected_genres": ["reality_tv", "gameshow"],
    "expected_styles": ["comedic", "fast_paced"],
    "expected_top_candidates": ["dir_001", "dir_004"]
  }
]
```

---

## Thành — Marketing Lead

**Focus:** Docs & Demo Prep

| Task | File | Ghi chú |
|------|------|---------|
| Viết user guide cho business (non-technical) | `docs/USER_GUIDE.md` | "Cách dùng dashboard để tìm đạo diễn" |
| Chuẩn bị 3 demo scenarios cho POC | `docs/DEMO_SCRIPT.md` | Brief thật, output mẫu, story để kể |
| Update README với screenshots sau khi có UI | `README.md` | Chụp màn hình dashboard chạy thật |
| Soạn feedback form gửi stakeholder sau POC | `docs/FEEDBACK_TEMPLATE.md` | 5 câu hỏi đơn giản, có rating 1–5 |

---

## Git Workflow

```bash
# Clone repo
git clone <repo-url>
cd matching-engine

# Tạo branch của mình
git checkout -b feat/manh/layer1-retrieval

# Commit và push
git add .
git commit -m "feat(layer1): implement semantic retrieval with FAISS"
git push origin feat/manh/layer1-retrieval

# Tạo Pull Request → assign Trung để review
```

**Quy tắc:**
- Không push thẳng vào `main`
- Mỗi task = 1 PR nhỏ (dễ review hơn)
- PR description: ghi rõ "đã test với case nào, kết quả ra sao"
