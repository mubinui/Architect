from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routers import projects, rooms, generation, catalog, scraper

_settings = get_settings()

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
app.include_router(scraper.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
