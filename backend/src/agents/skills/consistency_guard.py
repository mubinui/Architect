from src.models.design_context import DesignContext
from src.agents.templates.style_definitions import get_style_vocab


class ConsistencyGuard:
    def validate(self, prompt: str, context: DesignContext) -> tuple[bool, str, list[str]]:
        """
        Validate a generated prompt against the design context.
        Returns (is_valid, cleaned_prompt, warnings).
        """
        vocab = get_style_vocab(context.style.value)
        avoid_terms = vocab.get("avoid", [])
        warnings = []

        prompt_lower = prompt.lower()

        # Check for style-contradicting terms
        for term in avoid_terms:
            if term.lower() in prompt_lower:
                warnings.append(f"Found style-contradicting element: '{term}'")

        # Check that at least some style materials are referenced
        style_materials = [m.lower() for m in vocab.get("materials", [])]
        material_found = any(mat in prompt_lower for mat in style_materials)
        if not material_found and style_materials:
            warnings.append(
                f"No style-specific materials detected. Expected references to: "
                f"{', '.join(vocab['materials'][:3])}"
            )

        # Check color consistency
        if context.primary_colors:
            color_found = any(c.lower() in prompt_lower for c in context.primary_colors)
            if not color_found:
                warnings.append(
                    f"Primary colors ({', '.join(context.primary_colors)}) not referenced in prompt"
                )

        # The prompt passes if there are only minor warnings (no hard contradictions)
        hard_failures = [w for w in warnings if "contradicting" in w]
        is_valid = len(hard_failures) == 0

        return is_valid, prompt, warnings
