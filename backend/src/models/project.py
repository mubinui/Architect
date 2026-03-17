from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

from src.models.design_context import DesignContext
from src.models.room import RoomSpec, RoomResult


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    design_context: DesignContext
    rooms: list[RoomSpec] = []
    results: dict[str, RoomResult] = {}


class ProjectSummary(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    style: str
    room_count: int
    has_results: bool
