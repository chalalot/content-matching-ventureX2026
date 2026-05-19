from langchain_google_genai import ChatGoogleGenerativeAI

from config import settings

llm = ChatGoogleGenerativeAI(
    model=settings.model,
    google_api_key=settings.google_api_key,
    temperature=settings.temperature,
    max_tokens=settings.max_tokens,
    timeout=settings.timeout,
    max_retries=settings.max_retries,
    api_key=settings.google_api_key,
)
