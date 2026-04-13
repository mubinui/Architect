import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.dependencies import get_vendor_index_store
from src.routers import (
    catalog,
    catalog_vendors,
    generation,
    projects,
    rooms,
    scraper,
)

_settings = get_settings()
_log = logging.getLogger("architect.startup")

app = FastAPI(
    title="Architect API",
    description="AI-powered home interior design",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(catalog.router)
app.include_router(catalog_vendors.router)
app.include_router(scraper.router, prefix="/api")


@app.on_event("startup")
async def _seed_vendor_index() -> None:
    store = get_vendor_index_store()

    async def run() -> None:
        try:
            await store.ensure_seeded()
        except Exception as exc:
            _log.warning("vendor index seed failed: %s", exc)

    asyncio.create_task(run())


@app.get("/api/health")
async def health():
    return {"status": "ok"}
