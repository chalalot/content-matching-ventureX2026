"""
Owner: Đức — Layer 2
Input:  candidates from retrieval.py + BriefRequest
Output: ranked list with score + score_breakdown, top N
"""

from models import BriefRequest, ScoreBreakdown

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
    breakdown = ScoreBreakdown(
        genre_match=20.0,
        style_match=16.0,
        specialty_match=16.0,
        performance=12.0,
        availability=8.0,
        experience=4.0,
        budget_fit=4.0,
    )
    return 80.0, breakdown


def rank_candidates(
    candidates: list[dict], brief: BriefRequest, top_n: int = 5
) -> list[dict]:
    results = []
    for c in candidates:
        score, breakdown = score_candidate(c["metadata"], brief)
        results.append({**c, "score": score, "score_breakdown": breakdown.model_dump()})
    return results[:top_n]
