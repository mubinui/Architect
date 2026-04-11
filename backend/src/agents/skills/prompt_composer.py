from src.models.room import RoomSpec, BlueprintElement
from src.models.design_context import DesignContext
from src.agents.templates.base_room import ROOM_PROMPT_TEMPLATE

# The editor board is 600px wide; height scales with room ratio
_EDITOR_BOARD_W = 600.0


def _element_position(el: BlueprintElement, board_w: float, board_h: float) -> str:
    """Convert pixel x,y coordinates to human-readable compass position."""
    cx = (el.x + el.w / 2) / board_w   # 0=left/west, 1=right/east
    cy = (el.y + el.h / 2) / board_h   # 0=top/north, 1=bottom/south

    # Vertical zone
    if cy < 0.25:
        v = "north wall"
    elif cy < 0.42:
        v = "northern half"
    elif cy < 0.58:
        v = "center"
    elif cy < 0.75:
        v = "southern half"
    else:
        v = "south wall"

    # Horizontal zone
    if cx < 0.25:
        h = "west side"
    elif cx < 0.42:
        h = "left-center"
    elif cx < 0.58:
        h = "center"
    elif cx < 0.75:
        h = "right-center"
    else:
        h = "east side"

    # Corner shorthand
    if cy < 0.25 and cx < 0.25:
        return "northwest corner"
    if cy < 0.25 and cx > 0.75:
        return "northeast corner"
    if cy > 0.75 and cx < 0.25:
        return "southwest corner"
    if cy > 0.75 and cx > 0.75:
        return "southeast corner"

    # Walls
    if cy < 0.25:
        return f"against the north wall, {h}"
    if cy > 0.75:
        return f"against the south wall, {h}"
    if cx < 0.25:
        return f"against the west wall, {v}"
    if cx > 0.75:
        return f"against the east wall, {v}"

    return f"{v}, {h} of the room"


def _build_spatial_layout(room: RoomSpec) -> str:
    """Convert blueprint_elements to a precise spatial description."""
    elements = room.blueprint_elements
    if not elements:
        return ""

    # Calculate board height from room ratio
    ratio = room.dimensions.width / room.dimensions.length
    board_h = _EDITOR_BOARD_W / ratio

    lines = ["", "SPATIAL LAYOUT FROM FLOORPLAN (STRICTLY FOLLOW THIS — do not relocate any item):"]
    for el in elements:
        pos = _element_position(el, _EDITOR_BOARD_W, board_h)
        lines.append(f"- {el.label}: {pos}")

    lines.append(
        "Camera angle: position viewer at a diagonal corner (3/4 perspective) "
        "that shows both the north/west walls to reveal the full spatial arrangement above."
    )
    return "\n".join(lines)


class PromptComposer:
    def compose(
        self,
        room: RoomSpec,
        context: DesignContext,
        spatial_analysis: str,
        color_directive: str,
        style_guidance: str,
        catalog_descriptions: list[str] | None = None,
    ) -> str:
        furniture_desc = (
            ", ".join(room.furniture_preferences)
            if room.furniture_preferences
            else "style-appropriate furnishings"
        )

        # Append catalog item descriptions to notes
        notes_parts = [room.notes] if room.notes else []
        if catalog_descriptions:
            notes_parts.append(
                "SELECTED PRODUCTS (incorporate these specific items into the design): "
                + "; ".join(catalog_descriptions)
            )

        # Build spatial layout section from blueprint elements
        spatial_layout = _build_spatial_layout(room)

        return ROOM_PROMPT_TEMPLATE.format(
            style=context.style.value.replace("_", " ").title(),
            primary_colors=", ".join(context.primary_colors) if context.primary_colors else "neutral palette",
            accent_colors=", ".join(context.accent_colors) if context.accent_colors else "subtle accents",
            materials=", ".join(context.material_palette) if context.material_palette else "style-appropriate materials",
            lighting_mood=context.lighting_mood or "warm ambient lighting with natural light",
            textures=", ".join(context.texture_preferences) if context.texture_preferences else "style-consistent textures",
            overall_description=context.overall_description or f"A cohesive {context.style.value.replace('_', ' ')} interior design",
            room_type=room.room_type.value.replace("_", " ").title(),
            room_name=room.name,
            width=room.dimensions.width,
            length=room.dimensions.length,
            height=room.dimensions.height,
            spatial_analysis=spatial_analysis,
            color_directive=color_directive,
            style_guidance=style_guidance,
            furniture=furniture_desc,
            notes="; ".join(notes_parts) if notes_parts else "None",
            spatial_layout=spatial_layout,
        )
