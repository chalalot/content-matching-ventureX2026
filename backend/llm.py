from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_xai import ChatXAI
from langchain_openai import ChatOpenAI

from config import settings

google_llm = ChatGoogleGenerativeAI(
    model=settings.model,
    google_api_key=settings.google_api_key,
    temperature=settings.temperature,
    max_tokens=settings.max_tokens,
    timeout=settings.timeout,
    max_retries=settings.max_retries,
    api_key=settings.google_api_key,
)

xai_llm = None
if settings.xai_api_key and settings.xai_api_key != "your_xai_api_key_here":
    xai_llm = ChatXAI(
        model=settings.xai_model,
        xai_api_key=settings.xai_api_key,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        timeout=settings.timeout,
        max_retries=settings.max_retries,
    )

openai_llm = None
if settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
    openai_llm = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        timeout=settings.timeout,
        max_retries=settings.max_retries,
    )

# DeepSeek is OpenAI-API-compatible, so reuse ChatOpenAI with DeepSeek's base_url.
deepseek_llm = None
if settings.deepseek_api_key and settings.deepseek_api_key != "your_deepseek_api_key_here":
    deepseek_llm = ChatOpenAI(
        model=settings.deepseek_model,
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
        timeout=settings.timeout,
        max_retries=settings.max_retries,
    )

# Backward compatibility alias
llm = google_llm


