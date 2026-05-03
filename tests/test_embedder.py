"""Phase 3-T1.5 — embedder pytest.

Stub 결정론, dim 일치, factory 동작, 빈 입력 처리만 검증.
실제 외부 호출 (Gemini/OpenAI) 은 키 + 비용이 들어 별도 integration 테스트로 분리.
"""

from __future__ import annotations

import pytest

from src.reference.embedder import (
    EmbedderError,
    StubEmbedder,
    get_embedder,
)


def test_stub_embedder_is_deterministic():
    e = StubEmbedder()
    v1 = e.embed(["백내장 수정체"])[0]
    v2 = e.embed(["백내장 수정체"])[0]
    assert v1 == v2


def test_stub_embedder_dim_matches_attribute():
    e = StubEmbedder()
    vecs = e.embed(["test", "또 다른 입력"])
    assert len(vecs) == 2
    for v in vecs:
        assert len(v) == e.dim
        assert e.dim == 128


def test_stub_embedder_l2_normalized():
    e = StubEmbedder()
    v = e.embed(["임의의 한국어 입력"])[0]
    norm = sum(x * x for x in v) ** 0.5
    assert abs(norm - 1.0) < 1e-5


def test_stub_embedder_handles_empty_string():
    e = StubEmbedder()
    vecs = e.embed([""])
    assert len(vecs) == 1
    assert len(vecs[0]) == e.dim


def test_stub_embedder_handles_empty_list():
    e = StubEmbedder()
    assert e.embed([]) == []


def test_factory_returns_stub_by_default(monkeypatch):
    monkeypatch.delenv("EMBEDDING_PROVIDER", raising=False)
    e = get_embedder()
    assert e.name == "stub"
    assert e.dim == 128


def test_factory_unknown_provider_raises(monkeypatch):
    with pytest.raises(EmbedderError):
        get_embedder("unknown_provider_xyz")


def test_factory_gemini_without_key_raises(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    with pytest.raises(EmbedderError):
        get_embedder("gemini")


def test_factory_openai_without_key_raises(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(EmbedderError):
        get_embedder("openai")
