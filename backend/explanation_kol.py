import concurrent.futures
import re
import traceback
from datetime import date

from deepagents import create_deep_agent
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from llm import xai_llm, openai_llm
from models import KolBriefRequest, KolExplanation, Source
from tools import search_web


# What the agent is asked to return (structured). The full KolExplanation sent to the
# frontend is assembled from this + the brief (fit_label, brief_recap, full_report_md).
class _AgentReport(BaseModel):
    fit_score: float = Field(description="Overall fit of this KOL to the brief, 0-10.")
    headline: str = Field(description="One-line verdict, <= 15 words.")
    why_good: list[str] = Field(description="2-5 short bullets on strengths / alignment.")
    why_not_good: list[str] = Field(description="2-5 short bullets on risks or limitations.")
    recent_dramas: list[str] = Field(description="Recent scandals/controversies found; empty list if none.")
    recommendations: list[str] = Field(description="1-3 concrete, actionable next steps for the campaign team.")
    # Flat list[str] (NOT a nested model) — some providers reject the $ref/$defs
    # that nested Pydantic models generate. Parsed into Source objects later.
    sources: list[str] = Field(description="Key web sources used, each as 'Title - https://url'.")
    reasoning_log: str = Field(description="Short summary of the search queries you ran and what you found.")


SYSTEM_PROMPT = """
You are a KOL partnership advisor at a Vietnamese marketing agency.
Given the campaign brief and KOL profile, use the websearch tool to research whether the KOL fits.
Use a diverse set of queries, e.g.:
- "Scandals involve {kol_name}"
- "{kol_name} Vietnam audience demographic"
- "{kol_name} brand collaboration results"
- "{kol_name} {niche} content"
Pay attention to current date vs. search-result dates — old scandals may be less relevant.

Return a STRUCTURED assessment:
- fit_score: 0-10 overall fit (be honest; reserve 8+ for strong fits).
- headline: one punchy line.
- why_good / why_not_good: short, specific bullets (reference followers, engagement, niche, past deals, your research).
- recent_dramas: real recent controversies only; empty list if none found.
- recommendations: concrete next steps.
- sources: the actual web pages you used (title + url).
- reasoning_log: one short paragraph naming the queries you ran and what they showed.
"""

USER_PROMPT = """
Today's date: {today}

Campaign Brief:
- Brand: {brand}
- Industry: {industry}
- Target niche: {target_niche}
- Preferred platform: {preferred_platform}
- Target age group: {target_age_group}
- Content format: {content_format}
- Budget: ${budget_usd}
- Description: {description}

KOL Profile:
- Name: {name}
- Main niche: {main_niche}
- Primary platform: {primary_platform}
- Platforms: {platforms}
- Total followers: {total_followers:,}
- Avg engagement rate: {avg_engagement_rate:.2f}%
- Booking fee estimate: {booking_fee:,.0f} VND
- Target demographic: {target_demographic_age}
- Score breakdown: {score_breakdown}
- Bio: {bio}
"""

xai_agent = None
if xai_llm:
    xai_agent = create_deep_agent(
        model=xai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT, response_format=_AgentReport
    )

openai_agent = None
if openai_llm:
    openai_agent = create_deep_agent(
        model=openai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT, response_format=_AgentReport
    )


def _fit_label(score: float) -> str:
    if score >= 7.5:
        return "Strong fit"
    if score >= 5.0:
        return "Partial fit"
    return "Weak fit"


def _brief_recap(brief: KolBriefRequest) -> str:
    ctx = " · ".join(p for p in (brief.content_format, brief.target_niche, brief.preferred_platform) if p)
    return f"{brief.brand}: {ctx}" if ctx else brief.brand


def _build_report_md(report: _AgentReport) -> str:
    def bullets(items: list[str]) -> str:
        return "\n".join(f"- {x}" for x in items) if items else "_None_"

    dramas = "\n".join(f"- {x}" for x in report.recent_dramas) if report.recent_dramas else "_No red flags found._"
    return (
        f"## {report.headline}\n\n"
        f"**Fit score:** {report.fit_score:.1f}/10\n\n"
        f"### Strengths\n{bullets(report.why_good)}\n\n"
        f"### Risks & limitations\n{bullets(report.why_not_good)}\n\n"
        f"### Background check\n{dramas}\n\n"
        f"### Recommendations\n{bullets(report.recommendations)}"
    )


_URL_RE = re.compile(r"https?://\S+")


def _parse_sources(items: list[str]) -> list[Source]:
    """Turn flat 'Title - https://url' strings into Source objects (URL extracted)."""
    out: list[Source] = []
    for s in items or []:
        m = _URL_RE.search(s)
        if not m:
            continue
        url = m.group(0).rstrip(").,]")
        title = s[: m.start()].strip(" -—|:") or url
        out.append(Source(title=title, url=url))
    return out


def _assemble(brief: KolBriefRequest, report: _AgentReport) -> KolExplanation:
    score = max(0.0, min(10.0, float(report.fit_score)))
    return KolExplanation(
        fit_score=round(score, 1),
        fit_label=_fit_label(score),
        headline=report.headline,
        brief_recap=_brief_recap(brief),
        why_good=report.why_good,
        why_not_good=report.why_not_good,
        recent_dramas=report.recent_dramas,
        recommendations=report.recommendations,
        full_report_md=_build_report_md(report),
        reasoning_log=report.reasoning_log,
        sources=_parse_sources(report.sources),
    )


def _error_explanation(brief: KolBriefRequest, message: str) -> KolExplanation:
    return KolExplanation(
        fit_score=0.0,
        fit_label="Unavailable",
        headline=message,
        brief_recap=_brief_recap(brief),
        why_good=[],
        why_not_good=[],
        recent_dramas=[],
        recommendations=[],
        full_report_md=f"_{message}_",
        reasoning_log="",
        sources=[],
    )


def generate_kol_explanation(brief: KolBriefRequest, candidate: dict) -> KolExplanation:
    """Always returns a KolExplanation — on timeout/quota/any error it returns a
    graceful 'Unavailable' explanation rather than raising, so the engine never breaks."""
    meta = candidate["metadata"]
    prompt = USER_PROMPT.format(
        today=date.today(),
        brand=brief.brand,
        industry=brief.industry,
        target_niche=brief.target_niche,
        preferred_platform=brief.preferred_platform,
        target_age_group=brief.target_age_group,
        content_format=brief.content_format,
        budget_usd=brief.budget_usd,
        description=brief.description,
        name=meta["stage_name"],
        main_niche=meta["main_niche"],
        primary_platform=meta["primary_platform"],
        platforms=meta.get("platforms", ""),
        total_followers=int(meta.get("total_followers", 0)),
        avg_engagement_rate=float(meta.get("avg_engagement_rate", 0)),
        booking_fee=float(meta.get("booking_fee_estimate", 0)),
        target_demographic_age=meta.get("target_demographic_age", ""),
        score_breakdown=candidate.get("score_breakdown", {}),
        bio=meta.get("bio", ""),
    )

    def _invoke() -> KolExplanation:
        if brief.provider == "xai":
            if not xai_agent:
                raise ValueError("xAI API key is not configured on the server.")
            agent = xai_agent
        else:
            if not openai_agent:
                raise ValueError("OpenAI API key is not configured on the server.")
            agent = openai_agent

        response = agent.invoke({"messages": HumanMessage(content=prompt)})
        report = response.get("structured_response") if isinstance(response, dict) else None
        if not report:
            raise ValueError("Agent did not return a structured response.")
        return _assemble(brief, report)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            return executor.submit(_invoke).result(timeout=25)
    except concurrent.futures.TimeoutError:
        return _error_explanation(brief, f"AI research timed out for {meta.get('stage_name', 'this KOL')}.")
    except Exception as e:
        traceback.print_exc()  # full error to the backend console for debugging
        msg = str(e)
        if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
            return _error_explanation(brief, "AI explanation unavailable — API quota exceeded.")
        return _error_explanation(brief, f"AI explanation unavailable: {msg[:160]}")
