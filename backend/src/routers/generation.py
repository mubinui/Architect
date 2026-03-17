from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from src.models.generation import (
    GenerateRequest,
    ModifyRequest,
    GenerationResponse,
    RoomGenerationResult,
)
from src.models.room import RoomResult
from src.storage.json_store import JsonProjectStore
from src.agents.orchestrator import DesignOrchestrator
from src.dependencies import get_store, get_orchestrator

router = APIRouter(tags=["generation"])


@router.post("/projects/{project_id}/generate", response_model=GenerationResponse)
async def generate_rooms(
    project_id: str,
    req: GenerateRequest = GenerateRequest(),
    store: JsonProjectStore = Depends(get_store),
    orchestrator: DesignOrchestrator = Depends(get_orchestrator),
):
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.rooms:
        raise HTTPException(status_code=400, detail="Project has no rooms")

    # Determine which rooms to generate
    if req.room_ids:
        rooms_to_gen = [r for r in project.rooms if r.id in req.room_ids]
        if not rooms_to_gen:
            raise HTTPException(status_code=400, detail="No matching rooms found")
    else:
        rooms_to_gen = project.rooms

    # Run batch generation
    raw_results = await orchestrator.generate_batch(rooms_to_gen, project.design_context)

    results = []
    successful = 0
    failed = 0

    for room, result in zip(rooms_to_gen, raw_results):
        if isinstance(result, Exception):
            failed += 1
            results.append(
                RoomGenerationResult(
                    room_id=room.id,
                    room_name=room.name,
                    image_base64="",
                    generated_prompt="",
                    status="error",
                    error=str(result),
                )
            )
        else:
            successful += 1
            project.results[room.id] = result
            results.append(
                RoomGenerationResult(
                    room_id=room.id,
                    room_name=room.name,
                    image_base64=result.image_base64,
                    generated_prompt=result.generated_prompt,
                    status="success",
                )
            )

    project.updated_at = datetime.now(timezone.utc)
    store.save(project)

    return GenerationResponse(
        project_id=project_id,
        results=results,
        total=len(rooms_to_gen),
        successful=successful,
        failed=failed,
    )


@router.post(
    "/projects/{project_id}/rooms/{room_id}/generate",
    response_model=RoomGenerationResult,
)
async def generate_single_room(
    project_id: str,
    room_id: str,
    store: JsonProjectStore = Depends(get_store),
    orchestrator: DesignOrchestrator = Depends(get_orchestrator),
):
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    room = next((r for r in project.rooms if r.id == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    try:
        result = await orchestrator.generate_room(room, project.design_context)
        project.results[room_id] = result
        project.updated_at = datetime.now(timezone.utc)
        store.save(project)
        return RoomGenerationResult(
            room_id=room.id,
            room_name=room.name,
            image_base64=result.image_base64,
            generated_prompt=result.generated_prompt,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post(
    "/projects/{project_id}/rooms/{room_id}/modify",
    response_model=RoomGenerationResult,
)
async def modify_room(
    project_id: str,
    room_id: str,
    req: ModifyRequest,
    store: JsonProjectStore = Depends(get_store),
    orchestrator: DesignOrchestrator = Depends(get_orchestrator),
):
    project = store.load(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    room = next((r for r in project.rooms if r.id == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    original_result = project.results.get(room_id)
    if not original_result:
        raise HTTPException(
            status_code=400,
            detail="Room has not been generated yet. Generate first before modifying.",
        )

    try:
        result = await orchestrator.modify_room(
            room=room,
            context=project.design_context,
            original_result=original_result,
            modification_prompt=req.modification_prompt,
        )
        project.results[room_id] = result
        project.updated_at = datetime.now(timezone.utc)
        store.save(project)
        return RoomGenerationResult(
            room_id=room.id,
            room_name=room.name,
            image_base64=result.image_base64,
            generated_prompt=result.generated_prompt,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Modification failed: {e}")
