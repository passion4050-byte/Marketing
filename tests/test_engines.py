"""Phase 4-T1.5 — engine 추상화 / Stub / Perplexity (mocked) pytest.

실 외부 API 호출 0회. PerplexityEngine 은 httpx mock 으로 검증.
"""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from src.engines import EngineError, EngineResponse, get_engine
from src.engines.base import BaseEngine
from src.engines.perplexity import PerplexityEngine
from src.engines.stub import StubEngine


# ─── BaseEngine / EngineResponse 형식 ─────────────────────────────


def test_engine_response_dataclass_defaults():
    r = EngineResponse(text="hi")
    assert r.text == "hi"
    assert r.cited_urls == []
    assert r.latency_ms == 0
    assert r.raw_payload == {}


def test_base_engine_is_abstract():
    """BaseEngine 직접 인스턴스화 불가 — query 추상 메서드."""
    with pytest.raises(TypeError):
        BaseEngine()  # type: ignore[abstract]


# ─── StubEngine 결정론 / 형식 ───────────────────────────────────


def test_stub_engine_query_returns_engine_response():
    e = StubEngine()
    r = asyncio.run(e.query("키워드: 테스트\nsample_index: 0"))
    assert isinstance(r, EngineResponse)
    assert e.name == "stub"
    assert len(r.text) > 50  # 의미 있는 응답
    assert isinstance(r.cited_urls, list) and len(r.cited_urls) > 0
    assert 200 <= r.latency_ms <= 800


def test_stub_engine_deterministic_for_same_prompt():
    e = StubEngine()
    r1 = asyncio.run(e.query("키워드: 강남 라식"))
    r2 = asyncio.run(e.query("키워드: 강남 라식"))
    assert r1.text == r2.text
    assert r1.latency_ms == r2.latency_ms


def test_stub_engine_different_prompts_yield_variation():
    e = StubEngine()
    r1 = asyncio.run(e.query("키워드: 강남 라식"))
    r2 = asyncio.run(e.query("키워드: 서울 백내장"))
    # 다른 키워드 → 다른 본문 (template_idx 또는 keyword 치환 차이)
    assert r1.text != r2.text


def test_stub_engine_response_contains_brand_mentions():
    """StubEngine 응답에 의료 브랜드명 포함 — Mention extractor 검증용."""
    e = StubEngine()
    r = asyncio.run(e.query("키워드: 라식 후기"))
    # 견본에 들어있는 브랜드 중 하나라도 등장
    brands = ["메디맵", "BGN", "누네"]
    assert any(b in r.text for b in brands), f"브랜드 미포함: {r.text[:200]}"


# ─── Factory ────────────────────────────────────────────────────


def test_factory_returns_stub_by_default(monkeypatch):
    monkeypatch.delenv("ENGINE_PROVIDER", raising=False)
    e = get_engine()
    assert e.name == "stub"


def test_factory_explicit_stub(monkeypatch):
    monkeypatch.setenv("ENGINE_PROVIDER", "stub")
    e = get_engine()
    assert e.name == "stub"


def test_factory_perplexity_without_key_raises(monkeypatch):
    monkeypatch.delenv("PERPLEXITY_API_KEY", raising=False)
    with pytest.raises(EngineError):
        get_engine("perplexity")


def test_factory_unknown_provider_raises():
    with pytest.raises(EngineError):
        get_engine("unknown_xyz")


# ─── PerplexityEngine — httpx mock ──────────────────────────────


def _mock_perplexity_response(text: str = "응답 본문", citations=None) -> dict:
    return {
        "id": "test-1",
        "model": "llama-3.1-sonar-small-128k-online",
        "choices": [{"message": {"content": text, "role": "assistant"}}],
        "citations": citations or ["https://example.com/a", "https://example.com/b"],
    }


def test_perplexity_engine_parses_text_and_citations(monkeypatch):
    """API 호출을 mock — 응답 파싱 + cited_urls 추출 검증."""

    captured_payload = {}

    class MockResponse:
        def __init__(self, data):
            self._data = data
            self.status_code = 200
            self.text = json.dumps(data)

        def json(self):
            return self._data

        def raise_for_status(self):
            return None

    class MockAsyncClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def post(self, url, json=None, headers=None):
            captured_payload["url"] = url
            captured_payload["body"] = json
            captured_payload["headers"] = headers
            return MockResponse(
                _mock_perplexity_response(
                    text="강남 라식 잘하는 곳에 대한 정보입니다. BGN 안과가 추천됩니다.",
                    citations=[
                        "https://blog.naver.com/example/1",
                        {"url": "https://example.com/2"},
                    ],
                )
            )

    monkeypatch.setattr(httpx, "AsyncClient", MockAsyncClient)

    eng = PerplexityEngine(api_key="test-key")
    result = asyncio.run(eng.query("강남 라식 잘하는 곳"))

    assert result.text.startswith("강남 라식")
    assert "BGN" in result.text
    assert result.cited_urls == [
        "https://blog.naver.com/example/1",
        "https://example.com/2",
    ]
    assert result.latency_ms >= 0
    # API 요청 형식 검증
    assert captured_payload["url"].endswith("/chat/completions")
    assert captured_payload["headers"]["Authorization"].startswith("Bearer test-key")
    assert captured_payload["body"]["model"]
    assert any(m["role"] == "user" for m in captured_payload["body"]["messages"])


def test_perplexity_engine_http_error_raises_engine_error(monkeypatch):
    class MockResponse:
        status_code = 401
        text = '{"error":"unauthorized"}'

        def json(self):
            return {"error": "unauthorized"}

        def raise_for_status(self):
            req = httpx.Request("POST", "https://api.perplexity.ai/chat/completions")
            raise httpx.HTTPStatusError(
                "401 Unauthorized",
                request=req,
                response=httpx.Response(401, request=req),
            )

    class MockAsyncClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return None

        async def post(self, *a, **kw):
            return MockResponse()

    monkeypatch.setattr(httpx, "AsyncClient", MockAsyncClient)

    eng = PerplexityEngine(api_key="bad-key")
    with pytest.raises(EngineError):
        asyncio.run(eng.query("anything"))


def test_perplexity_engine_init_without_key_raises():
    with pytest.raises(EngineError):
        PerplexityEngine(api_key="")
