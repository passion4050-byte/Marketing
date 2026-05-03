"""Search engine 추상화 — Phase 4 (MVP-0).

AI 검색엔진(Perplexity → MVP-0, OpenAI/Gemini/Claude → MVP-2)에 동일 인터페이스로 질의해
브랜드 멘션을 측정한다.

토글: ``ENGINE_PROVIDER`` 환경변수 (기본 ``stub``).
"""

from __future__ import annotations

import os

from src.engines.base import BaseEngine, EngineError, EngineResponse


def get_engine(provider_name: str | None = None) -> BaseEngine:
    """환경변수 또는 인자로 engine 선택. 기본 stub."""
    name = (provider_name or os.getenv("ENGINE_PROVIDER", "stub")).lower().strip()

    if name == "stub":
        from src.engines.stub import StubEngine

        return StubEngine()

    if name == "perplexity":
        from src.engines.perplexity import PerplexityEngine

        key = os.getenv("PERPLEXITY_API_KEY")
        if not key:
            raise EngineError("PERPLEXITY_API_KEY 미설정 — Perplexity engine 사용 불가.")
        return PerplexityEngine(api_key=key)

    if name == "openai":
        from src.engines.openai_engine import OpenAIEngine

        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise EngineError("OPENAI_API_KEY 미설정 — OpenAI engine 사용 불가.")
        return OpenAIEngine(api_key=key)

    if name == "gemini":
        from src.engines.gemini import GeminiEngine

        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise EngineError("GOOGLE_API_KEY 미설정 — Gemini engine 사용 불가.")
        return GeminiEngine(api_key=key)

    if name == "claude" or name == "anthropic":
        from src.engines.claude import ClaudeEngine

        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise EngineError("ANTHROPIC_API_KEY 미설정 — Claude engine 사용 불가.")
        return ClaudeEngine(api_key=key)

    raise EngineError(
        f"알 수 없는 ENGINE_PROVIDER: {name}. "
        "(stub | perplexity | openai | gemini | claude)"
    )


__all__ = ["BaseEngine", "EngineError", "EngineResponse", "get_engine"]
