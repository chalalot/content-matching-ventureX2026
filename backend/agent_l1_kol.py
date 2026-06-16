"""
Layer 1 Agent — Brief Interpreter.

Wraps the existing embedding retrieval (retrieval_kol.py) in a thin LLM agent.
The agent reads the campaign brief and produces a `BriefIntent`:
  - enriched_query: a richer semantic query (replaces the static string-concat).
  - related_niches: niches that count as related to the target niche for THIS
    brief (replaces the hardcoded _NICHE_GROUPS at scoring time).
  - emphasis: which scoring dimensions the brief stresses (hint for Layer 2).

Then it calls the retrieve tool. Output shape == retrieve_kol_candidates, so
Layer 2 / pipeline / frontend are unchanged.

SAFETY: any failure (error, timeout, bad output) falls back to plain retrieval,
so the demo behaves exactly like today in the worst case.
"""

import concurrent.futures

from pydantic import BaseModel, Field

from config import settings
from models import KolBriefRequest
from retrieval_kol import retrieve_kol_candidates, _build_kol_query
from agent_common import structured_llm

# Dimensions Layer 2 knows about — the agent may only emphasize these.
_KNOWN_DIMS = [
    "niche_match", "platform_match", "audience_fit",
    "engagement", "reach", "budget_fit", "availability",
]


class BriefIntent(BaseModel):
    enriched_query: str = Field(
        description="A rich semantic search query describing the ideal creator for "
        "this brief: niche, audience, platform, content style, brand vibe. 1-3 sentences."
    )
    related_niches: list[str] = Field(
        default_factory=list,
        description="Lowercase niche names that should count as RELATED to the target "
        "niche for this brief (e.g. for 'fashion': streetwear, workwear). Exclude the "
        "target niche itself. Keep it tight — only defensible overlaps.",
    )
    emphasis: list[str] = Field(
        default_factory=list,
        description=f"Scoring dimensions this brief stresses most, from: {_KNOWN_DIMS}.",
    )


_PROMPT = """You are the Brief Interpreter agent at a Vietnamese influencer-marketing agency.
Read the campaign brief and produce a structured search intent that a retrieval system
and a scoring system will use to find the best KOLs (key opinion leaders / creators).

Campaign brief:
- Brand: {brand}
- Industry: {industry}
- Target niche: {target_niche}
- Preferred platform: {preferred_platform}
- Target age group: {target_age_group}
- Content format: {content_format}
- Budget (USD): {budget_usd}
- Description: {description}

Produce the BriefIntent. Be concrete and avoid generic filler."""


def _trivial_intent(brief: KolBriefRequest) -> BriefIntent:
    """Deterministic fallback intent — equivalent to today's behavior."""
    return BriefIntent(enriched_query=_build_kol_query(brief), related_niches=[], emphasis=[])


def interpret_brief(brief: KolBriefRequest) -> BriefIntent:
    """One structured LLM call → BriefIntent. Times out / falls back safely."""
    def _invoke() -> BriefIntent:
        llm = structured_llm(brief.provider, BriefIntent)
        prompt = _PROMPT.format(
            brand=brief.brand,
            industry=brief.industry,
            target_niche=brief.target_niche,
            preferred_platform=brief.preferred_platform,
            target_age_group=brief.target_age_group,
            content_format=brief.content_format,
            budget_usd=brief.budget_usd,
            description=brief.description,
        )
        return llm.invoke(prompt)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_invoke)
        try:
            intent = future.result(timeout=settings.agent_timeout)
        except Exception as e:
            print(f"[L1 agent] fallback to plain query: {str(e)[:160]}")
            return _trivial_intent(brief)

    # Normalize: lowercase niches, keep only known emphasis dims, ensure a query.
    intent.related_niches = [n.lower().strip() for n in intent.related_niches if n.strip()]
    intent.emphasis = [d for d in intent.emphasis if d in _KNOWN_DIMS]
    if not intent.enriched_query.strip():
        intent.enriched_query = _build_kol_query(brief)
    return intent


def run_layer1(brief: KolBriefRequest, top_k: int) -> tuple[list[dict], BriefIntent]:
    """Interpret the brief, then retrieve with the enriched query.
    Returns (candidates, intent). `intent` is threaded into Layer 2."""
    intent = interpret_brief(brief)
    candidates = retrieve_kol_candidates(brief, top_k=top_k, query_text=intent.enriched_query)
    return candidates, intent
