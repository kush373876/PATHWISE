"""
AI Provider adapter — supports Gemini, OpenAI, and a plain HTTP fallback for Gemma/Ollama.
"""
import json
import re
from typing import Optional, Dict, Any, List
from loguru import logger
from app.core.config import settings


class AIProvider:
    """Abstract AI provider."""

    async def generate(self, prompt: str, system: str = "") -> str:
        raise NotImplementedError

    async def generate_json(self, prompt: str, system: str = "") -> Dict[str, Any]:
        text = await self.generate(prompt, system)
        return self._parse_json(text)

    def _parse_json(self, text: str) -> Dict[str, Any]:
        # Strip markdown code fences
        text = re.sub(r"```(?:json)?\s*", "", text).strip()
        text = text.rstrip("`").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Attempt to extract JSON object/array from text
            match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
        return {"raw": text}


class GeminiProvider(AIProvider):
    def __init__(self):
        try:
            import google.generativeai as genai
            api_key = settings.GEMINI_API_KEY or settings.AI_API_KEY
            if not api_key:
                raise ValueError("No Gemini API key configured")
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(settings.AI_MODEL or "gemini-1.5-flash")
            self.available = True
        except Exception as e:
            logger.warning(f"Gemini provider unavailable: {e}")
            self.available = False
            self.model = None

    async def generate(self, prompt: str, system: str = "") -> str:
        if not self.available:
            raise RuntimeError("Gemini provider not configured")
        try:
            full_prompt = f"{system}\n\n{prompt}" if system else prompt
            response = self.model.generate_content(full_prompt, request_options={"timeout": 6.0})
            return response.text
        except Exception as e:
            logger.warning(f"Gemini generation error/timeout ({e}) — falling back to mock generator")
            return await MockProvider().generate(prompt, system)


class OpenAIProvider(AIProvider):
    def __init__(self):
        try:
            from openai import OpenAI
            api_key = settings.OPENAI_API_KEY
            if not api_key:
                raise ValueError("No OpenAI API key configured")
            self.client = OpenAI(api_key=api_key)
            self.model = settings.AI_MODEL or "gpt-4o-mini"
            self.available = True
        except Exception as e:
            logger.warning(f"OpenAI provider unavailable: {e}")
            self.available = False

    async def generate(self, prompt: str, system: str = "") -> str:
        if not self.available:
            raise RuntimeError("OpenAI provider not configured")
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.3,
        )
        return response.choices[0].message.content


class HTTPProvider(AIProvider):
    """Generic HTTP provider for Gemma/Ollama or any OpenAI-compatible endpoint."""

    def __init__(self):
        try:
            import httpx
            base_url = settings.AI_BASE_URL
            if not base_url:
                raise ValueError("AI_BASE_URL not configured for HTTP provider")
            self.base_url = base_url
            self.api_key = settings.AI_API_KEY
            self.model = settings.AI_MODEL or "gemma2"
            self.client = httpx.AsyncClient(timeout=120.0)
            self.available = True
        except Exception as e:
            logger.warning(f"HTTP provider unavailable: {e}")
            self.available = False

    async def generate(self, prompt: str, system: str = "") -> str:
        if not self.available:
            raise RuntimeError("HTTP provider not configured")
        import httpx
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = {"model": self.model, "messages": messages, "stream": False}
        response = await self.client.post(
            f"{self.base_url}/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


class MockProvider(AIProvider):
    """Fallback when no AI provider is configured — returns structured placeholder responses."""

    async def generate(self, prompt: str, system: str = "") -> str:
        return "AI provider not configured. Please set GEMINI_API_KEY or another provider in your .env file."

    async def generate_json(self, prompt: str, system: str = "") -> Dict[str, Any]:
        return {"error": "AI provider not configured", "message": "Please set GEMINI_API_KEY in your .env file"}


def get_ai_provider() -> AIProvider:
    provider_name = settings.AI_PROVIDER.lower()

    if provider_name == "gemini":
        p = GeminiProvider()
        if p.available:
            return p
    elif provider_name == "openai":
        p = OpenAIProvider()
        if p.available:
            return p
    elif provider_name in ("gemma", "ollama", "http"):
        p = HTTPProvider()
        if p.available:
            return p

    # Auto-detect: try each in order
    for Cls in [GeminiProvider, OpenAIProvider, HTTPProvider]:
        p = Cls()
        if p.available:
            logger.info(f"Auto-selected AI provider: {Cls.__name__}")
            return p

    logger.warning("No AI provider available — using MockProvider")
    return MockProvider()


# Singleton
_provider: Optional[AIProvider] = None


def ai() -> AIProvider:
    global _provider
    if _provider is None:
        _provider = get_ai_provider()
    return _provider
