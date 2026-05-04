"""Embedder 멀티 프로바이더 — Phase 3-T1.2.

지원:
- stub    : hash 기반 deterministic vector (dim=128, 키 0개)
- gemini  : `text-embedding-004` (dim=768, 무료 tier)
- openai  : `text-embedding-3-small` (dim=1536, 정의서 표준)

토글: `EMBEDDING_PROVIDER` 환경변수 (기본 stub).
"""

from __future__ import annotations

import hashlib
import os
import struct
from typing import Protocol


class EmbedderError(RuntimeError):
    pass


class Embedder(Protocol):
    name: str
    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...


# ─── Stub Embedder ────────────────────────────────────────────


class StubEmbedder:
    """Hash 기반 deterministic vector — 키 없이 데모 동작.

    같은 텍스트는 항상 같은 vector → 검색 결과가 결정론적이지만 의미 유사도는 약함.
    데모 + 단위 테스트 + Streamlit Cloud 무키 fallback 용.
    """

    name = "stub"
    dim = 128

    def embed(self, texts: list[str]) -> list[list[float]]:
        out: list[list[float]] = []
        for t in texts:
            digest = hashlib.sha256((t or "").encode("utf-8")).digest()
            # 32 bytes → 8 floats × 16번 반복으로 128차원 채우기
            base = struct.unpack(">8f", digest)
            vec = [base[i % 8] for i in range(self.dim)]
            # L2 정규화
            norm = (sum(v * v for v in vec)) ** 0.5 or 1.0
            out.append([v / norm for v in vec])
        return out


# ─── Gemini Embedder ──────────────────────────────────────────


class GeminiEmbedder:
    name = "gemini"
    dim = 768  # text-embedding-004

    def __init__(self, api_key: str, model: str = "text-embedding-004"):
        try:
            from google import genai
            from google.genai import types as genai_types
        except ImportError as e:
            raise EmbedderError("google-genai 미설치") from e
        self._client = genai.Client(api_key=api_key)
        self._types = genai_types
        self._model = model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        out: list[list[float]] = []
        cfg = self._types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        for t in texts:
            try:
                result = self._client.models.embed_content(
                    model=self._model,
                    contents=t,
                    config=cfg,
                )
                # google-genai: result.embeddings 는 list[ContentEmbedding] — .values 로 float list
                emb = result.embeddings[0].values
                out.append(list(emb))
            except Exception as e:
                raise EmbedderError(f"Gemini embed 실패: {e}") from e
        return out


# ─── OpenAI Embedder ──────────────────────────────────────────


class OpenAIEmbedder:
    name = "openai"
    dim = 1536  # text-embedding-3-small

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise EmbedderError("openai 미설치") from e
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            resp = self._client.embeddings.create(model=self._model, input=texts)
            return [d.embedding for d in resp.data]
        except Exception as e:
            raise EmbedderError(f"OpenAI embed 실패: {e}") from e


# ─── Factory ─────────────────────────────────────────────────


def get_embedder(provider_name: str | None = None) -> Embedder:
    """환경변수 또는 인자로 embedder 선택. 기본 stub."""
    name = (provider_name or os.getenv("EMBEDDING_PROVIDER", "stub")).lower().strip()

    if name == "stub":
        return StubEmbedder()

    if name == "gemini":
        key = os.getenv("GOOGLE_API_KEY")
        if not key:
            raise EmbedderError("GOOGLE_API_KEY 미설정 — Gemini embedder 사용 불가.")
        return GeminiEmbedder(api_key=key)

    if name == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise EmbedderError("OPENAI_API_KEY 미설정 — OpenAI embedder 사용 불가.")
        return OpenAIEmbedder(api_key=key)

    raise EmbedderError(f"알 수 없는 EMBEDDING_PROVIDER: {name}. (stub|gemini|openai)")
