"""OpenAIEngine — Phase 6-T1.1.

OpenAI ``chat/completions`` API 를 사용해 의료/안과 정보를 답변받는다.
순수 search 기능은 없으나 모델의 사전 학습 지식 기반으로 한국어 답변을 생성한다.

cited_urls: 응답 텍스트의 URL 정규식 추출 (검색 미지원 모델 fallback).

모델: ``gpt-4o-mini`` 기본 (OPENAI_MODEL env 로 override).
"""

from __future__ import annotations

import os
import re
import time

from src.engines.base import BaseEngine, EngineError, EngineResponse


_DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
_DEFAULT_TIMEOUT = 30.0
_URL_RE = re.compile(r"https?://[\w./%~?&=#:+-]+")


class OpenAIEngine(BaseEngine):
    name = "openai"

    def __init__(
        self,
        api_key: str,
        *,
        model: str = _DEFAULT_MODEL,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> None:
        if not api_key:
            raise EngineError("OPENAI_API_KEY 미설정")
        try:
            from openai import AsyncOpenAI
        except ImportError as e:  # pragma: no cover
            raise EngineError(f"openai 패키지 미설치: {e}") from e
        self._client = AsyncOpenAI(api_key=api_key, timeout=timeout)
        self._model = model

    async def query(self, prompt: str) -> EngineResponse:
        start = time.perf_counter()
        try:
            resp = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "당신은 한국어로 의료/안과 등 분야의 일반 정보를 자연스럽게 정리하는 "
                            "도우미입니다. 사실 기반으로 답변하고, 알려진 의료기관 이름이 있다면 "
                            "자연스럽게 언급하세요."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )
        except Exception as e:
            raise EngineError(f"OpenAI 호출 실패: {e}") from e

        latency_ms = int((time.perf_counter() - start) * 1000)

        try:
            text = resp.choices[0].message.content or ""
        except (AttributeError, IndexError) as e:
            raise EngineError(f"OpenAI 응답 파싱 실패: {e}") from e

        cited_urls = list(dict.fromkeys(_URL_RE.findall(text)))[:10]

        return EngineResponse(
            text=text,
            cited_urls=cited_urls,
            latency_ms=latency_ms,
            raw_payload={
                "id": getattr(resp, "id", None),
                "model": getattr(resp, "model", self._model),
            },
        )
