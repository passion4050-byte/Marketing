"""ClaudeEngine — Phase 6-T1.3.

Anthropic Claude messages API. ``web_search_20250305`` tool 사용 시도, 실패 시 일반 호출.

cited_urls:
1. tool_use 의 web_search 결과 ``url`` 필드
2. 응답 텍스트의 URL 정규식 폴백

모델: ``claude-haiku-4-5`` 기본 (ANTHROPIC_MODEL env).
"""

from __future__ import annotations

import asyncio
import os
import re
import time

from src.engines.base import BaseEngine, EngineError, EngineResponse


_DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
_URL_RE = re.compile(r"https?://[\w./%~?&=#:+-]+")


class ClaudeEngine(BaseEngine):
    name = "claude"

    def __init__(self, api_key: str, *, model: str = _DEFAULT_MODEL) -> None:
        if not api_key:
            raise EngineError("ANTHROPIC_API_KEY 미설정")
        try:
            from anthropic import AsyncAnthropic
        except ImportError as e:  # pragma: no cover
            raise EngineError(f"anthropic 패키지 미설치: {e}") from e
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def query(self, prompt: str) -> EngineResponse:
        # Round 103 (2026-06-29): 검색 유도 강화. 기존엔 web_search 가 auto 라 모델이
        #   거의 검색을 안 해 cited 추출률 10% → source URL 확보율 저조. 시스템 프롬프트로
        #   검색을 권장하고, tool_choice 로 검색을 강제(미지원 시 auto→plain 으로 안전 폴백).
        system = (
            "당신은 한국어로 의료/안과 정보를 정리하는 도우미입니다. "
            "최신 정보와 실제 의료기관·출처를 확인하기 위해 가능하면 웹 검색을 사용하고, "
            "사실 기반으로 답변하며 알려진 의료기관 이름이 있다면 자연스럽게 언급하세요."
        )
        web_tool = [{"type": "web_search_20250305", "name": "web_search"}]
        start = time.perf_counter()
        try:
            try:
                # 1) 웹검색 강제(tool_choice=any) — source URL 확보율 최대화
                resp = await self._client.messages.create(
                    model=self._model,
                    max_tokens=1024,
                    system=system,
                    tools=web_tool,
                    tool_choice={"type": "any"},
                    messages=[{"role": "user", "content": prompt}],
                )
            except Exception:
                try:
                    # 2) 강제 미지원 시 — 검색 도구 auto (기존 동작)
                    resp = await self._client.messages.create(
                        model=self._model,
                        max_tokens=1024,
                        system=system,
                        tools=web_tool,
                        messages=[{"role": "user", "content": prompt}],
                    )
                except Exception:
                    # 3) tool 자체 미지원/권한 없음 → 일반 호출
                    resp = await self._client.messages.create(
                        model=self._model,
                        max_tokens=1024,
                        system=system,
                        messages=[{"role": "user", "content": prompt}],
                    )
        except Exception as e:
            raise EngineError(f"Claude 호출 실패: {e}") from e

        latency_ms = int((time.perf_counter() - start) * 1000)

        # Round 85 (2026-06-28) — Anthropic web_search_20250305 응답 구조 보강.
        #   진단: 함정 DC — 80 responses 중 source_domains 추출 0%.
        #   원인: web_search tool 결과가 실제로는 ① server_tool_use 블록 (web search 실행)
        #   ② web_search_tool_result 블록 (citations 배열 포함) 으로 분리되어 옴.
        #   이전 코드는 tool_use(name=web_search) + tool_result 만 봤음 → 0% 매칭.
        text_parts: list[str] = []
        cited: list[str] = []
        for block in (resp.content or []):
            btype = getattr(block, "type", None) or ""
            if btype == "text":
                text_parts.append(getattr(block, "text", "") or "")
                # Round 85 — text 블록의 citations 배열 (Anthropic web search 의 새 형태)
                for c in (getattr(block, "citations", None) or []):
                    u = getattr(c, "url", None) or (c.get("url") if isinstance(c, dict) else None)
                    if u:
                        cited.append(u)
            elif btype in ("tool_use", "server_tool_use") and getattr(block, "name", "") in ("web_search", "web_search_tool"):
                tin = getattr(block, "input", {}) or {}
                if isinstance(tin, dict):
                    u = tin.get("url")
                    if u:
                        cited.append(u)
            elif btype in ("tool_result", "web_search_tool_result"):
                tc = getattr(block, "content", None) or []
                if isinstance(tc, list):
                    for item in tc:
                        u = None
                        if isinstance(item, dict):
                            u = item.get("url") or (item.get("source") or {}).get("url")
                        else:
                            u = getattr(item, "url", None)
                        if u:
                            cited.append(u)

        text = "\n".join(p for p in text_parts if p)
        if not text:
            raise EngineError(f"Claude 응답 빈 본문: {resp}")

        if not cited:
            cited = list(dict.fromkeys(_URL_RE.findall(text)))[:10]
        cited = list(dict.fromkeys(cited))[:10]

        return EngineResponse(
            text=text,
            cited_urls=cited,
            latency_ms=latency_ms,
            raw_payload={"model": getattr(resp, "model", self._model)},
        )
