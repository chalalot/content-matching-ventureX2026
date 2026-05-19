from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    chroma_persist_dir: str = "./chroma_db"
    data_path: str = "../data/directors_mockup.json"
    collection_name: str = "directors"

    model: str = "gemini-3.1-pro-preview"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    max_retries: int = 2

    websearch_url: str = "https://api.exa.ai/search"
    websearch_api_key: str

    model: str = "gemini-3.1-pro-preview"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    max_retries: int = 2

    websearch_url: str = "https://api.exa.ai/search"
    websearch_api_key: str

    class Config:
        env_file = ".env"


settings = Settings()
