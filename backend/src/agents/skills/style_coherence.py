from src.models.room import RoomSpec
from src.models.design_context import DesignContext
from src.agents.templates.style_definitions import get_style_vocab


class StyleCoherence:
    def enforce(self, room: RoomSpec, context: DesignContext) -> str:
        vocab = get_style_vocab(context.style.value)
        style_name = context.style.value.replace("_", " ").title()

        parts = [f"Style: {style_name}"]

        # Build style guidance from vocabulary
        parts.append(f"Preferred materials: {', '.join(vocab['materials'][:3])}")
        parts.append(f"Design language: {', '.join(vocab['shapes'][:3])}")
        parts.append(f"Texture vocabulary: {', '.join(vocab['textures'][:2])}")

        # Check furniture preferences against style
        warnings = self._check_furniture_coherence(room.furniture_preferences, vocab)
        if warnings:
            parts.append(f"Style adaptations: {'; '.join(warnings)}")

        # Add style-specific furniture suggestions if room has none
        if not room.furniture_preferences:
            room_type = room.room_type.value
            style_furniture = self._suggest_furniture(room_type, vocab)
            if style_furniture:
                parts.append(f"Suggested style-appropriate furniture: {style_furniture}")

        # Add avoidance guidance
        if vocab.get("avoid"):
            parts.append(f"Avoid: {', '.join(vocab['avoid'][:3])}")

        return ". ".join(parts)

    def check_modification(self, modification: str, context: DesignContext) -> str | None:
        vocab = get_style_vocab(context.style.value)
        avoid_terms = vocab.get("avoid", [])

        conflicts = []
        mod_lower = modification.lower()
        for term in avoid_terms:
            if term.lower() in mod_lower:
                conflicts.append(term)

        if conflicts:
            style_name = context.style.value.replace("_", " ").title()
            return (
                f"Warning: The modification references '{', '.join(conflicts)}' "
                f"which conflicts with the {style_name} design style. "
                f"The modification will be adapted to maintain consistency."
            )
        return None

    def _check_furniture_coherence(
        self, furniture: list[str], vocab: dict[str, list[str]]
    ) -> list[str]:
        warnings = []
        avoid_terms = [t.lower() for t in vocab.get("avoid", [])]

        for item in furniture:
            item_lower = item.lower()
            for avoid in avoid_terms:
                if avoid in item_lower:
                    style_alternatives = vocab.get("furniture", [])
                    alt = style_alternatives[0] if style_alternatives else "style-appropriate alternative"
                    warnings.append(f"'{item}' may not fit the style — consider {alt}")
                    break
        return warnings

    def _suggest_furniture(self, room_type: str, vocab: dict[str, list[str]]) -> str:
        style_furniture = vocab.get("furniture", [])
        if style_furniture:
            return ", ".join(style_furniture[:2])
        return ""
