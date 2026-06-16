from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.4-mini"
    chroma_persist_dir: str = "./chroma_db"
    data_path: str = "../data/directors_mockup.json"
    collection_name: str = "directors"
    kol_data_path: str = "../data/kols_mockup.json"
    kol_collection_name: str = "kols"

    model: str = "gemini-3.1-pro-preview"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    max_retries: int = 2

    # Hard cap for one Layer-3 explanation (deep agent: web search + reasoning,
    # then a hidden Vietnamese-translation pass). DeepSeek search alone can hit
    # ~60s; the translate call adds a bit more, so give it headroom.
    explanation_timeout: int = 120

    # Hard cap for the Layer-1 (Brief Interpreter) and Layer-2 (Scoring Strategist)
    # agents. These are single structured LLM calls (no web search), so they should
    # be quick; keep the cap short so a stalled call falls back fast and the pipeline
    # never makes the user wait. On timeout/error each layer uses its deterministic path.
    agent_timeout: int = 25

    google_api_key: str

    xai_api_key: Optional[str] = None
    xai_model: str = "grok-2-latest"

    deepseek_api_key: Optional[str] = None
    deepseek_model: str = "deepseek-chat"
    deepseek_base_url: str = "https://api.deepseek.com"

    websearch_url: str = "https://api.exa.ai/search"

    websearch_api_key: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
