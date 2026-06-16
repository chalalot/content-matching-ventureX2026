"""
Owner: Đức — Layer 3
Input:  one ranked candidate + BriefRequest
Output: 2–3 sentence explanation string in Vietnamese
Uses Gemini + Exa web search via deepagents
"""

import concurrent.futures
from datetime import date

from deepagents import create_deep_agent
from langchain_core.messages import HumanMessage

from config import settings
from llm import google_llm, xai_llm, openai_llm, deepseek_llm
from models import BriefRequest
from tools import search_web

SYSTEM_PROMPT = """
You are a casting advisor at a Vietnamese media production company.
Given the campaign brief and director profile, use the websearch tool you have to research if the director is a good fit for the campaign.
Use a diverse set of queries for websearch to gather a broad range of information.
Ex:
- "Scandals involve {director_name}"
- "Netizens boycott product involve with {director_name}"
- "{director_name} work on similar projects"
- "{director_name} content genre"
Do also pay attention to the current date and the date of the websearch results, as they may provide additional context.
Ex: A scandal too long ago may not be relevant to the current campaign.
Produce a detail and concise report explaining why the director is a good fit for the campaign.
Be specific - reference their actual experience, style, their past track record and your research results.
Reference your own research (if any) and the director's actual experience.
"""


USER_PROMPT = """
Today's date: {today}

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


google_agent = create_deep_agent(model=google_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)

xai_agent = None
if xai_llm:
    xai_agent = create_deep_agent(model=xai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)

openai_agent = None
if openai_llm:
    openai_agent = create_deep_agent(model=openai_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)

deepseek_agent = None
if deepseek_llm:
    deepseek_agent = create_deep_agent(model=deepseek_llm, tools=[search_web], system_prompt=SYSTEM_PROMPT)


def generate_explanation(brief: BriefRequest, candidate: dict) -> str:
    meta = candidate["metadata"]
    prompt = USER_PROMPT.format(
        today=date.today(),
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

    def _invoke():
        if brief.provider == "openai":
            if not openai_agent:
                raise ValueError("OpenAI API key is not configured on the server.")
            agent = openai_agent
            provider_name = "OpenAI"
        elif brief.provider == "xai":
            if not xai_agent:
                raise ValueError("xAI API key is not configured on the server.")
            agent = xai_agent
            provider_name = "xAI (Grok)"
        elif brief.provider == "deepseek":
            if not deepseek_agent:
                raise ValueError("DeepSeek API key is not configured on the server.")
            agent = deepseek_agent
            provider_name = "DeepSeek"
        else:
            if not google_agent:
                raise ValueError("Google API key is not configured on the server.")
            agent = google_agent
            provider_name = "Google GenAI"

        print(f"Attempting explanation generation using {provider_name}...")
        response = agent.invoke({"messages": HumanMessage(content=prompt)})
        
        # deepagents returns a dict with 'messages' list; get the last message
        if isinstance(response, dict) and "messages" in response:
            last_msg = response["messages"][-1]
            content = last_msg.content
        else:
            # Fallback if it is already a message or another format
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
            return future.result(timeout=settings.explanation_timeout)
        except concurrent.futures.TimeoutError:
            return f"[timeout] Agent did not finish in {settings.explanation_timeout}s for {meta['name']}"



if __name__ == "__main__":
    mock_brief = BriefRequest(
        brand="ASUS ROG Vietnam",
        industry="Technology / Gaming Hardware",
        campaign_type="Influencer Endorsement & Viral Marketing",
        tone="Energetic, Authentic, Community-driven",
        budget_usd=45000,
        description=(
            "Launching a new lineup of gaming laptops targeting Gen Z and young adults in Vietnam. "
            "We want to move away from rigid scripts and lean heavily into authentic, funny, and "
            "highly interactive live content that showcases real-world performance."
        ),
        timeline_weeks=10,
    )

    mock_candidate = {
        "metadata": {
            "name": "Độ Mixi (Phùng Thanh Độ)",
            "primary_genre": "Gaming, Lifestyle, Entertainment",
            "primary_style": "Humorous, Direct, Hyper-Authentic, Close-knit Family/Tribal ('Bộ Tộc')",
            "specialties": "Live-stream integration, massive organic community engagement, viral gaming music videos",
            "notable_brands": "Garena Liên Quân Mobile, FIFA Online, PUBG Mobile",
            "bio": (
                "One of the undisputed top streamers in Vietnam. Recently founded Mixi Gaming Advertising "
                "and Media Co. Known for massive concurrent live viewership numbers and a highly loyal, "
                "active fanbase."
            ),
        },
        "score_breakdown": {
            "audience_alignment": 9.8,
            "engagement_potential": 9.9,
            "brand_safety": 8.5,
        },
    }

    print("Invoking Deep Agent to compile the casting evaluation...")

    try:
        report = generate_explanation(mock_brief, mock_candidate)
        print("\n" + "=" * 30 + " CASTING REPORT " + "=" * 30)
        print(report)
        print("=" * 76)
    except Exception as e:
        print(f"\nError: {e}")
