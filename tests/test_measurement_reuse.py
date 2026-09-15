"""Round 206c — 측정 배치 응답 재사용.

실측: 같은 배치에서 여러 병원이 같은 키워드를 가지면 같은 엔진에 글자까지 같은 질문을
다시 보냈다(측정 호출의 약 14%). 프롬프트에는 병원 정보가 없으므로 답을 공유해도 된다.
"""

from __future__ import annotations

import asyncio

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.collector import collect_for_keyword
from src.engines.base import BaseEngine, EngineResponse
from src.engines.reuse import ResponseReuseEngine, is_reused
from src.storage.models import Base, Keyword, LlmCallLog, Mention, Response, Tenant


class _CountingEngine(BaseEngine):
    """실제 엔진 흉내 — 호출 횟수만 센다. 답에는 두 병원 이름이 모두 들어 있다."""

    name = "gemini"

    def __init__(self) -> None:
        self.calls = 0

    async def query(self, prompt: str) -> EngineResponse:
        self.calls += 1
        return EngineResponse(
            text="잠실 라식 병원으로는 알파안과, 베타안과 두 곳이 자주 언급됩니다.",
            cited_urls=["https://example.com/a"],
        )


@pytest.fixture
def session_factory(monkeypatch):
    monkeypatch.setenv("MAX_DAILY_USD", "100")
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    sf = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with sf() as s:
        s.add(Tenant(id=1, name="알파안과", domain_category="안과", region="서울", business_model=""))
        s.add(Tenant(id=2, name="베타안과", domain_category="안과", region="서울", business_model=""))
        s.commit()
        s.add(Keyword(id=1, tenant_id=1, text="잠실 라식", target_brand="알파안과", is_active=True))
        s.add(Keyword(id=2, tenant_id=2, text="잠실 라식", target_brand="베타안과", is_active=True))
        s.commit()
    return sf


def test_reuse_engine_calls_vendor_once_per_prompt():
    inner = _CountingEngine()
    eng = ResponseReuseEngine(inner, {})

    first = asyncio.run(eng.query("키워드: 잠실 라식"))
    second = asyncio.run(eng.query("키워드: 잠실 라식"))
    other = asyncio.run(eng.query("키워드: 잠실 라섹"))

    assert inner.calls == 2
    assert not is_reused(first) and is_reused(second) and not is_reused(other)
    assert (eng.misses, eng.hits) == (2, 1)


def test_shared_keyword_across_tenants_one_vendor_call_but_both_tenants_measured(session_factory):
    """두 병원이 같은 키워드 → 벤더 호출 1회, 응답·멘션은 병원마다 저장, 호출 로그는 1행."""
    inner = _CountingEngine()
    cache: dict = {}

    with session_factory() as s:
        kw1, kw2 = s.get(Keyword, 1), s.get(Keyword, 2)
    for tid, kw in ((1, kw1), (2, kw2)):
        asyncio.run(collect_for_keyword(
            session_factory, tid, kw, ResponseReuseEngine(inner, cache),
            n_samples=1, concurrency=1,
        ))

    assert inner.calls == 1
    with session_factory() as s:
        assert s.query(Response).count() == 2
        targets = {m.tenant_id for m in s.query(Mention).filter(Mention.is_target == True).all()}  # noqa: E712
        assert targets == {1, 2}, "재사용한 답에서도 각 병원의 target 멘션이 추출돼야 한다"
        logs = s.query(LlmCallLog).filter(LlmCallLog.channel == "measurement").all()
        assert len(logs) == 1, "llm_call_logs 는 실제 벤더 호출만 기록해야 한다"
