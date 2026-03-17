from pydantic import BaseModel
from enum import Enum


class DesignStyle(str, Enum):
    MODERN = "modern"
    MINIMALIST = "minimalist"
    INDUSTRIAL = "industrial"
    SCANDINAVIAN = "scandinavian"
    BOHEMIAN = "bohemian"
    TRADITIONAL = "traditional"
    JAPANDI = "japandi"
    MID_CENTURY_MODERN = "mid_century_modern"
    CONTEMPORARY = "contemporary"
    ART_DECO = "art_deco"
    COASTAL = "coastal"
    RUSTIC = "rustic"


class DesignContext(BaseModel):
    style: DesignStyle
    primary_colors: list[str] = []
    accent_colors: list[str] = []
    material_palette: list[str] = []
    lighting_mood: str = ""
    texture_preferences: list[str] = []
    overall_description: str = ""
