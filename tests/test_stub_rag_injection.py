"""StubEngine RAG-aware cited_urls — Phase 9-04+ 검증.

목적: engine=stub 모드에서도 RAG (ReferenceDocument) URL 이 cited_urls 로
노출되도록 — 인용 매칭 / Publication.cite_count 파이프라인을 실제 LLM 호출 없이
검증할 수 있게.
"""

from __future__ import annotations

import asyncio

import pytest

from src.engines.stub import StubEngine, _FIXTURE_URLS


def _q(eng, prompt):
    return asyncio.run(eng.query(prompt))


def test_default_uses_fixture_urls_only():
    """RAG 미주입 — 기존 동작 유지 (fixture URL 만 반환)."""
    eng = StubEngine()
    resp = _q(eng, "키워드: 라식\nsample_index: 0\n")
    assert resp.cited_urls == list(_FIXTURE_URLS)
    assert resp.raw_payload["rag_injected"] == 0


def test_rag_urls_appear_in_cited():
    """set_reference_urls() 후 RAG URL 이 cited_urls 에 포함."""
    eng = StubEngine()
    rag = [
        "https://medimap-blog-phi.vercel.app/blog/gangnam-lasik",
        "https://medimap-blog-phi.vercel.app/blog/lasik-guide",
        "https://medimap-blog-phi.vercel.app/blog/cataract-overview",
    ]
    eng.set_reference_urls(rag)
    resp = _q(eng, "키워드: 강남라식\nsample_index: 5\n")
    assert resp.raw_payload["rag_injected"] == 3
    # RAG URL 중 적어도 1개 등장
    rag_in_cited = [u for u in resp.cited_urls if u in rag]
    assert len(rag_in_cited) >= 1, f"RAG URL 미주입. cited={resp.cited_urls}"


def test_deterministic_same_prompt_same_cited():
    """같은 prompt → 같은 cited_urls (deterministic)."""
    eng = StubEngine()
    eng.set_reference_urls(["https://a.com", "https://b.com"])
    a = _q(eng, "키워드: 라식\nsample_index: 7\n")
    b = _q(eng, "키워드: 라식\nsample_index: 7\n")
    assert a.cited_urls == b.cited_urls


def test_different_samples_yield_different_combinations():
    """30 샘플을 돌리면 RAG URL 이 다양하게 노출 — 한쪽으로 쏠리지 않음."""
    eng = StubEngine()
    rag = [f"https://medimap-blog-phi.vercel.app/blog/post-{i}" for i in range(5)]
    eng.set_reference_urls(rag)

    seen_urls: set[str] = set()
    for sample in range(30):
        resp = _q(eng, f"키워드: 강남라식\nsample_index: {sample}\n")
        for u in resp.cited_urls:
            if u in rag:
                seen_urls.add(u)
    # 5개 RAG URL 중 3개 이상이 30샘플에서 한 번이라도 노출돼야 함
    assert len(seen_urls) >= 3, f"RAG 분산 부족. 노출된 URL: {seen_urls}"


def test_set_reference_urls_dedupes_and_strips_empty():
    eng = StubEngine()
    eng.set_reference_urls([
        "https://a.com",
        "https://a.com",  # 중복
        "",                 # 빈 값
        "https://b.com",
    ])
    resp = _q(eng, "키워드: 라식\nsample_index: 0\n")
    assert resp.raw_payload["rag_injected"] == 2  # a, b


def test_base_engine_set_reference_urls_is_noop():
    """다른 엔진(예: GeminiEngine 부모) 이 set_reference_urls 호출해도 죽지 않음."""
    from src.engines.base import BaseEngine

    class _Dummy(BaseEngine):
        name = "dummy"

        async def query(self, prompt):
            from src.engines.base import EngineResponse
            return EngineResponse(text="x")

    d = _Dummy()
    d.set_reference_urls(["https://a.com"])  # noop
    # 죽지 않으면 OK
