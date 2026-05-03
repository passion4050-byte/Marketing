"""RAG retriever — Phase 3-T2.1.

발행 시점에 ``retrieve(session, tenant_id, query)`` 가 호출되면:
1. embedder 로 query 를 임베딩
2. ChromaStore.query(tenant_id, ...) 로 top-k 청크 조회
3. ChunkResult → RetrievedChunk 로 풀어 (text, source_url, document_id, chunk_index, distance) 반환

LLM 컨텍스트 주입을 위한 ``format_references_block()`` 헬퍼 포함.

Tenant 격리:
- ChromaStore 가 collection 단위 격리 → 다른 tenant 의 청크는 절대 노출되지 않음.
- session 은 ReferenceDocument metadata 검증 시에만 사용 (현재 미사용 — 향후 source_url 보강 등).
"""

from __future__ import annotations

from dataclasses import dataclass

import structlog
from sqlalchemy.orm import Session

from src.reference.embedder import Embedder, EmbedderError, get_embedder
from src.reference.store import ChromaStore

logger = structlog.get_logger(__name__)


@dataclass
class RetrievedChunk:
    text: str
    source_url: str | None
    document_id: int
    chunk_index: int
    distance: float
    source_type: str | None = None


def retrieve(
    session: Session,
    tenant_id: int,
    query: str,
    *,
    k: int = 5,
    embedder: Embedder | None = None,
    store: ChromaStore | None = None,
) -> list[RetrievedChunk]:
    """top-k 가까운 청크 반환. 임베딩/Chroma 오류 시 빈 리스트 (graceful)."""
    query = (query or "").strip()
    if not query or k <= 0:
        return []

    embedder = embedder or get_embedder()
    try:
        q_vec = embedder.embed([query])[0]
    except EmbedderError as e:
        logger.warning(
            "retriever.embed_failed", tenant_id=tenant_id, query=query[:50], error=str(e)
        )
        return []

    store = store or ChromaStore()
    try:
        results = store.query(tenant_id=tenant_id, query_embedding=q_vec, k=k)
    except Exception as e:  # pragma: no cover — chroma 내부 오류
        logger.warning(
            "retriever.chroma_query_failed", tenant_id=tenant_id, error=repr(e)
        )
        return []

    chunks = [
        RetrievedChunk(
            text=r.text,
            source_url=r.source_url,
            document_id=r.document_id,
            chunk_index=r.chunk_index,
            distance=r.distance,
            source_type=r.source_type,
        )
        for r in results
    ]
    logger.info(
        "retriever.retrieved",
        tenant_id=tenant_id,
        query_len=len(query),
        n_results=len(chunks),
        k=k,
    )
    return chunks


def format_references_block(chunks: list[RetrievedChunk], *, max_chars_per_chunk: int = 800) -> str:
    """LLM system prompt 에 주입할 참고자료 블록 포맷.

    ``[참고자료 #N] (URL or source_type)`` 헤더 + 청크 본문.
    """
    if not chunks:
        return ""
    parts = ["## 참고 자료 (사실 기반 작성에 활용하되 표절 금지, 의역하세요)\n"]
    for i, c in enumerate(chunks, 1):
        source_label = c.source_url or f"({c.source_type or 'text'})"
        body = c.text if len(c.text) <= max_chars_per_chunk else c.text[:max_chars_per_chunk] + "…"
        parts.append(f"[참고자료 #{i}] {source_label}\n{body}\n")
    return "\n".join(parts)


def cited_document_ids(chunks: list[RetrievedChunk]) -> list[int]:
    """중복 제거된 document_id 리스트 (등장 순서 유지)."""
    seen: set[int] = set()
    out: list[int] = []
    for c in chunks:
        if c.document_id not in seen:
            seen.add(c.document_id)
            out.append(c.document_id)
    return out
