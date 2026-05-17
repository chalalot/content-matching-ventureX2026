# AI Matching Engine — POC 2026

> Nhập brief → engine trả shortlist ứng viên phù hợp nhất (Director hoặc KOL) kèm điểm số và lý do.

## Kiến trúc

```
Brief (text)
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 1 — Semantic Retrieval       │  brief → top-20 candidates (FAISS)
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 2 — Multi-Signal Scoring     │  top-20 → ranked shortlist top-N
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Layer 3 — Explanation              │  shortlist + "why" text per candidate
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  Dashboard (frontend)               │  interactive UI for business users
└─────────────────────────────────────┘
```

## Cấu trúc thư mục

```
matching-engine/
├── data/
│   ├── mockup/          # Mockup profiles + test briefs (Sơn)
│   └── schema/          # Data schema definition
├── backend/
│   ├── layer1_retrieval/   # Semantic search — Mạnh
│   ├── layer2_scoring/     # Scoring model — Đồng Đức
│   ├── layer3_explanation/ # Explanation generator — Trung
│   ├── api/                # FastAPI routes — Đồng Đức
│   └── main.py             # App entry point
├── frontend/               # Dashboard UI — Duy
├── notebooks/              # Data exploration — Sơn
└── docs/                   # TASKS, USER_GUIDE, DEMO_SCRIPT — Thành
```

## Setup & Chạy

```bash
# 1. Clone repo
git clone <repo-url> && cd matching-engine

# 2. Tạo virtualenv
python -m venv venv && source venv/bin/activate   # Mac/Linux
# hoặc: venv\Scripts\activate  (Windows)

# 3. Cài dependencies
pip install -r backend/requirements.txt

# 4. Chạy backend
uvicorn backend.main:app --reload
# → API available at http://localhost:8000
# → Docs at http://localhost:8000/docs

# 5. Mở frontend
open frontend/index.html
```

## Task Assignments

Xem chi tiết tại [`docs/TASKS.md`](docs/TASKS.md)

| Người | Role | Phần việc |
|-------|------|-----------|
| Trung | Founder | Layer 3 · Architecture · Review |
| Mạnh | Backend Dev | Layer 1 — Semantic Retrieval |
| Đồng Đức | Backend Dev | Layer 2 — Scoring + API Routes |
| Duy | Frontend Dev | Dashboard UI |
| Sơn Lê | Researcher | Mockup data + Test briefs |
| Thành | Marketing | Docs + Demo script |

## Team

Pennyworth — VentureX 2026
