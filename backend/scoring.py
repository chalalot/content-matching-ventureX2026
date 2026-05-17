"""
Owner: Đức — Layer 2
Input:  candidates from retrieval.py + BriefRequest
Output: ranked list with score + score_breakdown, top N
"""

from .models import BriefRequest, ScoreBreakdown

WEIGHTS = {
    "genre_match": 0.25,
    "style_match": 0.20,
    "specialty_match": 0.20,
    "performance": 0.15,
    "availability": 0.10,
    "experience": 0.05,
    "budget_fit": 0.05,
}


def score_candidate(meta: dict, brief: BriefRequest) -> tuple[float, ScoreBreakdown]:
    # TODO (Đức): implement each signal, return (total_score_0_to_100, ScoreBreakdown)
    # See IMPLEMENTATION_PLAN.md Step 4 for formula details
    raise NotImplementedError


def rank_candidates(
    candidates: list[dict], brief: BriefRequest, top_n: int = 5
) -> list[dict]:
    # TODO (Đức): score each candidate, sort desc, return top_n
    # Each item in returned list should include all original candidate fields + "score" + "score_breakdown"
    raise NotImplementedError
