# Team Outputs — Tracker & Dependency Map

**Cập nhật khi có output mới. Owner tự update status của mình.**

---

## Dependency flow

```
Thành (kể case thật)
    │
    ▼
[domain_research.md] ──────────────────────────────────────┐
    │                                                       │
    ▼                                                       ▼
Sơn (phân tích + format)                             Duy (hiểu domain
    │                                                để build UI đúng)
    ├──► [scoring_design.md] ──► Đức: scoring.py
    │
    └──► [test_briefs.json] ──────────────────────────────────────┐
                                                                   │
Mạnh (gen data)                                                    │
    │                                                              │
    ├──► [directors_mockup.json x50] ──► Đức: ingest.py           │
    │                                                              │
    └──► [test_ui.py / Streamlit] ◄──── Đức: /match endpoint      │
              │                              │                     │
              │ tune weights                 │                     │
              ▼                              ▼                     ▼
         [weights v2] ──► scoring.py    [/match live] ──► Duy: swap mock→real
                                             │
                                             └──► Sơn: validate.py ──► accuracy report
                                                                            │
                                                                            ▼
                                                                    Trung: go/no-go deploy
```

---

## Output registry

### Data & Research

| Output | Owner | Feed vào | Done khi | Status |
|---|---|---|---|---|
| `data/domain_research.md` | Trung + Thành | Tất cả | Thành xác nhận: "đây là brief thật của mình" | ⬜ |
| `data/directors_mockup.json` (50 profiles) | Mạnh | `ingest.py`, test UI | `collection.count()` = 50, distribution đủ đa dạng | ⬜ |
| `data/scoring_design.md` | Sơn + Thành | `scoring.py` (Đức) | Trung approve weights, có lý do cho từng dimension | ⬜ |
| `data/test_briefs.json` | Sơn + Thành | `validate.py`, test UI tab 4 | 8–10 briefs, mỗi cái có `expected_top3` + `thanh_reasoning` | ⬜ |
| `data/validate.py` | Sơn | Accuracy report cho Trung | Script chạy được, in pass/fail per brief | ⬜ |

---

### Backend

| Output | Owner | Feed vào | Done khi | Status |
|---|---|---|---|---|
| `backend/ingest.py` | Đức | ChromaDB collection | `python ingest.py` → "Ingested 50 profiles. Count: 50" | ⬜ |
| `backend/retrieval.py` | Đức | `scoring.py`, test UI Layer Inspector | Trả top 20 candidates đúng, model cached | ⬜ |
| `backend/scoring.py` | Đức | `/match`, test UI Weight Playground | Score breakdown 7 dimensions, dùng weights từ `scoring_design.md` | ⬜ |
| `backend/explanation.py` | Đức | `/match` response | OpenAI trả text có nhắc tên brand + kinh nghiệm cụ thể | ⬜ |
| `POST /match` endpoint | Đức | Test UI, frontend Duy, validate.py | curl trả JSON đúng schema, không crash 5 briefs liên tiếp | ⬜ |

---

### Tools (Internal)

| Output | Owner | Feed vào | Done khi | Status |
|---|---|---|---|---|
| `tools/test_ui.py` (Streamlit) | Mạnh | Sơn tune weights, Thành review kết quả, Đức debug | 4 tabs chạy: Result / Layer Inspector / Weight Playground / Batch Test | ⬜ |

---

### Frontend (Dashboard)

| Output | Owner | Feed vào | Done khi | Status |
|---|---|---|---|---|
| `frontend/lib/types.ts` | Duy | Tất cả components | Types khớp 100% API contract, không lỗi TypeScript | ⬜ |
| `frontend/lib/mock.ts` | Duy | Components trước khi backend xong | 5 candidates đầy đủ, data realistic | ⬜ |
| `frontend/lib/api.ts` | Duy | Pages | `matchDirectors()` chạy với cả mock lẫn real | ⬜ |
| `frontend/components/BriefForm.tsx` | Duy | `app/page.tsx` | Submit được, validate required fields, spinner khi loading | ⬜ |
| `frontend/components/CandidateCard.tsx` | Duy | `app/results/page.tsx` | Score badge màu đúng, 7 bars hiển thị đúng proportion | ⬜ |
| Dashboard live (mock mode) | Duy | Thành UAT | `NEXT_PUBLIC_USE_MOCK=true` chạy đẹp | ⬜ |
| Dashboard live (real API) | Duy | Demo VentureX | `NEXT_PUBLIC_USE_MOCK=false` kết quả từ backend Đức | ⬜ |

---

## Vòng lặp optimize weights

Đây là vòng lặp quan trọng nhất — chạy nhiều lần cho đến khi kết quả "nghe đúng":

```
1. Sơn + Thành đề xuất weights → scoring_design.md
2. Đức implement vào scoring.py
3. Mạnh mở Weight Playground (test UI tab 3) → kéo slider, thấy ranking đổi
4. Thành nhìn kết quả → "người này sai rồi / người kia thiếu"
5. Sơn ghi lại → đề xuất weights v2
6. Lặp lại từ bước 2
```

Mục tiêu: sau 2–3 vòng, Thành nói "top-3 này mình cũng sẽ xem xét."

---

## Integration checklist — trước khi demo

```
[ ] /match endpoint live local (Đức)
[ ] 50 profiles ingested (Mạnh)
[ ] Weights đã qua ít nhất 2 vòng tune (Sơn + Thành + test UI)
[ ] validate.py chạy xong, Trung đọc accuracy report (Sơn)
[ ] Dashboard mock mode đẹp (Duy)
[ ] Dashboard real mode kết nối được /match (Duy swap mock→real)
[ ] Thành chạy 5 demo briefs thật, approve kết quả
[ ] Deploy Railway + Vercel (Trung)
[ ] Chạy 3 lần liên tiếp không lỗi trên production (Trung)
```

---

## Status legend

| Icon | Nghĩa |
|---|---|
| ⬜ | Chưa bắt đầu |
| 🔨 | Đang làm |
| ✅ | Done — điều kiện "done khi" đã đạt |
| ❌ | Blocked — ghi lý do vào dòng đó |
