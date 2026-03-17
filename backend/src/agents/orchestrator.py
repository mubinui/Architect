import asyncio
import logging

from src.config import Settings
from src.models.room import RoomSpec, RoomResult
from src.models.design_context import DesignContext
from src.agents.skills.spatial_reasoner import SpatialReasoner
from src.agents.skills.color_harmonizer import ColorHarmonizer
from src.agents.skills.style_coherence import StyleCoherence
from src.agents.skills.prompt_composer import PromptComposer
from src.agents.skills.consistency_guard import ConsistencyGuard
from src.agents.templates.base_room import (
    SYSTEM_PROMPT,
    MODIFICATION_SYSTEM_PROMPT,
    MODIFICATION_PROMPT_TEMPLATE,
)
from src.services.openrouter import OpenRouterClient

logger = logging.getLogger(__name__)


class DesignOrchestrator:
    def __init__(self, client: OpenRouterClient, settings: Settings):
        self.client = client
        self.settings = settings
        self.spatial = SpatialReasoner()
        self.color = ColorHarmonizer()
        self.style = StyleCoherence()
        self.composer = PromptComposer()
        self.guard = ConsistencyGuard()
        self._semaphore = asyncio.Semaphore(settings.max_concurrent_generations)

    async def generate_room(
        self, room: RoomSpec, context: DesignContext
    ) -> RoomResult:
        async with self._semaphore:
            # Stage 1: Skill pipeline — analyze and enrich
            spatial_analysis = self.spatial.analyze(room)
            color_directive = self.color.validate_and_enrich(room, context)
            style_guidance = self.style.enforce(room, context)

            # Stage 2: Compose structured prompt
            composed_prompt = self.composer.compose(
                room=room,
                context=context,
                spatial_analysis=spatial_analysis,
                color_directive=color_directive,
                style_guidance=style_guidance,
            )

            # Stage 3: Gemini enrichment — transform to architect-quality prompt
            enriched_prompt = await self.client.generate_text(
                model=self.settings.gemini_model,
                system_prompt=SYSTEM_PROMPT,
                user_prompt=composed_prompt,
            )

            # Stage 4: Consistency guard — validate enriched prompt
            is_valid, validated_prompt, warnings = self.guard.validate(
                enriched_prompt, context
            )
            if warnings:
                logger.warning(
                    "Consistency warnings for room '%s': %s",
                    room.name,
                    "; ".join(warnings),
                )

            # If hard failure, retry with original composed prompt
            if not is_valid:
                logger.warning(
                    "Consistency check failed for room '%s', retrying with tighter prompt",
                    room.name,
                )
                enriched_prompt = await self.client.generate_text(
                    model=self.settings.gemini_model,
                    system_prompt=SYSTEM_PROMPT + "\n\nPREVIOUS ATTEMPT HAD STYLE CONTRADICTIONS. Be MORE strict about adhering to the design context.",
                    user_prompt=composed_prompt,
                )
                _, validated_prompt, _ = self.guard.validate(enriched_prompt, context)

            # Stage 5: Image generation via Nano Banana 2
            image_base64 = await self.client.generate_image(
                model=self.settings.nano_banana_model,
                prompt=validated_prompt,
            )

            return RoomResult(
                room_id=room.id,
                generated_prompt=validated_prompt,
                image_base64=image_base64,
            )

    async def modify_room(
        self,
        room: RoomSpec,
        context: DesignContext,
        original_result: RoomResult,
        modification_prompt: str,
    ) -> RoomResult:
        async with self._semaphore:
            # Check modification for style coherence
            warning = self.style.check_modification(modification_prompt, context)
            if warning:
                logger.warning("Modification warning: %s", warning)

            # Build modification request
            mod_request = MODIFICATION_PROMPT_TEMPLATE.format(
                original_prompt=original_result.generated_prompt,
                style=context.style.value.replace("_", " ").title(),
                primary_colors=", ".join(context.primary_colors),
                accent_colors=", ".join(context.accent_colors),
                modification=modification_prompt,
            )

            # Generate modified prompt via Gemini
            modified_prompt = await self.client.generate_text(
                model=self.settings.gemini_model,
                system_prompt=MODIFICATION_SYSTEM_PROMPT,
                user_prompt=mod_request,
            )

            # Validate modified prompt
            is_valid, validated_prompt, warnings = self.guard.validate(
                modified_prompt, context
            )
            if warnings:
                logger.warning("Modification consistency warnings: %s", "; ".join(warnings))

            # Generate image
            image_base64 = await self.client.generate_image(
                model=self.settings.nano_banana_model,
                prompt=validated_prompt,
            )

            new_history = original_result.modification_history + [modification_prompt]

            return RoomResult(
                room_id=room.id,
                generated_prompt=validated_prompt,
                image_base64=image_base64,
                generation_number=original_result.generation_number + 1,
                modification_history=new_history,
            )

    async def generate_batch(
        self,
        rooms: list[RoomSpec],
        context: DesignContext,
    ) -> list[RoomResult | Exception]:
        tasks = [self.generate_room(room, context) for room in rooms]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
