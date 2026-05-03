"""pytest 전역 설정 — 환경 격리.

문제: alembic/env.py 가 모듈-레벨 ``load_dotenv()`` 를 호출. test_alembic_smoke 처럼
alembic command 를 실행하는 테스트가 한 번이라도 돌면 .env 의 LLM_PROVIDER, GOOGLE_API_KEY
등이 ``os.environ`` 에 영구 주입돼 이후 stub 를 가정한 테스트들이 실제 외부 호출을 시도해
실패한다.

해결: 모든 테스트가 시작될 때 LLM_PROVIDER / EMBEDDING_PROVIDER 를 강제로 stub 으로 둔다.
실제 LLM 통합 테스트가 필요하면 그 테스트가 명시적으로 monkeypatch.setenv 로 덮어쓴다.
"""

from __future__ import annotations

import os

import pytest


@pytest.fixture(autouse=True)
def _isolate_llm_provider_env(monkeypatch):
    """모든 테스트에서 기본적으로 stub provider 강제.

    .env / 외부 환경에서 흘러들어온 LLM_PROVIDER=gemini 등이 테스트를 오염시키는 것을 차단.
    """
    monkeypatch.setenv("LLM_PROVIDER", "stub")
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    # API 키도 비워 실수로라도 외부 호출이 일어나지 않게
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    yield
