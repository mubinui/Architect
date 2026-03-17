from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from src.models.room import RoomSpec
from src.models.project import Project
from src.storage.json_store import JsonProjectStore
from src.dependencies import get_store

router = APIRouter(tags=["rooms"])


def _get_project(project_id: str, store: JsonProjectStore) -> Project:
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _find_room(project: Project, room_id: str) -> tuple[int, RoomSpec]:
    for i, room in enumerate(project.rooms):
        if room.id == room_id:
            return i, room
    raise HTTPException(status_code=404, detail="Room not found")


@router.post("/projects/{project_id}/rooms", response_model=RoomSpec)
async def add_room(
    project_id: str,
    room: RoomSpec,
    store: JsonProjectStore = Depends(get_store),
):
    project = _get_project(project_id, store)
    project.rooms.append(room)
    project.updated_at = datetime.now(timezone.utc)
    store.save(project)
    return room


@router.put("/projects/{project_id}/rooms/{room_id}", response_model=RoomSpec)
async def update_room(
    project_id: str,
    room_id: str,
    updated_room: RoomSpec,
    store: JsonProjectStore = Depends(get_store),
):
    project = _get_project(project_id, store)
    idx, _ = _find_room(project, room_id)
    updated_room.id = room_id
    project.rooms[idx] = updated_room
    project.updated_at = datetime.now(timezone.utc)
    store.save(project)
    return updated_room


@router.delete("/projects/{project_id}/rooms/{room_id}")
async def delete_room(
    project_id: str,
    room_id: str,
    store: JsonProjectStore = Depends(get_store),
):
    project = _get_project(project_id, store)
    idx, _ = _find_room(project, room_id)
    project.rooms.pop(idx)
    project.results.pop(room_id, None)
    project.updated_at = datetime.now(timezone.utc)
    store.save(project)
    return {"status": "deleted"}
