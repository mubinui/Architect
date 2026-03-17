from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from src.models.project import Project, ProjectSummary
from src.models.design_context import DesignContext, DesignStyle
from src.models.room import RoomSpec
from src.storage.json_store import JsonProjectStore
from src.dependencies import get_store
from pydantic import BaseModel

router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str
    design_context: DesignContext
    rooms: list[RoomSpec] = []


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    design_context: DesignContext | None = None


@router.post("/projects", response_model=Project)
async def create_project(
    req: CreateProjectRequest,
    store: JsonProjectStore = Depends(get_store),
):
    project = Project(
        name=req.name,
        design_context=req.design_context,
        rooms=req.rooms,
    )
    store.save(project)
    return project


@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects(store: JsonProjectStore = Depends(get_store)):
    return store.list_all()


@router.get("/projects/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    store: JsonProjectStore = Depends(get_store),
):
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    req: UpdateProjectRequest,
    store: JsonProjectStore = Depends(get_store),
):
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.name is not None:
        project.name = req.name
    if req.design_context is not None:
        project.design_context = req.design_context
    project.updated_at = datetime.now(timezone.utc)
    store.save(project)
    return project


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: str,
    store: JsonProjectStore = Depends(get_store),
):
    if not store.delete(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted"}


@router.get("/styles")
async def list_styles():
    return [
        {"value": style.value, "label": style.value.replace("_", " ").title()}
        for style in DesignStyle
    ]
