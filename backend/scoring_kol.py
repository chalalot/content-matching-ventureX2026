"""
Layer 2 (KOL) — Weighted Scoring
Input:  KOL candidates from retrieval_kol.py + KolBriefRequest
Output: ranked top_n list with score (0–100) and score_breakdown

7 dimensions matching KOL-specific signals.
"""

from models import KolBriefRequest, KolScoreBreakdown

WEIGHTS = {
    "niche_match":    0.25,
    "platform_match": 0.20,
    "audience_fit":   0.20,
    "engagement":     0.15,
    "reach":          0.10,
    "budget_fit":     0.05,
    "availability":   0.05,
}

MAX_POINTS = {dim: w * 100 for dim, w in WEIGHTS.items()}

FOLLOWERS_CAP = 10_000_000
ENGAGEMENT_CAP = 10.0  # 10% is exceptional

# Niches that are subsets/close neighbours of one another. A KOL whose niche is in
# the same group as the brief's target niche gets partial credit (RELATED_NICHE_SCORE)
# instead of the unrelated floor, so e.g. a "Workwear" creator isn't buried on a
# "Fashion" brief. Kept deliberately tight — only defensible overlaps — to avoid
# diluting precision. Tune against backend/eval.
_NICHE_GROUPS = [
    {"beauty", "skincare", "makeup"},
    {"fashion", "workwear"},
    {"fitness", "wellness"},
]
EXACT_NICHE_SCORE = 1.0
RELATED_NICHE_SCORE = 0.6   # tunable
UNRELATED_NICHE_SCORE = 0.2


def _niches_related(a: str, b: str) -> bool:
    return any(a in g and b in g for g in _NICHE_GROUPS)


def _niche_score(meta: dict, brief: KolBriefRequest) -> float:
    kol = meta.get("main_niche", "").lower()
    target = brief.target_niche.lower()
    if kol == target:
        return EXACT_NICHE_SCORE
    if _niches_related(kol, target):
        return RELATED_NICHE_SCORE
    return UNRELATED_NICHE_SCORE


def _platform_score(meta: dict, brief: KolBriefRequest) -> float:
    if meta.get("primary_platform", "").upper() == brief.preferred_platform.upper():
        return 1.0
    platforms = [p.upper() for p in meta.get("platforms", "").split(",") if p.strip()]
    return 0.6 if brief.preferred_platform.upper() in platforms else 0.1


def _audience_fit_score(meta: dict, brief: KolBriefRequest) -> float:
    kol_age = meta.get("target_demographic_age", "")
    brief_age = brief.target_age_group
    if not kol_age or not brief_age:
        return 0.5
    # exact match
    if kol_age == brief_age:
        return 1.0
    # partial overlap heuristic — shared boundary numbers
    def age_range(s):
        parts = s.replace("+", "-99").split("-")
        try:
            return int(parts[0]), int(parts[1])
        except Exception:
            return 0, 99
    klo, khi = age_range(kol_age)
    blo, bhi = age_range(brief_age)
    overlap = max(0, min(khi, bhi) - max(klo, blo))
    span = max(khi - klo, bhi - blo, 1)
    return min(overlap / span, 1.0) * 0.9


def _engagement_score(meta: dict, brief: KolBriefRequest) -> float:
    rate = meta.get("avg_engagement_rate", 0.0)
    return min(rate / ENGAGEMENT_CAP, 1.0)


def _reach_score(meta: dict, brief: KolBriefRequest) -> float:
    followers = meta.get("total_followers", 0)
    return min(followers / FOLLOWERS_CAP, 1.0)


def _budget_fit_score(meta: dict, brief: KolBriefRequest) -> float:
    fee = meta.get("booking_fee_estimate", 0.0)
    if fee <= 0:
        return 0.5
    # convert VND booking_fee_estimate to USD (approx 1 USD = 25,000 VND)
    fee_usd = fee / 25000
    return 1.0 if fee_usd <= brief.budget_usd else max(0.1, 1.0 - (fee_usd - brief.budget_usd) / brief.budget_usd)


def _availability_score(meta: dict, brief: KolBriefRequest) -> float:
    return 1.0  # no availability field in KOL data; assume available


_SCORERS = {
    "niche_match":    _niche_score,
    "platform_match": _platform_score,
    "audience_fit":   _audience_fit_score,
    "engagement":     _engagement_score,
    "reach":          _reach_score,
    "budget_fit":     _budget_fit_score,
    "availability":   _availability_score,
}


def score_kol_candidate(meta: dict, brief: KolBriefRequest) -> tuple[float, KolScoreBreakdown]:
    points = {
        dim: round(scorer(meta, brief) * MAX_POINTS[dim], 2)
        for dim, scorer in _SCORERS.items()
    }
    total = round(sum(points.values()), 2)
    return total, KolScoreBreakdown(**points)


def rank_kol_candidates(
    candidates: list[dict], brief: KolBriefRequest, top_n: int = 5
) -> list[dict]:
    scored = []
    for c in candidates:
        score, breakdown = score_kol_candidate(c["metadata"], brief)
        scored.append({**c, "score": score, "score_breakdown": breakdown.model_dump()})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]
