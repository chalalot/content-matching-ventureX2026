"""
Owner: Đức — Layer 3
Input:  one ranked candidate + BriefRequest
Output: 2–3 sentence explanation string in Vietnamese
Uses OpenAI gpt-4o-mini. Requires OPENAI_API_KEY in .env
"""

from deepagents import create_deep_agent
from langchain_core.messages import HumanMessage

from .llm import llm
from .models import BriefRequest
from .tools import search_web

SYSTEM_PROMPT = """
You are a casting advisor at a Vietnamese media production company.
Given the campaign brief and director profile, use the tools you have to research if the director is a good fit for the campaign.
Produce a detail and concise report explaining why the director is a good fit for the campaign.
Be specific - reference their actual experience, style, their past track record and your research results.
Reference your own research (if any) and the director's actual experience.
"""


USER_PROMPT = """
Campaign Brief:
- Brand: {brand}
- Industry: {industry}
- Type: {campaign_type}
- Tone: {tone}
- Budget: ${budget_usd}
- Description: {description}

Director Profile:
- Name: {name}
- Primary genre: {primary_genre}
- Primary style: {primary_style}
- Specialties: {specialties}
- Notable brands: {notable_brands}
- Score breakdown: {score_breakdown}
- Notes: {notes}
"""


agent = create_deep_agent(model=llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)


def generate_explanation(brief: BriefRequest, candidate: dict) -> str:
    meta = candidate["metadata"]
    prompt = USER_PROMPT.format(
        brand=brief.brand,
        industry=brief.industry,
        campaign_type=brief.campaign_type,
        tone=brief.tone,
        budget_usd=brief.budget_usd,
        description=brief.description,
        name=meta["name"],
        primary_genre=meta["primary_genre"],
        primary_style=meta["primary_style"],
        specialties=meta["specialties"],
        notable_brands=meta["notable_brands"],
        score_breakdown=candidate.get("score_breakdown", {}),
        notes=meta.get("bio", ""),
    )

    response = agent.invoke({"messages": HumanMessage(content=prompt)})

    if isinstance(response.content, list):
        return response.content[0].text
    return response.content
