# Eval harness (Phase 0)

Measures **Layer 1 (retrieval)** and **Layer 2 (scoring)** quality against a small set of
hand-labeled briefs, so improvements can be proven instead of guessed. It does **not** call
Layer 3 (the LLM explanations) — it imports the retrieval + scoring functions directly, needs
no API key, and makes no network calls.

## Files
- `briefs_directors.json` / `briefs_kols.json` — labeled briefs. Each entry: a `brief`
  (the request fields), `expected_ids` (candidates that should rank near the top), and `notes`
  explaining the label. **These are seed labels — review and adjust to match real judgment.**
- `run_eval.py` — the runner.
- `baseline_results.md` — latest captured results (regenerated on each run).

## Prerequisites
The ChromaDB collections must be populated first (run from `backend/`):
```
python ingest.py        # directors
python ingest_kols.py   # kols
```

## Run
From `backend/`:
```
python eval/run_eval.py            # both sets
python eval/run_eval.py directors  # one set
python eval/run_eval.py kols
```
(The script self-locates the backend dir, so it also works from the repo root. If
`GOOGLE_API_KEY` isn't set it injects a harmless dummy, since config requires it at import
but the eval never uses it.)

## Metrics
- **L1 recall@20** — did each expected candidate reach the shortlist of 20? (Layer 1)
- **L2 precision@k** — of the final top-k (k = #expected), how many are correct?
- **L2 recall@5** — how many expected candidates land in the final top-5?
- **MRR** — 1 / rank of the first expected candidate.

`recall@5` and `MRR` are the most meaningful single numbers; `precision@k` uses k = #expected
so a perfect ranking scores 1.00.

## Workflow for measuring a change
1. Run the harness, note the baseline.
2. Make the change (e.g. a Layer 2 fix).
3. Re-run; compare. Keep changes that move the numbers up, drop the ones that don't.

## Note on the current label set
The seed briefs are deliberately clear-cut, and the current engine already scores near-perfect
on them (see `baseline_results.md`) — so they confirm correctness but leave little headroom to
demonstrate improvement. To measure the planned fixes, add **harder / discriminating briefs**
that target known weak spots (off-vocabulary campaign types, slightly-over-budget best fits,
tie-breaks that should be settled by re-hire rate, KOL retrieval misses, etc.).
