"""Reference indexer — Phase 3-T1.4.

오케스트레이션 (URL/text → Chroma + ReferenceDocument):
1. fetch (URL 인 경우) 또는 직접 text
2. content_hash 계산 (sha256(raw_text))
3. (tenant_id, content_hash) 중복 체크 — 있으면 ``status="duplicate"`` 반환
4. chunker → embedder → ChromaStore.add_chunks
5. ReferenceDocument INSERT + chunk_count 기록 + indexed_at 세팅
6. 부분 실패 시 best-effort rollback (Chroma 청크 제거)

ID 약속:
- ChromaStore 의 chunk_id = ``f"{document_id}::{i}"`` 이므로 ReferenceDocument.id 가 필요.
  → DB INSERT 먼저 (chunk 0 으로) → id 확보 → Chroma upsert → chunk_count UPDATE
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.reference.chunker import chunk_text
from src.reference.embedder import Embedder, EmbedderError, get_embedder
from src.reference.fetcher import FetchError, fetch_reference
from src.reference.store import ChromaStore
from src.storage.models import ReferenceDocument

logger = structlog.get_logger(__name__)


IndexStatus = Literal["indexed", "duplicate", "empty", "fetch_failed", "embed_failed"]


@dataclass
class IndexResult:
    status: IndexStatus
    document_id: int | None
    chunk_count: int
    error_msg: str | None = None


def _hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _find_existing(session: Session, tenant_id: int, content_hash: str) -> ReferenceDocument | None:
    return session.execute(
        select(ReferenceDocument).where(
            ReferenceDocument.tenant_id == tenant_id,
            ReferenceDocument.content_hash == content_hash,
        )
    ).scalar_one_or_none()


def index_text(
    session: Session,
    tenant_id: int,
    text: str,
    *,
    source_type: str = "text",
    source_url: str | None = None,
    title: str | None = None,
    embedder: Embedder | None = None,
    store: ChromaStore | None = None,
    max_tokens: int = 500,
    overlap_tokens: int = 100,
) -> IndexResult:
    """raw text 를 chunking → embedding → Chroma + DB 에 인덱싱."""
    text = (text or "").strip()
    if not text:
        return IndexResult(status="empty", document_id=None, chunk_count=0, error_msg="빈 텍스트")

    content_hash = _hash(text)

    existing = _find_existing(session, tenant_id, content_hash)
    if existing is not None:
        logger.info(
            "reference.duplicate",
            tenant_id=tenant_id,
            document_id=existing.id,
            source_url=source_url,
        )
        return IndexResult(
            status="duplicate",
            document_id=existing.id,
            chunk_count=existing.chunk_count or 0,
        )

    chunks = chunk_text(text, max_tokens=max_tokens, overlap_tokens=overlap_tokens)
    if not chunks:
        return IndexResult(status="empty", document_id=None, chunk_count=0, error_msg="청크 생성 실패")

    embedder = embedder or get_embedder()
    try:
        embeddings = embedder.embed([c.text for c in chunks])
    except EmbedderError as e:
        logger.warning("reference.embed_failed", error=str(e), tenant_id=tenant_id)
        return IndexResult(status="embed_failed", document_id=None, chunk_count=0, error_msg=str(e))

    # DB INSERT 먼저 — id 를 Chroma chunk_id 에 사용
    doc = ReferenceDocument(
        tenant_id=tenant_id,
        source_type=source_type,
        source_url=source_url,
        title=(title or source_url or text[:80]),
        content_hash=content_hash,
        raw_text=text,
        chunk_count=0,
        indexed_at=datetime.utcnow(),
    )
    session.add(doc)
    session.flush()  # doc.id 확보

    store = store or ChromaStore()
    try:
        store.add_chunks(
            tenant_id=tenant_id,
            document_id=doc.id,
            chunks=chunks,
            embeddings=embeddings,
            source_url=source_url,
            source_type=source_type,
        )
    except Exception as e:  # pragma: no cover — chroma 내부 오류 best-effort
        logger.warning(
            "reference.chroma_add_failed",
            error=repr(e),
            document_id=doc.id,
            tenant_id=tenant_id,
        )
        session.rollback()
        return IndexResult(
            status="embed_failed",
            document_id=None,
            chunk_count=0,
            error_msg=f"chroma add 실패: {e}",
        )

    doc.chunk_count = len(chunks)
    session.commit()

    logger.info(
        "reference.indexed",
        tenant_id=tenant_id,
        document_id=doc.id,
        chunk_count=len(chunks),
        source_url=source_url,
        source_type=source_type,
    )
    return IndexResult(status="indexed", document_id=doc.id, chunk_count=len(chunks))


def index_url(
    session: Session,
    tenant_id: int,
    url: str,
    *,
    embedder: Embedder | None = None,
    store: ChromaStore | None = None,
    max_tokens: int = 500,
    overlap_tokens: int = 100,
) -> IndexResult:
    """URL fetch → trafilatura 본문 추출 → ``index_text`` 로 위임."""
    try:
        ref = fetch_reference(url)
    except FetchError as e:
        return IndexResult(status="fetch_failed", document_id=None, chunk_count=0, error_msg=str(e))

    if not ref.body or len(ref.body.strip()) < 50:
        return IndexResult(
            status="empty",
            document_id=None,
            chunk_count=0,
            error_msg=f"본문 너무 짧음 ({ref.char_count}자)",
        )

    return index_text(
        session,
        tenant_id,
        ref.body,
        source_type="url",
        source_url=ref.url,
        title=ref.title,
        embedder=embedder,
        store=store,
        max_tokens=max_tokens,
        overlap_tokens=overlap_tokens,
    )


def delete_document(
    session: Session,
    tenant_id: int,
    document_id: int,
    *,
    store: ChromaStore | None = None,
) -> bool:
    """ReferenceDocument + Chroma chunks 동시 삭제. 존재 안 하면 False."""
    doc = session.get(ReferenceDocument, document_id)
    if doc is None or doc.tenant_id != tenant_id:
        return False
    store = store or ChromaStore()
    try:
        store.delete_document(tenant_id, document_id)
    except Exception as e:  # pragma: no cover
        logger.warning("reference.chroma_delete_failed", error=repr(e), document_id=document_id)
    session.delete(doc)
    session.commit()
    return True
