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

    def set_reference_urls(self, urls: list[str]) -> None:
        """RAG 컨텍스트의 URL 리스트 주입 (default noop).

        StubEngine 같은 데모 엔진은 이 URL 들을 cited_urls 로 일부 섞어 사용 →
        실제 LLM 호출 없이도 인용 매칭 / Publication.cite_count 파이프라인 검증 가능.
        실제 엔진(Gemini/Perplexity 등)은 prompt 안에 RAG context 로 주입되어 있어
        이 메서드는 무시(noop)해도 된다.
        """
        pass
