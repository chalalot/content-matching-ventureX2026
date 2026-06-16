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


def _niches_related(a: str, b: str, related_niches: set[str] | None = None) -> bool:
    # Agent override (Layer 1/2): a flat set of niches the agent judged related to
    # the brief's target niche. If the KOL niche is in that set, treat as related.
    if related_niches is not None:
        return a in related_niches
    return any(a in g and b in g for g in _NICHE_GROUPS)


def _niche_score(meta: dict, brief: KolBriefRequest, related_niches: set[str] | None = None) -> float:
    kol = meta.get("main_niche", "").lower()
    target = brief.target_niche.lower()
    if kol == target:
        return EXACT_NICHE_SCORE
    if _niches_related(kol, target, related_niches):
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


def _max_points(weights: dict | None) -> dict:
    """Per-dimension max points. With agent-supplied weights, normalize so the
    total still sums to 100 — keeps scores comparable to the default model."""
    if not weights:
        return MAX_POINTS
    total = sum(weights.get(dim, 0) for dim in WEIGHTS) or 1.0
    return {dim: (weights.get(dim, WEIGHTS[dim]) / total) * 100 for dim in WEIGHTS}


def score_kol_candidate(
    meta: dict,
    brief: KolBriefRequest,
    weights: dict | None = None,
    related_niches: set[str] | None = None,
) -> tuple[float, KolScoreBreakdown]:
    max_points = _max_points(weights)
    points = {}
    for dim, scorer in _SCORERS.items():
        raw = _niche_score(meta, brief, related_niches) if dim == "niche_match" else scorer(meta, brief)
        points[dim] = round(raw * max_points[dim], 2)
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


def _drop_reason(meta: dict, points: dict) -> str:
    """Best-effort primary reason a candidate missed the shortlist.
    Maps to the frontend StageReason enum (wrong_platform | empty_record |
    over_budget | audience_mismatch | low_score)."""
    if int(meta.get("total_followers", 0) or 0) == 0:
        return "empty_record"
    if points.get("platform_match", 99) <= 2.0:    # platform floor (0.1 * 20)
        return "wrong_platform"
    if points.get("budget_fit", 99) <= 0.5:        # budget floor (0.1 * 5)
        return "over_budget"
    if points.get("audience_fit", 99) <= 9.0:      # weak age overlap
        return "audience_mismatch"
    return "low_score"


def rank_kol_candidates_full(
    candidates: list[dict],
    brief: KolBriefRequest,
    top_n: int = 5,
    weights: dict | None = None,
    related_niches: set[str] | None = None,
) -> list[dict]:
    """Score & sort ALL candidates (not just top_n), annotating each with `rank`,
    `shortlisted` (rank <= top_n), and a `drop_reason` for the rest. Powers the
    Layer 2 pipeline view; the shortlist is `[c for c in result if c["shortlisted"]]`.

    `weights` / `related_niches` are optional overrides from the Layer 2 Scoring
    Agent; when omitted, this is the original deterministic model."""
    scored = []
    for c in candidates:
        score, breakdown = score_kol_candidate(c["metadata"], brief, weights, related_niches)
        scored.append({**c, "score": score, "score_breakdown": breakdown.model_dump()})
    scored.sort(key=lambda x: x["score"], reverse=True)
    for i, c in enumerate(scored):
        c["rank"] = i + 1
        c["shortlisted"] = i < top_n
        if not c["shortlisted"]:
            c["drop_reason"] = _drop_reason(c["metadata"], c["score_breakdown"])
    return scored
