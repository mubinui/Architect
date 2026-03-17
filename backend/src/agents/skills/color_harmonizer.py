from src.models.room import RoomSpec
from src.models.design_context import DesignContext


# Color associations for different room types
ROOM_COLOR_SUGGESTIONS: dict[str, list[str]] = {
    "bedroom": ["soft neutrals", "muted tones", "calming blues", "warm whites"],
    "kitchen": ["clean whites", "warm wood tones", "sage green", "navy accents"],
    "bathroom": ["whites", "soft grays", "spa greens", "natural stone tones"],
    "living_room": ["warm neutrals", "earth tones", "accent wall colors", "rich textures"],
    "dining_room": ["warm tones", "deep accent colors", "candlelight warmth", "rich wood"],
    "office": ["focus-friendly neutrals", "energizing accents", "natural greens", "clean whites"],
    "hallway": ["light and airy tones", "continuity colors from adjacent rooms"],
    "balcony": ["outdoor naturals", "weather-friendly tones", "plant greens"],
    "guest_room": ["welcoming neutrals", "soft pastels", "crisp whites"],
    "kids_room": ["playful brights", "soft pastels", "cheerful accents"],
    "laundry": ["clean whites", "light blues", "practical tones"],
    "closet": ["light neutrals", "warm whites", "soft lighting tones"],
}


class ColorHarmonizer:
    def validate_and_enrich(self, room: RoomSpec, context: DesignContext) -> str:
        room_colors = room.color_preferences
        project_primary = context.primary_colors
        project_accent = context.accent_colors

        parts = []

        # If room has specific colors, validate against project palette
        if room_colors:
            parts.append(f"Room-specific colors: {', '.join(room_colors)}")
            parts.append(
                f"integrated with the project palette of {', '.join(project_primary)} "
                f"with {', '.join(project_accent)} accents"
            )
        else:
            # Derive colors from project palette + room type suggestions
            suggestions = ROOM_COLOR_SUGGESTIONS.get(room.room_type.value, ["warm neutrals"])
            parts.append(
                f"Using project primary palette: {', '.join(project_primary)}. "
                f"Accent with: {', '.join(project_accent)}. "
                f"Suggested room-appropriate tones: {', '.join(suggestions[:2])}"
            )

        # Add material color interaction
        if context.material_palette:
            parts.append(
                f"Material tones to harmonize with: {', '.join(context.material_palette)}"
            )

        return ". ".join(parts)
