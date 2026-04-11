from functools import lru_cache

from src.config import get_settings
from src.storage.json_store import JsonProjectStore
from src.storage.catalog_store import CatalogStore
from src.services.openrouter import OpenRouterClient
from src.agents.orchestrator import DesignOrchestrator


@lru_cache
def get_store() -> JsonProjectStore:
    return JsonProjectStore(get_settings().data_dir)


@lru_cache
def get_openrouter_client() -> OpenRouterClient:
    settings = get_settings()
    return OpenRouterClient(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
    )


@lru_cache
def get_orchestrator() -> DesignOrchestrator:
    return DesignOrchestrator(
        client=get_openrouter_client(),
        settings=get_settings(),
    )


@lru_cache
def get_catalog_store() -> CatalogStore:
    return CatalogStore(get_settings().data_dir)
