from pydantic import BaseModel, Field
from enum import Enum
import uuid


class CatalogCategory(str, Enum):
    FURNITURE = "furniture"
    TILES = "tiles"
    LIGHTING = "lighting"
    DECOR = "decor"
    TEXTILES = "textiles"
    SURFACES = "surfaces"


class CatalogItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: CatalogCategory
    shop_id: str
    image_base64: str = ""
    tags: list[str] = []
    is_custom: bool = False


class Shop(BaseModel):
    id: str
    name: str
    description: str
    logo_emoji: str = "🏪"
    items: list[CatalogItem] = []


class CustomItemRequest(BaseModel):
    name: str
    description: str
    category: CatalogCategory
    image_base64: str = ""
    tags: list[str] = []
