"""BaseEngine ABC + EngineResponse — Phase 4-T1.2 (정의서 §4.1).

검색 엔진 (Perplexity/OpenAI/Gemini/Claude) 동일 인터페이스. ``query(prompt)`` 가
EngineResponse 를 반환한다. async 인 이유: Collector 가 n=30 샘플을 ``asyncio.gather``
로 병렬 호출 (concurrency=5).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class EngineError(RuntimeError):
    """Engine 호출 실패 — API 오류, 키 미설정, 응답 파싱 실패 등."""


@dataclass
class EngineResponse:
    """엔진 응답 1건. SQLite Response 행으로 곧장 매핑된다."""

    text: str
    cited_urls: list[str] = field(default_factory=list)
    latency_ms: int = 0
    raw_payload: dict = field(default_factory=dict)


class BaseEngine(ABC):
    """모든 검색 엔진의 추상 부모. 구현체는 ``name`` 과 ``query`` 만 채우면 된다."""

    name: str

    @abstractmethod
    async def query(self, prompt: str) -> EngineResponse:
        """단일 prompt 로 엔진에 1회 질의. 같은 prompt 라도 stochastic 응답."""
        raise NotImplementedError
