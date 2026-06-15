"""
Builds the per-layer pipeline view (PipelineStage[]) for the KOL engine so the
frontend can show what each layer did:
  - Layer 1 (retrieval): all candidates ranked by relevance (over-fetch => nothing
    is filtered here; the narrowing happens at Layer 2).
  - Layer 2 (scoring):    every candidate's score, top-N shortlisted vs dropped + reason.
  - Layer 3 (explanation): the shortlisted candidates the agent explains.

Shapes mirror frontend lib/data/types.ts (StageCandidate / PipelineStage).
"""

from models import PipelineStage, StageCandidate

# User-facing descriptions (kept jargon-free — shown in the funnel band).
L1_METHOD = "Finds the most relevant creators"
L2_METHOD = "Scored & ranked by fit"
L3_METHOD = "AI reviews each finalist"


def _name(c: dict) -> str:
    return c.get("metadata", {}).get("stage_name", "") or ""


def build_l1_stage(candidates: list[dict], corpus_size: int) -> PipelineStage:
    """Layer 1 — relevance ranking. Every retrieved candidate is 'passed'
    (over-fetch keeps the whole pool); metric is the similarity score."""
    cands = [
        StageCandidate(
            kol_id=c["id"],
            name=_name(c),
            status="passed",
            metric=c.get("similarity"),
            rank=i + 1,
        )
        for i, c in enumerate(candidates)
    ]
    return PipelineStage(
        id="retrieval",
        layer=1,
        name="Semantic Retrieval",
        method=L1_METHOD,
        in_count=corpus_size,
        out_count=len(candidates),
        candidates=cands,
    )


def build_l2_stage(ranked_full: list[dict], top_n: int) -> PipelineStage:
    """Layer 2 — scoring. Shortlisted (top-N) vs dropped, with score + reason."""
    cands = []
    for c in ranked_full:
        shortlisted = c.get("shortlisted", False)
        cands.append(StageCandidate(
            kol_id=c["id"],
            name=_name(c),
            status="shortlisted" if shortlisted else "dropped",
            metric=c.get("score"),
            rank=c.get("rank") if shortlisted else None,
            reason=None if shortlisted else c.get("drop_reason"),
            breakdown=c.get("score_breakdown"),  # per-dimension points, for the "how scored" view
        ))
    return PipelineStage(
        id="scoring",
        layer=2,
        name="Weighted Scoring",
        method=L2_METHOD,
        in_count=len(ranked_full),
        out_count=min(top_n, len(ranked_full)),
        candidates=cands,
    )


def build_l3_stage(shortlisted: list[dict]) -> PipelineStage:
    """Layer 3 — AI explanation over the shortlisted candidates."""
    cands = [
        StageCandidate(
            kol_id=c["id"],
            name=_name(c),
            status="shortlisted",
            metric=c.get("score"),
            rank=c.get("rank"),
        )
        for c in shortlisted
    ]
    return PipelineStage(
        id="explanation",
        layer=3,
        name="AI Explanation",
        method=L3_METHOD,
        in_count=len(shortlisted),
        out_count=len(shortlisted),
        agentic=True,
        candidates=cands,
    )
