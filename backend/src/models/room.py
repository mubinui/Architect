from pydantic import BaseModel, Field
from enum import Enum
import uuid


class RoomType(str, Enum):
    BEDROOM = "bedroom"
    KITCHEN = "kitchen"
    BATHROOM = "bathroom"
    LIVING_ROOM = "living_room"
    DINING_ROOM = "dining_room"
    OFFICE = "office"
    HALLWAY = "hallway"
    BALCONY = "balcony"
    GUEST_ROOM = "guest_room"
    KIDS_ROOM = "kids_room"
    LAUNDRY = "laundry"
    CLOSET = "closet"


class Dimensions(BaseModel):
    width: float = Field(gt=0, description="Width in feet")
    height: float = Field(gt=0, default=9.0, description="Ceiling height in feet")
    length: float = Field(gt=0, description="Length in feet")


class RoomSpec(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    room_type: RoomType
    dimensions: Dimensions
    color_preferences: list[str] = []
    furniture_preferences: list[str] = []
    selected_catalog_items: list[str] = []
    notes: str = ""


class RoomResult(BaseModel):
    room_id: str
    generated_prompt: str
    image_base64: str
    generation_number: int = 1
    modification_history: list[str] = []
