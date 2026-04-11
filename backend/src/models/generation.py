from pydantic import BaseModel


class GenerateRequest(BaseModel):
    room_ids: list[str] | None = None  # None = generate all rooms
    reference_images: list[str] = []  # base64 data URLs from user uploads


class ModifyRequest(BaseModel):
    modification_prompt: str
    reference_images: list[str] = []  # base64 data URLs from user uploads


class RoomGenerationResult(BaseModel):
    room_id: str
    room_name: str
    image_base64: str
    generated_prompt: str
    status: str = "success"
    error: str | None = None


class GenerationResponse(BaseModel):
    project_id: str
    results: list[RoomGenerationResult]
    total: int
    successful: int
    failed: int
