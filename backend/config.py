from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-5.4-mini"
    chroma_persist_dir: str = "./chroma_db"
    data_path: str = "../data/directors_mockup.json"
    collection_name: str = "directors"
    kol_data_path: str = "../data/kols_mockup.json"
    kol_collection_name: str = "kols"

    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    max_retries: int = 2

    xai_api_key: Optional[str] = None
    xai_model: str = "grok-2-latest"

    websearch_url: str = "https://api.exa.ai/search"

    websearch_api_key: str

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


settings = Settings()
