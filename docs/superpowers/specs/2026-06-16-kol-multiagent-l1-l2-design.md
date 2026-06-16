# KOL Matching → Multi-Agent (Layer 1 + Layer 2)

**Date:** 2026-06-16
**Goal:** Turn the KOL pipeline into a genuine 3-agent system by wrapping the
existing Layer 1 (embedding retrieval) and Layer 2 (rule scoring) logic in thin
LLM agents. The architecture must leave clean seams so each agent can be
customized per client once real data + workflows arrive. Pitch is in 1 day, so
every agent must degrade gracefully to today's deterministic behavior.

## Approach (chosen: "rules become tools, thin agent per layer")

- **Layer 1 — Brief Interpreter Agent** (`agent_l1_kol.py`): one structured LLM
  call reads the brief and produces a `BriefIntent`:
  - `enriched_query`: a richer semantic query string (replaces the static
    string-concat query).
  - `related_niches`: niches that should count as related to the target niche
    for this brief (replaces the hardcoded `_NICHE_GROUPS`).
  - `emphasis`: which scoring dimensions the brief stresses (hint for Layer 2).
  Then it calls the existing `retrieve_kol_candidates` tool with the enriched
  query. Output shape is identical to today's retrieval.

- **Layer 2 — Scoring Agent** (`agent_l2_kol.py`): one structured LLM call (NOT
  per-candidate — kept cheap/fast) produces a `ScoringPolicy`:
  - `weights`: adjusted dimension weights (validated to known dims, normalized).
  - `related_niches`: passed through / merged from Layer 1.
  It then calls the existing rule scorer with those overrides. Output shape is
  identical to today's `rank_kol_candidates_full`.

- **Layer 3** — unchanged (already a deep agent with web search).

## Safety / fallback (critical for pitch)

- Every agent has a timeout (reuse `settings.explanation_timeout` or a short
  dedicated one) and wraps the LLM call in try/except.
- On ANY failure (error, timeout, quota, malformed output) the layer falls back
  to the exact deterministic function used today:
  - L1 → `retrieve_kol_candidates(brief, top_k)` with the plain query.
  - L2 → `rank_kol_candidates_full(candidates, brief, top_n)` with default
    weights and `_NICHE_GROUPS`.
- Net effect: worst case, the system behaves exactly like today. Demo cannot
  break because of the new agents.

## Interfaces unchanged

- `main.py` REST `/match/kol` and WS `/ws/match/kol` keep the same 3-step flow;
  they call the new `run_layer1` / `run_layer2` wrappers instead of the raw
  functions, and thread the `BriefIntent` from L1 into L2.
- `pipeline_kol.py` gets an optional `method` override so the funnel band can
  show what the agent actually did (e.g. the enriched query / weight tweaks)
  without any frontend change. Pydantic shapes are untouched.
- No new required fields on any response model → frontend keeps working.

## Files

| File | Change |
|------|--------|
| `scoring_kol.py` | Parametrize `score_kol_candidate` / `rank_kol_candidates_full` with optional `weights` + `related_niches`; default = today's behavior. |
| `agent_l1_kol.py` | NEW — `interpret_brief` + `run_layer1` (intent + candidates, with fallback). |
| `agent_l2_kol.py` | NEW — `build_scoring_policy` + `run_layer2` (ranked_full, with fallback). |
| `main.py` | Wire both endpoints to `run_layer1` / `run_layer2`; pass intent through; method override. |
| `pipeline_kol.py` | Optional `method` arg on `build_l1_stage` / `build_l2_stage`. |

## Pitch story

"Three cooperating agents: an **Interpreter** that understands the brief, a
**Scorer** that ranks creators by campaign priorities, and a **Researcher** that
investigates each finalist on the web. Each agent is an isolated unit we can
retune per client." — genuine multi-agent, defensible under scrutiny.

## Out of scope (YAGNI for now)

- No generic config-driven agent framework.
- No per-candidate L2 agent calls (too slow/expensive; one policy call covers all).
- No new frontend components.
