"""PerplexityEngine — Phase 4-T1.3.

Perplexity 의 ``chat/completions`` API 를 사용해 키워드에 대한 AI 검색 응답을 받는다.
응답에서 ``choices[0].message.content`` → text, ``citations`` 리스트 → cited_urls.

API 문서: https://docs.perplexity.ai/api-reference/chat-completions
모델: ``llama-3.1-sonar-small-128k-online`` 기본 (저비용 + 검색).
"""

from __future__ import annotations

import os
import time

import httpx

from src.engines.base import BaseEngine, EngineError, EngineResponse


_PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions"
_DEFAULT_MODEL = os.getenv("PERPLEXITY_MODEL", "llama-3.1-sonar-small-128k-online")
_DEFAULT_TIMEOUT = 30.0


class PerplexityEngine(BaseEngine):
    """Perplexity Online 검색 엔진 — citation 포함 응답."""

    name = "perplexity"

    def __init__(
        self,
        api_key: str,
        *,
        model: str = _DEFAULT_MODEL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise EngineError("PERPLEXITY_API_KEY 미설정")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    async def query(self, prompt: str) -> EngineResponse:
        payload = {
            "model": self._model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "당신은 의료/안과 관련 검색 결과를 정리하는 도우미입니다. "
                        "사실 기반으로 한국어로 답변하고, 출처를 인용하세요."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(_PERPLEXITY_ENDPOINT, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as e:
            raise EngineError(
                f"Perplexity API HTTP {e.response.status_code}: {e.response.text[:200]}"
            ) from e
        except httpx.HTTPError as e:
            raise EngineError(f"Perplexity 호출 실패: {e}") from e
        latency_ms = int((time.perf_counter() - start) * 1000)

        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as e:
            raise EngineError(f"Perplexity 응답 파싱 실패: {data}") from e

        # citations: 최신 API는 응답 루트에 `citations: [str]` 또는 `references` 로 옴
        cited = data.get("citations") or data.get("references") or []
        if isinstance(cited, list):
            cited_urls = [c if isinstance(c, str) else (c.get("url") or "") for c in cited]
            cited_urls = [u for u in cited_urls if u]
        else:
            cited_urls = []

        return EngineResponse(
            text=text or "",
            cited_urls=cited_urls,
            latency_ms=latency_ms,
            raw_payload=data if isinstance(data, dict) else {},
        )
