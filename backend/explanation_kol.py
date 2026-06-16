import concurrent.futures
from datetime import date

from deepagents import create_deep_agent
from langchain_core.messages import HumanMessage

from config import settings
from llm import google_llm, xai_llm, openai_llm, deepseek_llm
from models import KolBriefRequest, KolExplanation
from tools import search_web

# The deep agent produces this structured report (researched via web search). It
# may come back partly in English (search results are English) — a second hidden
# translation pass normalizes everything to Vietnamese before it reaches the FE.
CastingReport = KolExplanation

SYSTEM_PROMPT = """
You are a KOL partnership advisor at a Vietnamese marketing agency.
Given the campaign brief and KOL profile, use the websearch tool to research if the KOL is a good fit.
Use a diverse set of queries:
- "Scandals involve {kol_name}"
- "{kol_name} Vietnam audience demographic"
- "{kol_name} brand collaboration results"
- "{kol_name} {niche} content"
Pay attention to current date vs. search result dates — old scandals may be less relevant.
Produce a structured report assessing why the KOL fits (or doesn't fit) this campaign.
Reference their follower count, engagement, niche, past brand deals, and your research.

Output rules:
- brief_summary: 2-3 sentences.
- why_good / why_not_good / recommendations: each a list of short one-sentence bullets (aim 2-5 items).
- recent_dramas: a list of concrete scandal/controversy flags; return an EMPTY list if none found.
Write in Vietnamese where you can, but it's fine if some bullets are in English — they will be translated afterwards.
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

# Pass response_format=CastingReport to the deep agents
google_agent = create_deep_agent(
    model=google_llm, 
    tools=[search_web], 
    system_prompt=SYSTEM_PROMPT,
    response_format=CastingReport
)

xai_agent = None
if xai_llm:
    xai_agent = create_deep_agent(
        model=xai_llm, 
        tools=[search_web], 
        system_prompt=SYSTEM_PROMPT,
        response_format=CastingReport
    )

openai_agent = None
if openai_llm:
    openai_agent = create_deep_agent(
        model=openai_llm,
        tools=[search_web],
        system_prompt=SYSTEM_PROMPT,
        response_format=CastingReport
    )

deepseek_agent = None
if deepseek_llm:
    deepseek_agent = create_deep_agent(
        model=deepseek_llm,
        tools=[search_web],
        system_prompt=SYSTEM_PROMPT,
        response_format=CastingReport
    )


# Map provider -> raw chat model (used for the translation pass, no web search).
_LLMS = {"openai": openai_llm, "xai": xai_llm, "deepseek": deepseek_llm, "google": google_llm}


def _agent_for(provider: str):
    if provider == "openai":
        if not openai_agent:
            raise ValueError("OpenAI API key is not configured on the server.")
        return openai_agent
    if provider == "xai":
        if not xai_agent:
            raise ValueError("xAI API key is not configured on the server.")
        return xai_agent
    if provider == "deepseek":
        if not deepseek_agent:
            raise ValueError("DeepSeek API key is not configured on the server.")
        return deepseek_agent
    if not google_agent:
        raise ValueError("Google API key is not configured on the server.")
    return google_agent


def _translate_to_vietnamese(report: KolExplanation, provider: str) -> KolExplanation:
    """Hidden second pass: force the whole structured report into natural Vietnamese.
    No web search — just a structured-output LLM call, so it's fast.

    Best-effort: if structured translation fails (e.g. provider quirks), we return
    the untranslated report rather than blanking the whole explanation."""
    base = _LLMS.get(provider) or google_llm

    # DeepSeek (and other OpenAI-compatible endpoints) reject the default
    # json_schema response_format — force the function-calling method instead.
    if provider in ("deepseek", "openai", "xai"):
        translator = base.with_structured_output(KolExplanation, method="function_calling")
    else:
        translator = base.with_structured_output(KolExplanation)

    prompt = (
        "Dịch toàn bộ báo cáo sau sang tiếng Việt tự nhiên, gãy gọn. "
        "Giữ NGUYÊN cấu trúc và số lượng phần tử của mỗi danh sách. "
        "Giữ nguyên tên riêng, tên thương hiệu, số liệu, ngày tháng. "
        "Không thêm/bớt ý, không bình luận. Trả về đúng schema.\n\n"
        f"{report.model_dump_json()}"
    )
    try:
        return translator.invoke(prompt)
    except Exception as e:
        print(f"[translate] fallback to untranslated report: {str(e)[:160]}")
        return report


def _error_explanation(message: str) -> KolExplanation:
    return KolExplanation(brief_summary=message)


def generate_kol_explanation(brief: KolBriefRequest, candidate: dict) -> KolExplanation:
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
        agent = _agent_for(brief.provider)
        response = agent.invoke({"messages": HumanMessage(content=prompt)})

        report: KolExplanation = response.get("structured_response")
        if not report:
            raise ValueError("Failed to retrieve structured response from the agent.")

        # Hidden layer: translate the researched report fully into Vietnamese.
        return _translate_to_vietnamese(report, brief.provider)

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_invoke)
        try:
            return future.result(timeout=settings.explanation_timeout)
        except concurrent.futures.TimeoutError:
            return _error_explanation(
                f"[AI không kịp hoàn tất trong {settings.explanation_timeout}s cho {meta['stage_name']}.]"
            )
        except Exception as e:
            msg = str(e)
            if "RESOURCE_EXHAUSTED" in msg or "429" in msg:
                return _error_explanation("[Không tạo được giải thích AI — đã vượt hạn mức API.]")
            return _error_explanation(f"[Không tạo được giải thích AI: {msg[:120]}]")
