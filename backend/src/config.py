from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # OpenRouter
    openrouter_api_key: str
    openrouter_base_url: str

    # AI Models
    gemini_model: str           # Used for prompt generation / thinking
    nano_banana_model: str      # Used for image generation

    # App
    data_dir: str
    max_concurrent_generations: int

    # CORS
    frontend_url: str

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
