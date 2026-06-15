# Plan: Show Layer 1 & Layer 2 results in the frontend (via WebSocket)

**Date:** 2026-06-14
**Goal:** When a user runs a KOL brief, let them *see what each layer did* — Layer 1 (retrieval: which creators were found + how similar) and Layer 2 (scoring: each creator's score, who was shortlisted vs dropped and why) — streamed live as the pipeline runs, then the Layer 3 explanations.

---

## Good news: most of the contract already exists

This is **not** a from-scratch build. The pieces are partly in place:

| Piece | Status |
|-------|--------|
| Backend WebSocket endpoint `/ws/match/kol` | ✅ exists (PR #11) — streams `init → candidate → complete` |
| Frontend types `PipelineStage`, `StageCandidate`, `KolExplanation` | ✅ already defined in [types.ts](../../frontend/src/lib/data/types.ts:261) |
| Design mockups for the pipeline + result card | ✅ exist: [fe_pipeline_process_mockup.html](../fe_pipeline_process_mockup.html), [fe_kol_result_mockup.html](../fe_kol_result_mockup.html), [FE_DESIGN_kol_result_and_landing.md](../FE_DESIGN_kol_result_and_landing.md) |
| Backend actually *produces* per-layer (`pipeline`) data | ❌ missing — `KolMatchResponse` has no `pipeline`; cosine similarity is discarded in retrieval |
| Backend streams per-layer `stage` events | ❌ missing — WS only streams final candidates |
| Frontend WebSocket client / hook | ❌ missing — engine page uses REST (`matchKols` → `/api/match-kol`) |
| Frontend pipeline/funnel visualization | ❌ missing — types defined, zero UI consumes them |

So the work is: **(1) make the backend emit per-layer data over the WebSocket, and (2) build the frontend WebSocket client + the per-layer visualization.** The data contract is already designed.

---

## The streaming contract (WebSocket message protocol)

The endpoint already sends `init`, `candidate`, `complete`, `error`. We add **`stage`** events so the user sees each layer the moment it finishes:

```
client → server:  { ...KolBriefRequest }           (brief)
server → client:  { type: "stage",     data: PipelineStage }   ← NEW: Layer 1 (retrieval)
server → client:  { type: "stage",     data: PipelineStage }   ← NEW: Layer 2 (scoring)
server → client:  { type: "init",      total_candidates_considered, top_n }
server → client:  { type: "candidate", data: KolCandidateResult }   (Layer 3, one per shortlisted KOL)
server → client:  { type: "complete",  data: KolMatchResponse }      (now includes pipeline[])
server → client:  { type: "error",     message }
```

`PipelineStage` / `StageCandidate` shapes are already in [types.ts](../../frontend/src/lib/data/types.ts:273) — the backend just needs Pydantic models that mirror them.

---

## ⚠️ Honest note: with the over-fetch fix, Layer 1 no longer "filters"

Our recent Fix #1 makes Layer 1 retrieve the **whole pool** (`top_k=60` ≥ 53 KOLs) and hand it all to Layer 2. So the funnel is really:

```
Corpus (53) → L1 retrieve: ranks all 53 by similarity (none dropped)
            → L2 score:    53 scored → top 5 shortlisted (this is where narrowing happens)
            → L3 explain:  5 explained
```

The design mockup shows Layer 1 as "passed vs filtered" — but today **nothing is filtered at Layer 1.** So for an honest display:
- **Layer 1 stage** = the *similarity ranking* (all creators, sorted by how well they matched the search), not a pass/fail gate.
- **Layer 2 stage** = the real narrowing: scores + shortlisted (top 5) vs the rest, with reasons.

We should present L1 as "ranked by relevance" and let L2 carry the pass/drop story. (Decision below.)

---

## Backend changes

### B1 — Add pipeline models ([backend/models.py](../../backend/models.py))
Add `StageCandidate` and `PipelineStage` (mirroring the FE types), and add `pipeline: list[PipelineStage] = []` to `KolMatchResponse` (keep optional/defaulted for back-compat; mirror later for directors).

### B2 — Surface the Layer 1 similarity ([backend/retrieval_kol.py](../../backend/retrieval_kol.py))
Today `collection.query(...)` returns distances but the code drops them. Unpack `distances` and attach a `similarity` per candidate (e.g. `1/(1+distance)`, or configure the collection's space to cosine at ingest for a true 0–1 score — **requires re-ingest**, note it). This is the L1-1 item from the main plan; it's a prerequisite for showing L1 results.

### B3 — Expose the full scored list + drop reasons ([backend/scoring_kol.py](../../backend/scoring_kol.py))
`rank_kol_candidates` currently returns only `top_n`. Add a variant (or return all scored) so the L2 stage can show **every** candidate's score, mark the top-N as `shortlisted` and the rest as `dropped`, and derive a `reason` for the StageReason enum (`wrong_platform`, `over_budget`, `audience_mismatch`, `empty_record`, `low_score`) from the score breakdown / metadata.

### B4 — Build + stream the stages ([backend/main.py](../../backend/main.py) `/ws/match/kol`)
Between retrieval and the explanation loop:
1. Build the **Layer 1** `PipelineStage` (in=corpus size, out=retrieved, candidates with `metric`=similarity) and `send_json({type:"stage", ...})`.
2. Build the **Layer 2** `PipelineStage` (in=retrieved, out=top_n, candidates with `metric`=score, `rank`, `status`, `reason`) and send it.
3. Keep the existing per-candidate `candidate` events (Layer 3).
4. Include `pipeline=[L1, L2, L3]` in the final `complete` payload.
Mirror the same `pipeline` into the REST `/match/kol` response too, so non-streaming clients still get it.

---

## Frontend changes

### F1 — WebSocket hook ([frontend/src/hooks/useKolMatchStream.ts](../../frontend/src/hooks) — new)
A React hook that opens the WS, sends the brief, and accumulates `{ stages: PipelineStage[], candidates: KolCandidateResult[], status, error }`, with cleanup on unmount.

> **Important:** WebSockets can't be proxied through the Next.js `/api/...` route handlers the REST calls use. The browser must connect **directly** to the backend, so we need a client-exposed URL: `NEXT_PUBLIC_BACKEND_WS_URL` (e.g. `ws://localhost:8000` in dev). FastAPI WebSockets aren't gated by the CORS middleware, so cross-origin works, but we should validate the `Origin` server-side.

### F2 — Pipeline visualization (new components, per the mockups)
- `PipelineFunnelBand.tsx` — three cards (L1/L2/L3) showing `in_count → out_count`, layer-colored.
- `PipelineLayerColumn.tsx` — a stage column rendering `StageCandidate[]`: L1 = ranked by similarity; L2 = shortlisted (rank badge) vs dropped (reason badge). Drives off `status`/`metric`/`reason`.
- These already have a pixel mockup in [fe_pipeline_process_mockup.html](../fe_pipeline_process_mockup.html).

### F3 — Wire into the engine page ([frontend/src/app/(dashboard)/kols/engine/page.tsx](../../frontend/src/app/(dashboard)/kols/engine/page.tsx))
Switch the submit path from REST `matchKols` to the streaming hook. Add a "Process / Pipeline" tab (or a section above the shortlist) that fills in as `stage` events arrive (L1 first, then L2, then L3 cards stream in). Keep the existing shortlist carousel for the final picks.

### F4 — Color tokens ([frontend/src/app/globals.css](../../frontend/src/app/globals.css))
Add the layer + semantic tokens the design uses: `--l1/--l2/--l3`, `--good/--warn/--risk/--info` (+ bg/border variants).

---

## Related gap (flag, separate from this task)

The frontend `KolCandidateCard` expects `explanation` to be a **structured `KolExplanation`** object (`why_good[]`, `sources[]`, `fit_score`, …), but the backend currently returns explanation as a **markdown string** ([explanation_kol.py:146](../../backend/explanation_kol.py:146)). The card only reads `explanation.full_report_md`, which is `undefined` for a string → the explanation shows blank. This is a **Layer 3** issue, not L1/L2, but it means the result card is already partly broken. Recommend handling it as a follow-up phase (make the backend return the structured `KolExplanation`; the agent already builds a structured `CastingReport` internally, so it's a mapping job).

---

## Suggested phasing

| Phase | Scope | Outcome |
|-------|-------|---------|
| **1 (this task)** | B1–B4 + F1–F4 | User watches Layer 1 (similarity ranking) and Layer 2 (scores + shortlist/drop) stream in live, then Layer 3 cards. |
| **2 (follow-up)** | Structured `KolExplanation` end-to-end + 5-section result card per mockup | Rich, readable explanations (fit ring, why-good/why-not, sources). |
| **3 (optional)** | Mirror pipeline for the **directors** engine | Same per-layer view for directors. |

---

## Decisions (locked 2026-06-14)

1. **Transport → WebSocket streaming.** Use `/ws/match/kol`; user watches L1, then L2, then L3 cards stream in. Frontend connects directly via `NEXT_PUBLIC_BACKEND_WS_URL` (WS can't go through the Next `/api` proxy).
2. **Scope → Phase 1 only** (L1 + L2 live view). Layer 3 explanation stays as the current markdown string for now; the structured `KolExplanation` + 5-section result card is deferred to Phase 2.
3. **Layer 1 presentation → relevance ranking.** Show all creators ordered by retrieval similarity (honest to the over-fetch behaviour); the visible narrowing happens at Layer 2. No display-only filter at L1.
