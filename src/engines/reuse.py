"""Round 206c (2026-09-15) — 측정 배치 안에서 같은 질문의 엔진 응답을 재사용한다.

왜 필요한가:
    측정 프롬프트(`src.collector.collect.build_prompt`)는 **키워드 문장 + sample_index + 언어별 안내문**
    뿐이고 병원 정보가 들어가지 않는다. 그런데 배치는 (병원, 키워드) 행마다 엔진을 부르므로,
    여러 병원이 같은 키워드("라식" 등)를 가지면 **같은 엔진에 글자까지 같은 질문**을 다시 보낸다.
    실측(2026-09-12~15, llm_call_logs measurement): 한 배치 시간대 안에서만 하루 40~70건,
    측정 호출의 약 14% 가 이런 중복이었다.

    같은 질문에 대한 답은 병원과 무관한 한 번의 표본이다. 병원별 멘션 추출은 그 답 텍스트에
    병원별 브랜드·별칭을 대입해서 하므로(collect_for_keyword), 답을 공유해도 측정의 의미는
    바뀌지 않는다 — API 호출만 줄어든다.

⚠ StubEngine 에는 쓰지 말 것: stub 은 `set_reference_urls` 로 **병원별 URL 을 응답에 섞기** 때문에
   병원마다 답이 달라야 한다. 실제 엔진은 이 메서드가 noop 이라 재사용해도 안전하다.
"""

from __future__ import annotations

from dataclasses import replace

from src.engines.base import BaseEngine, EngineResponse

REUSED_FLAG = "reused_from_batch_cache"


class ResponseReuseEngine(BaseEngine):
    """같은 (엔진, 프롬프트) 의 성공 응답을 배치 캐시에서 돌려주는 래퍼.

    실패(EngineError)는 캐시하지 않는다 — 다음 병원 행에서 다시 시도한다.
    재사용된 응답은 ``raw_payload[REUSED_FLAG] = True`` 로 표시되어, 수집기가
    실제 호출이 아니었음을 알고 LlmCallLog·비용을 기록하지 않는다.
    """

    def __init__(self, inner: BaseEngine, cache: dict[tuple[str, str], EngineResponse]):
        self._inner = inner
        self._cache = cache
        self.name = inner.name
        self.hits = 0    # 재사용으로 아낀 호출 수 (배치 끝 로그용)
        self.misses = 0  # 실제로 벤더에 보낸 호출 수

    @property
    def inner(self) -> BaseEngine:
        return self._inner

    async def query(self, prompt: str) -> EngineResponse:
        key = (self.name, prompt)
        hit = self._cache.get(key)
        if hit is not None:
            self.hits += 1
            return replace(
                hit,
                cited_urls=list(hit.cited_urls),
                raw_payload={**(hit.raw_payload or {}), REUSED_FLAG: True},
            )
        self.misses += 1
        resp = await self._inner.query(prompt)
        self._cache[key] = resp
        return resp

    def set_reference_urls(self, urls: list[str]) -> None:
        self._inner.set_reference_urls(urls)


def is_reused(resp: EngineResponse) -> bool:
    return bool((resp.raw_payload or {}).get(REUSED_FLAG))
