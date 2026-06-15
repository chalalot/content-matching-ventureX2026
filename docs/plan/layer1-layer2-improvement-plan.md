# Layer 1 & Layer 2 Improvement Plan

**Date:** 2026-06-13
**Scope:** Matching engine — Layer 1 (semantic retrieval) and Layer 2 (weighted scoring)
**Status:** Proposed — not yet started

---

## TL;DR

The way to improve Layer 1 and Layer 2 right now is **free, deterministic code fixes**, not a paid/LLM model. The biggest single win is to **stop throwing away signals the system already computes or already stores**, and to **measure results** so every change is proven instead of guessed.

Recommended first slice:
1. Build a small eval harness (Phase 0) — *do this first*.
2. Keep the Layer 1 match score and consume it in Layer 2 (L1-1 + L2-1).
3. Use the ranking signals already stored but ignored (L2-2).
4. Replace all-or-nothing scoring with graded scoring (L2-3).

Estimated impact: **~10–25% relative improvement in top-5 match quality**, concentrated in Layer 2 and the KOL pipeline. This is an *estimate* until Phase 0 makes it measurable.

---

## Why not a paid model (DeepSeek / GPT / etc.) for L1 & L2?

Not because it's impossible — because it's **not the bottleneck on this dataset**:

1. **The dataset is tiny.** 25 directors, `top_k=20` → Layer 1 already retrieves ~80% of all directors. There is almost no recall to "recover," so no model can help much there.
2. **Layer 2 ignores signals it already has for free.** A paid model would add *new* signal on top of signal we are not even using yet.
3. **No eval exists**, so a paid model's benefit couldn't be proven anyway.
4. **DeepSeek specifically has no embeddings API**, so it cannot touch Layer 1 at all (Layer 1 *is* an embedding step).

Conclusion: spend model budget on **Layer 3 (AI explanations)**, where it adds clear value. For L1/L2, the levers below are free and deterministic.

> A paid embedding model or reranker (OpenAI / Voyage / Cohere) only becomes worthwhile for Layer 1 **if the candidate catalog grows to hundreds/thousands**, where `top_k=20` starts dropping genuinely good candidates.

---

## Phase 0 — Eval harness (foundational, do first)

**Problem:** There is no labeled ground truth and no baseline. Today's "accuracy" is unknown, so every improvement is currently a guess.

**Plan:**
- Create ~10 representative briefs (directors + KOLs) with hand-marked "should rank high" candidates.
- Add a small script computing:
  - **recall@20** (Layer 1) — did the expected candidate make the shortlist?
  - **top-5 precision / rank agreement** (Layer 2) — are the best candidates ranked at the top?
- Run it against the current code to capture a **baseline**.

**Why:** Converts every later change from *"I estimate ~8%"* into *"this added 8.3%"* — and lets us drop changes that don't actually help.

**Effort:** ~half a day. **Files:** new `backend/eval/` (briefs JSON + runner script).

---

## Phase 1 — Layer 1 (Retrieval)

Plain terms: Layer 1 is the *recruiter* that skims everyone and pulls ~20 candidates that look relevant.

### L1-1 — Keep the match score (currently discarded)
- **What:** `collection.query()` already returns cosine `distances`, but only `ids` + `metadatas` are unpacked. Surface `distance` / `cosine_rank` on each candidate.
- **Where:** `backend/retrieval.py:68-75`, `backend/retrieval_kol.py:55-62`.
- **Why:** Free signal, zero cost. Prerequisite for the biggest Layer 2 win (L2-1).
- **Effort:** low.

### L1-2 — Word the search like the candidate profiles
- **What:** Embedded profiles are bio-style prose; the query is a `"Brand:… Industry:… Tone:…"` template — different text shapes weaken cosine match. Reshape the query to mirror the corpus phrasing.
- **Where:** `backend/retrieval.py:45-50` (`_build_query_text`), `backend/retrieval_kol.py:40-45` (`_build_kol_query`).
- **Why:** Deterministic version of the "HyDE" idea — better matches, no LLM, no cost.
- **Effort:** low.

### L1-3 — Add the dropped audience-age field (KOLs)
- **What:** `target_age_group` is in the embedded KOL document but missing from the query.
- **Where:** `backend/retrieval_kol.py:40-45`.
- **Why:** Recovers an audience-fit signal already present in the corpus.
- **Effort:** low.

> Note: `budget_usd` / `timeline_weeks` are intentionally **not** added to the query — they are non-semantic and belong in Layer 2.

---

## Phase 2 — Layer 2 (Scoring)

Plain terms: Layer 2 is the *hiring manager* that scores the 20 candidates and picks the top 5. **This is where most real quality lives.**

### L2-1 — Use the Layer 1 match score *(biggest single win)*
- **What:** Today Layer 2 ignores L1's similarity entirely and re-judges from scratch. Add the cosine similarity as a `semantic_fit` scoring dimension.
- **Where:** `backend/scoring.py`, `backend/scoring_kol.py` (+ depends on L1-1).
- **Why:** The embedding score captures bio/specialty/brand semantics the exact-match rules can't.
- **Effort:** medium. **Note:** adds a dimension → update `ScoreBreakdown` / `KolScoreBreakdown` in `backend/models.py` and re-balance weights.

### L2-2 — Score the data that's stored but ignored
- **What:** Ingest stores `repeat_hire_rate`, `on_time_rate`, `award_count`, `lead_time_days`, `base_day_rate` — none are read by any scorer. `performance` only uses satisfaction + views.
- **Where:** scorers in `backend/scoring.py:42-60`; fields ingested at `backend/ingest.py:43-47`.
- **Why:** `repeat_hire_rate` / `on_time_rate` are strong quality signals sitting idle.
- **Effort:** medium.

### L2-3 — Replace all-or-nothing scoring with graded scoring
- **What:**
  - Director `budget_fit` is a hard `1.0`-vs-`0.1` cliff (`$1 over` == `10× over`). The KOL side already tapers — make directors match.
  - Add a small deterministic **synonym/alias map** for enum gaps: `social_media_content` matches 0 directors today; `documentary` / `reality_tv` are unreachable from the brief enum → always hit the floor.
- **Where:** `backend/scoring.py:57-60` (budget), `backend/scoring.py:28-39` (genre/style/specialty), `backend/scoring_kol.py:70-76`.
- **Why:** Removes harsh penalties that bury good candidates; deterministic and cheap.
- **Effort:** low–medium.

### L2-4 — Use the campaign deadline
- **What:** `timeline_weeks` is sent but no scorer reads it. Availability is a binary `available`/`else 0.2` flag that ignores `available_from` + `lead_time_days`. Score "free in time for the campaign" instead of binary.
- **Where:** `backend/scoring.py:48-49`; uses `available_from` / `lead_time_days` from metadata.
- **Why:** A director free in week 2 of a 10-week campaign is effectively available today scored as unavailable.
- **Effort:** medium.

### L2-5 — Treat missing data as neutral, not zero
- **What:** `meta.get("avg_views", 0)` scores absent data as genuinely-bad. KOL `audience_fit` already returns neutral `0.5` for missing — apply the same pattern to directors.
- **Where:** `backend/scoring.py:42-45` (and similar `.get(..., 0)` sites).
- **Why:** Incomplete profiles shouldn't rank like bad ones.
- **Effort:** low.

### L2-6 — Make weights tunable from the request *(optional)*
- **What:** Weights are static; let the brief carry optional per-dimension weight overrides. Frontend already has slider UI.
- **Where:** `WEIGHTS` in `backend/scoring.py:11-19` / `backend/scoring_kol.py:11-19`; `BriefRequest` in `backend/models.py`.
- **Why:** Deterministic, reproducible version of "dynamic weights" — different campaigns weight differently.
- **Effort:** low–medium.

### L2-7 — Lower priority / hygiene
- Relative (percentile) normalization instead of fixed caps (`VIEWS_CAP=5M`, etc.).
- Hard filters for true must-haves (platform absent for KOL, budget wildly off) instead of soft floors.
- Per-dimension reason strings (also feeds Layer 3 grounded facts).
- Unit tests for the scorers (pure functions — easy to test).

---

## Recommended sequencing

| Order | Item | Why first |
|-------|------|-----------|
| 1 | Phase 0 eval harness | Makes everything else measurable |
| 2 | L1-1 + L2-1 (keep + use match score) | One connected change, biggest quality lift |
| 3 | L2-2 (use ignored quality data) | High-value, isolated |
| 4 | L2-3 (graded scoring + alias map) | Fixes harsh penalties |
| 5 | L1-2, L1-3, L2-4, L2-5 | Solid incremental gains |
| 6 | L2-6, L2-7 | Polish / optional |

---

## Estimated impact (estimate, not measurement)

> No baseline exists yet, so these are clearly-labeled estimates. Phase 0 replaces them with real numbers.

| Fix | Moves | Est. lift | Confidence |
|-----|-------|-----------|------------|
| L1 query reshape + keep score (directors) | recall@20 | ~0–5% | high it's small |
| L1 same (KOLs) | recall@20 | ~5–15% | medium |
| L2-1 reuse L1 score | top-5 ranking | ~5–12% | medium |
| L2-2 use ignored data | top-5 ranking | ~5–10% | medium |
| L2-3/4 cliffs + deadline | top-5 ranking | ~3–8% | medium-low |

**Headline:** ~**10–25% relative improvement** in top-5 match quality, mostly in Layer 2 and the KOL pipeline.

**Ceiling caveats:**
- Directors barely move on Layer 1 (already retrieve ~80% of the pool).
- Exact-match already works on the controlled vocabulary — gains are mostly better *tie-breaking*, not fixing broken matches.
- Low end (~5–10%) if rankings are already good; high end (~20–25%) if current rankings are visibly off. Unknown until measured.

---

## Out of scope / rejected

- **LLM listwise re-rank, LLM-as-judge, HyDE (live), dynamic LLM weights** — analyzed and rejected for this dataset: tiny corpus, L2 ignores L1 order, controlled vocabulary makes exact-match correct, and they break the deterministic contract with no eval to justify them.
- **Paid embedding model / reranker for L1** — deferred until the catalog grows to hundreds+ of candidates.
- **DeepSeek for L1/L2** — DeepSeek has no embeddings API; its value is in **Layer 3 explanations**, tracked separately.

---

## Open decisions

1. Eval metric definition — confirm recall@20 + top-5 precision are the right targets.
2. L2-1 changes the response schema (`ScoreBreakdown` gains `semantic_fit`) — confirm frontend can absorb the new dimension.
3. Whether to re-balance existing weights when adding `semantic_fit`, or add it as bonus points on top.
