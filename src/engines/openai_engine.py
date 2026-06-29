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


# Round 103 (2026-06-29): 웹검색 모델 기본값 — 일반 gpt-4o-mini 는 검색을 안 해
#   응답에 source URL 이 없어 cited_urls=0 이었음(엔진별 인용 0건 원인).
#   search-preview 모델은 web_search_options 지원 → message.annotations 로 url_citation 제공.
_DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini-search-preview")
_FALLBACK_MODEL = os.getenv("OPENAI_FALLBACK_MODEL", "gpt-4o-mini")
_DEFAULT_TIMEOUT = 45.0
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
        system = (
            "당신은 한국어로 의료/안과 등 분야의 정보를 자연스럽게 정리하는 도우미입니다. "
            "최신 정보와 실제 의료기관·출처를 웹에서 확인해 사실 기반으로 답변하고, "
            "알려진 의료기관 이름이 있다면 자연스럽게 언급하세요."
        )
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ]
        start = time.perf_counter()
        text = ""
        cited: list[str] = []
        used_model = self._model
        try:
            # 1) 웹검색 모델 — annotations(url_citation) 로 실제 source URL 제공.
            #    search-preview 모델은 temperature 등 일부 샘플링 파라미터 미지원 → 전달 금지.
            try:
                resp = await self._client.chat.completions.create(
                    model=self._model,
                    messages=messages,
                    max_tokens=1000,
                    web_search_options={},
                )
                msg = resp.choices[0].message
                text = msg.content or ""
                for ann in (getattr(msg, "annotations", None) or []):
                    uc = getattr(ann, "url_citation", None)
                    u = None
                    if uc is not None:
                        u = getattr(uc, "url", None)
                    elif isinstance(ann, dict):
                        u = (ann.get("url_citation") or {}).get("url")
                    if u:
                        cited.append(u)
            except Exception:
                # 2) 검색모델 미지원/오류 → 일반 모델 폴백 (URL 정규식만)
                used_model = _FALLBACK_MODEL
                resp = await self._client.chat.completions.create(
                    model=_FALLBACK_MODEL,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000,
                )
                text = resp.choices[0].message.content or ""
        except Exception as e:
            raise EngineError(f"OpenAI 호출 실패: {e}") from e

        latency_ms = int((time.perf_counter() - start) * 1000)
        if not text:
            raise EngineError("OpenAI 응답 빈 본문")
        if not cited:
            cited = _URL_RE.findall(text)
        cited = list(dict.fromkeys(cited))[:10]

        return EngineResponse(
            text=text,
            cited_urls=cited,
            latency_ms=latency_ms,
            raw_payload={
                "id": getattr(resp, "id", None),
                "model": getattr(resp, "model", used_model),
            },
        )
