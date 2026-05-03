"""GeminiEngine — Phase 6-T1.2.

Google Gemini API 를 사용해 의료/안과 정보를 답변. ``google-generativeai`` 라이브러리.

cited_urls 추출 시도 순서:
1. ``response.candidates[0].grounding_metadata.grounding_chunks[].web.uri`` (Search Grounding)
2. ``response.candidates[0].citation_metadata.citation_sources[].uri``
3. 응답 텍스트의 URL 정규식

모델: ``gemini-2.5-flash`` 기본 (GEMINI_MODEL env).
"""

from __future__ import annotations

import asyncio
import os
import re
import time

from src.engines.base import BaseEngine, EngineError, EngineResponse


_DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
_URL_RE = re.compile(r"https?://[\w./%~?&=#:+-]+")


class GeminiEngine(BaseEngine):
    name = "gemini"

    def __init__(self, api_key: str, *, model: str = _DEFAULT_MODEL) -> None:
        if not api_key:
            raise EngineError("GOOGLE_API_KEY 미설정")
        try:
            import google.generativeai as genai
        except ImportError as e:  # pragma: no cover
            raise EngineError(f"google-generativeai 미설치: {e}") from e
        genai.configure(api_key=api_key)
        self._genai = genai
        self._model_name = model

    async def query(self, prompt: str) -> EngineResponse:
        # google-generativeai 는 동기 API. asyncio.to_thread 로 wrap.
        start = time.perf_counter()
        try:
            response = await asyncio.to_thread(self._sync_query, prompt)
        except Exception as e:
            raise EngineError(f"Gemini 호출 실패: {e}") from e
        latency_ms = int((time.perf_counter() - start) * 1000)

        text, cited = self._extract_text_and_citations(response)
        if not text:
            raise EngineError(f"Gemini 응답 빈 본문: {response}")

        return EngineResponse(
            text=text,
            cited_urls=cited,
            latency_ms=latency_ms,
            raw_payload={"model": self._model_name},
        )

    def _sync_query(self, prompt: str):
        # tools 인자가 라이브러리 버전마다 시그니처가 달라 try/except 로 graceful
        system_msg = (
            "당신은 한국어로 의료/안과 정보를 정리하는 도우미입니다. "
            "사실 기반으로 답변하고 의료기관 이름은 자연스럽게 언급하세요."
        )
        try:
            model = self._genai.GenerativeModel(
                model_name=self._model_name,
                system_instruction=system_msg,
                tools=[{"google_search_retrieval": {}}],
            )
            return model.generate_content(prompt)
        except Exception:
            # tools 미지원 모델/SDK 버전 → 일반 호출
            model = self._genai.GenerativeModel(
                model_name=self._model_name,
                system_instruction=system_msg,
            )
            return model.generate_content(prompt)

    @staticmethod
    def _extract_text_and_citations(response) -> tuple[str, list[str]]:
        text = ""
        cited: list[str] = []

        # 1) text 추출 — 다양한 SDK 버전 호환
        if hasattr(response, "text") and response.text:
            text = response.text
        else:
            try:
                text = response.candidates[0].content.parts[0].text or ""
            except Exception:
                text = ""

        # 2) Grounding metadata
        try:
            gm = response.candidates[0].grounding_metadata
            if gm and getattr(gm, "grounding_chunks", None):
                for ch in gm.grounding_chunks:
                    web = getattr(ch, "web", None)
                    uri = getattr(web, "uri", None) if web else None
                    if uri:
                        cited.append(uri)
        except Exception:
            pass

        # 3) Citation metadata fallback
        if not cited:
            try:
                cm = response.candidates[0].citation_metadata
                if cm and getattr(cm, "citation_sources", None):
                    for cs in cm.citation_sources:
                        uri = getattr(cs, "uri", None)
                        if uri:
                            cited.append(uri)
            except Exception:
                pass

        # 4) 텍스트 정규식 폴백
        if not cited and text:
            cited = list(dict.fromkeys(_URL_RE.findall(text)))[:10]

        # dedupe + 길이 제한
        cited = list(dict.fromkeys(cited))[:10]
        return text, cited
