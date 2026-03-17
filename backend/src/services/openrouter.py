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

    async def generate_text(self, model: str, system_prompt: str, user_prompt: str) -> str:
        response = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    async def generate_image(self, model: str, prompt: str) -> str:
        response = await self.client.post(
            "/chat/completions",
            json={
                "model": model,
                "modalities": ["image", "text"],
                "messages": [
                    {"role": "user", "content": prompt},
                ],
            },
        )
        response.raise_for_status()
        data = response.json()
        return self._extract_image(data)

    def _extract_image(self, response_data: dict) -> str:
        message = response_data["choices"][0]["message"]

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
