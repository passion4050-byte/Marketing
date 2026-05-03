"""Phase 6-T1.6 — OpenAI / Gemini / Claude 엔진 + factory + multi-engine 라운드 로빈.

외부 API 호출 0회 — httpx / SDK 메서드를 monkeypatch 로 mock.
"""

from __future__ import annotations

import asyncio

import pytest

from src.engines import EngineError, get_engine
from src.engines.base import EngineResponse


# ─── Factory ─────────────────────────────────────────────────────


def test_factory_openai_without_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(EngineError):
        get_engine("openai")


def test_factory_gemini_without_key_raises(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(EngineError):
        get_engine("gemini")


def test_factory_claude_without_key_raises(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(EngineError):
        get_engine("claude")


def test_factory_anthropic_alias_for_claude(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(EngineError):
        get_engine("anthropic")


# ─── OpenAIEngine — async client mock ───────────────────────────


def test_openai_engine_parses_text_and_urls(monkeypatch):
    """openai SDK AsyncOpenAI 를 mock — 응답 파싱 + URL 정규식 검증."""

    class MockMsg:
        content = (
            "강남 라식은 BGN 안과나 메디맵 안과를 추천합니다. "
            "참고: https://example.com/lasik"
        )

    class MockChoice:
        message = MockMsg()

    class MockResp:
        choices = [MockChoice()]
        id = "test-id"
        model = "gpt-4o-mini"

    class MockChat:
        class Completions:
            @staticmethod
            async def create(**kwargs):
                return MockResp()

        completions = Completions()

    class MockClient:
        def __init__(self, *a, **kw):
            self.chat = MockChat()

    import src.engines.openai_engine as oe

    monkeypatch.setattr(oe, "AsyncOpenAI", MockClient, raising=False)
    # __init__ 안에서 import openai 가 발생 — sys.modules 패치
    import sys
    import types

    fake = types.ModuleType("openai")
    fake.AsyncOpenAI = MockClient
    sys.modules["openai"] = fake

    eng = oe.OpenAIEngine(api_key="test-key")
    result = asyncio.run(eng.query("강남 라식"))
    assert isinstance(result, EngineResponse)
    assert "BGN" in result.text
    assert "https://example.com/lasik" in result.cited_urls
    assert result.latency_ms >= 0


# ─── ClaudeEngine — async client mock ───────────────────────────


def test_claude_engine_parses_text_blocks(monkeypatch):
    class MockBlock:
        def __init__(self, text):
            self.type = "text"
            self.text = text

    class MockResp:
        content = [
            MockBlock("BGN 안과 추천드립니다."),
            MockBlock("참고 URL: https://example.com/bgn"),
        ]
        model = "claude-haiku-4-5"

    class MockMessages:
        @staticmethod
        async def create(**kwargs):
            return MockResp()

    class MockClient:
        def __init__(self, *a, **kw):
            self.messages = MockMessages()

    import sys
    import types

    fake = types.ModuleType("anthropic")
    fake.AsyncAnthropic = MockClient
    sys.modules["anthropic"] = fake

    import importlib

    import src.engines.claude as cl

    importlib.reload(cl)
    monkeypatch.setattr(cl, "AsyncAnthropic", MockClient, raising=False)

    eng = cl.ClaudeEngine(api_key="test-key")
    result = asyncio.run(eng.query("강남 라식"))
    assert "BGN" in result.text
    assert "https://example.com/bgn" in result.cited_urls


# ─── GeminiEngine — sync wrap mock ──────────────────────────────


def test_gemini_engine_parses_text_and_grounding(monkeypatch):
    class MockResp:
        text = "BGN 안과를 추천드립니다. 참고: https://example.com/g"

        class _Cand:
            class _GM:
                grounding_chunks = []

            grounding_metadata = _GM()

        candidates = [_Cand()]

    class MockModel:
        def __init__(self, *a, **kw):
            pass

        def generate_content(self, prompt):
            return MockResp()

    import sys
    import types

    fake = types.ModuleType("google")
    fake_genai = types.ModuleType("google.generativeai")
    fake_genai.configure = lambda *a, **kw: None
    fake_genai.GenerativeModel = MockModel
    fake.generativeai = fake_genai
    sys.modules["google"] = fake
    sys.modules["google.generativeai"] = fake_genai

    import importlib

    import src.engines.gemini as gm

    importlib.reload(gm)

    eng = gm.GeminiEngine(api_key="test-key")
    result = asyncio.run(eng.query("강남 라식"))
    assert "BGN" in result.text
    # grounding 비어있음 → 텍스트 정규식 fallback
    assert "https://example.com/g" in result.cited_urls


# ─── Multi-engine collector — round-robin engine 분산 ───────────


def test_collector_multi_engine_round_robin():
    """list[StubEngine, dummy] 로 collect → Query.engine 컬럼 분산."""
    import asyncio

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from src.collector import collect_for_keyword
    from src.engines.base import BaseEngine, EngineResponse
    from src.engines.stub import StubEngine
    from src.storage.models import Base, Keyword, Query, Tenant

    class DummyEngine(BaseEngine):
        name = "dummy"

        async def query(self, prompt: str) -> EngineResponse:
            return EngineResponse(text="dummy 응답", cited_urls=[], latency_ms=10)

    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)

    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="라식", target_brand="메디맵", is_active=True))
        s.commit()
        kw = s.get(Keyword, 1)

    result = asyncio.run(collect_for_keyword(
        SessionLocal, 1, kw,
        [StubEngine(), DummyEngine()],
        n_samples=4, concurrency=2,
    ))
    assert result.n_total == 4
    assert result.n_success == 4

    with SessionLocal() as s:
        engines_used = {q.engine for q in s.query(Query).all()}
    assert engines_used == {"stub", "dummy"}, f"엔진 분산 실패: {engines_used}"
