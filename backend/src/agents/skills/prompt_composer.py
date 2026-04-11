from src.models.room import RoomSpec
from src.models.design_context import DesignContext
from src.agents.templates.base_room import ROOM_PROMPT_TEMPLATE


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
        furniture_desc = ", ".join(room.furniture_preferences) if room.furniture_preferences else "style-appropriate furnishings"

        # Append catalog item descriptions to furniture/notes
        notes_parts = [room.notes] if room.notes else []
        if catalog_descriptions:
            notes_parts.append(
                "SELECTED PRODUCTS (incorporate these specific items into the design): "
                + "; ".join(catalog_descriptions)
            )

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
        )
