"""
Layer 2 Agent — Scoring Strategist.

Wraps the existing rule scorer (scoring_kol.py) in a thin LLM agent. ONE LLM call
per request (not per candidate — keeps it fast/cheap) produces a `ScoringPolicy`:
  - weights: adjusted dimension weights reflecting what this brief stresses.
  - related_niches: niches treated as related to the target niche (merged with
    whatever Layer 1's BriefIntent already found).

The rule scorer then runs deterministically with those overrides, so the output
shape == rank_kol_candidates_full and the pipeline/frontend are unchanged.

SAFETY: any failure falls back to the default weights + hardcoded niche groups,
so the demo behaves exactly like today in the worst case.
"""

import concurrent.futures

from pydantic import BaseModel, Field

from config import settings
from models import KolBriefRequest
from scoring_kol import rank_kol_candidates_full, WEIGHTS
from agent_common import structured_llm

_KNOWN_DIMS = list(WEIGHTS.keys())


class ScoringPolicy(BaseModel):
    weights: dict[str, float] = Field(
        default_factory=dict,
        description="Relative importance (0-1) per scoring dimension for THIS brief. "
        f"Keys must be from: {_KNOWN_DIMS}. They are normalized afterwards, so use "
        "relative magnitudes. Omit to keep defaults.",
    )
    related_niches: list[str] = Field(
        default_factory=list,
        description="Lowercase niches that count as related to the target niche for "
        "this brief. Exclude the target niche itself.",
    )
    rationale: str = Field(
        default="", description="One short sentence: why these weights fit the brief."
    )


_PROMPT = """You are the Scoring Strategist agent at a Vietnamese influencer-marketing agency.
Decide how to weight the KOL scoring dimensions for THIS specific campaign brief, and which
niches should count as related to the target niche.

Default dimension weights (relative importance): {default_weights}

Campaign brief:
- Brand: {brand}
- Industry: {industry}
- Target niche: {target_niche}
- Preferred platform: {preferred_platform}
- Target age group: {target_age_group}
- Content format: {content_format}
- Budget (USD): {budget_usd}
- Description: {description}
- Dimensions the interpreter flagged as emphasized: {emphasis}

Adjust weights to reflect what this brief truly cares about (e.g. a tight budget → raise
budget_fit; an awareness push → raise reach; an engagement-led brief → raise engagement).
Keep changes sensible; do not zero out core dimensions. Return the ScoringPolicy."""


def build_scoring_policy(brief: KolBriefRequest, emphasis: list[str] | None = None) -> ScoringPolicy:
    """One structured LLM call → ScoringPolicy. Times out / falls back safely."""
    def _invoke() -> ScoringPolicy:
        llm = structured_llm(brief.provider, ScoringPolicy)
        prompt = _PROMPT.format(
            default_weights=WEIGHTS,
            brand=brief.brand,
            industry=brief.industry,
            target_niche=brief.target_niche,
            preferred_platform=brief.preferred_platform,
            target_age_group=brief.target_age_group,
            content_format=brief.content_format,
            budget_usd=brief.budget_usd,
            description=brief.description,
            emphasis=emphasis or [],
        )
        return llm.invoke(prompt)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_invoke)
        try:
            policy = future.result(timeout=settings.agent_timeout)
        except Exception as e:
            print(f"[L2 agent] fallback to default weights: {str(e)[:160]}")
            return ScoringPolicy()

    # Normalize: keep only known dims with positive weight; lowercase niches.
    policy.weights = {d: float(w) for d, w in policy.weights.items() if d in _KNOWN_DIMS and w > 0}
    policy.related_niches = [n.lower().strip() for n in policy.related_niches if n.strip()]
    return policy


def run_layer2(
    candidates: list[dict],
    brief: KolBriefRequest,
    top_n: int,
    intent_related_niches: list[str] | None = None,
    emphasis: list[str] | None = None,
) -> tuple[list[dict], ScoringPolicy]:
    """Build a scoring policy, then score+rank ALL candidates with it.
    Returns (ranked_full, policy). Falls back to default scoring on any issue."""
    policy = build_scoring_policy(brief, emphasis)

    # Merge niches found by Layer 1 and Layer 2; None means "use hardcoded groups".
    merged = set(policy.related_niches) | set(intent_related_niches or [])
    related = merged or None
    weights = policy.weights or None

    ranked_full = rank_kol_candidates_full(
        candidates, brief, top_n=top_n, weights=weights, related_niches=related
    )
    return ranked_full, policy
