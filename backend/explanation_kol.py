"""
Layer 3 (KOL) — AI Explanation
Input:  one ranked KOL candidate + KolBriefRequest
Output: markdown explanation string
Uses same deepagents + web search pattern as explanation.py
"""

import concurrent.futures
from datetime import date

from deepagents import create_deep_agent
from langchain_core.messages import HumanMessage

from llm import google_llm, xai_llm, openai_llm
from models import KolBriefRequest
from tools import search_web

SYSTEM_PROMPT = """
You are a KOL partnership advisor at a Vietnamese marketing agency.
Given the campaign brief and KOL profile, use the websearch tool to research if the KOL is a good fit.
Use a diverse set of queries:
- "Scandals involve {kol_name}"
- "{kol_name} Vietnam audience demographic"
- "{kol_name} brand collaboration results"
- "{kol_name} {niche} content"
Pay attention to current date vs. search result dates — old scandals may be less relevant.
Produce a concise report explaining why the KOL fits (or doesn't fit) this campaign.
Reference their follower count, engagement, niche, past brand deals, and your research.
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

google_agent = create_deep_agent(model=google_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)

xai_agent = None
if xai_llm:
    xai_agent = create_deep_agent(model=xai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)

openai_agent = None
if openai_llm:
    openai_agent = create_deep_agent(model=openai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)


def generate_kol_explanation(brief: KolBriefRequest, candidate: dict) -> str:
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

    def _invoke():
        if brief.provider == "openai":
            if not openai_agent:
                raise ValueError("OpenAI API key is not configured on the server.")
            agent = openai_agent
        elif brief.provider == "xai":
            if not xai_agent:
                raise ValueError("xAI API key is not configured on the server.")
            agent = xai_agent
        else:
            if not google_agent:
                raise ValueError("Google API key is not configured on the server.")
            agent = google_agent

        response = agent.invoke({"messages": HumanMessage(content=prompt)})

        if isinstance(response, dict) and "messages" in response:
            last_msg = response["messages"][-1]
            content = last_msg.content
        else:
            content = response.content if hasattr(response, "content") else response

        if isinstance(content, list):
            texts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    texts.append(block.get("text", ""))
                elif hasattr(block, "text"):
                    texts.append(block.text)
                elif isinstance(block, str):
                    texts.append(block)
            return "\n".join(texts)
        return content

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_invoke)
        try:
            return future.result(timeout=25)
        except concurrent.futures.TimeoutError:
            return f"[timeout] Agent did not finish in 25s for {meta['stage_name']}"
