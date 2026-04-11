import httpx
import base64
import re


class OpenRouterClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=120.0,
        )

    async def generate_text(
        self, model: str, system_prompt: str, user_prompt: str,
        reference_images: list[str] | None = None,
    ) -> str:
        # Build multi-modal content if reference images exist
        if reference_images:
            content_parts: list[dict] = [{"type": "text", "text": user_prompt}]
            for img_url in reference_images:
                if img_url and (img_url.startswith("data:image") or img_url.startswith("http")):
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": img_url},
                    })
            user_message = {"role": "user", "content": content_parts}
        else:
            user_message = {"role": "user", "content": user_prompt}

        response = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    user_message,
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def generate_image(
        self, model: str, prompt: str,
        reference_images: list[str] | None = None,
    ) -> str:
        """Generate an image from a text prompt, optionally with reference images.
        
        reference_images: list of base64 data URLs (data:image/...;base64,...)
        """
        # Build multimodal content if reference images exist
        if reference_images:
            content_parts: list[dict] = []
            content_parts.append({"type": "text", "text": prompt})
            for img_url in reference_images:
                if img_url and (img_url.startswith("data:image") or img_url.startswith("http")):
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": img_url},
                    })
            messages = [{"role": "user", "content": content_parts}]
        else:
            messages = [{"role": "user", "content": prompt}]

        response = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "modalities": ["image", "text"],
                "messages": messages,
            },
        )
        response.raise_for_status()
        data = response.json()
        return self._extract_image(data)

    def _extract_image(self, response_data: dict) -> str:
        message = response_data["choices"][0]["message"]

        # Check for images array (OpenRouter / Gemini image generation format)
        images = message.get("images", [])
        if images:
            for img in images:
                if isinstance(img, dict):
                    if img.get("type") == "image_url":
                        return img["image_url"]["url"]
                    if img.get("type") == "image":
                        b64 = img.get("data", img.get("source", {}).get("data", ""))
                        mime = img.get("mime_type", "image/png")
                        return f"data:{mime};base64,{b64}"
                elif isinstance(img, str) and img.startswith("data:image"):
                    return img

        # Check for inline_data in parts (Gemini format)
        if "parts" in message:
            for part in message["parts"]:
                if "inline_data" in part:
                    mime = part["inline_data"].get("mime_type", "image/png")
                    b64 = part["inline_data"]["data"]
                    return f"data:{mime};base64,{b64}"

        # Check for content as array (OpenRouter format)
        content = message.get("content", "")
        if isinstance(content, list):
            for item in content:
                if item.get("type") == "image_url":
                    return item["image_url"]["url"]
                if item.get("type") == "image":
                    b64 = item.get("data", item.get("source", {}).get("data", ""))
                    mime = item.get("mime_type", "image/png")
                    return f"data:{mime};base64,{b64}"

        # Check if content is a data URL string
        if isinstance(content, str) and content.startswith("data:image"):
            return content

        # Try to find base64 image in text content
        if isinstance(content, str):
            match = re.search(r"data:image/[^;]+;base64,[A-Za-z0-9+/=]+", content)
            if match:
                return match.group(0)

        raise ValueError("No image found in response")

    async def close(self):
        await self.client.aclose()
