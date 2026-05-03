"""Phase 3-T2.4 — retriever pytest.

검증:
- 인덱싱 후 retrieve 가 top-k 청크 반환 (k 이하)
- tenant 격리 — tenant_2 의 query 가 tenant_1 의 청크 절대 미반환
- distance 가 정렬되어 있음 (오름차순 = 가까운 순)
- 빈 query / k<=0 / 인덱스 없음 시 빈 리스트
- format_references_block 출력 형식
- cited_document_ids 중복 제거 + 순서 유지
"""

from __future__ import annotations

import shutil
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.reference.indexer import index_text
from src.reference.retriever import (
    RetrievedChunk,
    cited_document_ids,
    format_references_block,
    retrieve,
)
from src.reference.store import ChromaStore
from src.storage.models import Base, Tenant


@pytest.fixture
def chroma_dir():
    d = tempfile.mkdtemp(prefix="pytest_chroma_")
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(Tenant(id=1, name="메디맵", domain_category="안과", region="서울", business_model=""))
        s.add(Tenant(id=2, name="타원", domain_category="안과", region="부산", business_model=""))
        s.commit()
    return SessionLocal


def test_retrieve_returns_topk_after_indexing(monkeypatch, chroma_dir, session_factory):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    store = ChromaStore(persist_dir=chroma_dir)

    with session_factory() as s:
        index_text(
            s, 1, "백내장은 수정체가 혼탁해지는 안과 질환입니다. " * 20,
            source_type="text", source_url="https://t1/cataract", store=store,
        )
        index_text(
            s, 1, "라식과 라섹은 시력 교정 수술입니다. " * 20,
            source_type="text", source_url="https://t1/lasik", store=store,
        )

    with session_factory() as s:
        chunks = retrieve(s, 1, "백내장 수정체", k=3, store=store)
    assert len(chunks) > 0
    assert len(chunks) <= 3
    assert all(isinstance(c, RetrievedChunk) for c in chunks)
    assert all(c.text for c in chunks)
    assert all(c.document_id > 0 for c in chunks)


def test_retrieve_tenant_isolation(monkeypatch, chroma_dir, session_factory):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    store = ChromaStore(persist_dir=chroma_dir)

    with session_factory() as s:
        index_text(s, 1, "백내장 안과 시력. " * 20, source_url="https://t1/eye", store=store)
        index_text(s, 2, "치과 임플란트 보철. " * 20, source_url="https://t2/dental", store=store)

    with session_factory() as s:
        t1_chunks = retrieve(s, 1, "백내장", k=5, store=store)
        t2_chunks = retrieve(s, 2, "백내장", k=5, store=store)

    # tenant_1 결과에 tenant_2 의 dental URL 이 절대 포함되면 안 됨
    for c in t1_chunks:
        assert (c.source_url or "").startswith("https://t1"), f"leak: {c.source_url}"
    # tenant_2 의 결과는 dental 만
    for c in t2_chunks:
        assert (c.source_url or "").startswith("https://t2"), f"leak: {c.source_url}"


def test_retrieve_distance_sorted_ascending(monkeypatch, chroma_dir, session_factory):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    store = ChromaStore(persist_dir=chroma_dir)

    with session_factory() as s:
        index_text(s, 1, "백내장 수정체 안과. " * 20, source_url="https://t1/a", store=store)
        index_text(s, 1, "라식 라섹 시력. " * 20, source_url="https://t1/b", store=store)
        index_text(s, 1, "치과 임플란트 보철. " * 20, source_url="https://t1/c", store=store)

    with session_factory() as s:
        chunks = retrieve(s, 1, "백내장", k=3, store=store)
    assert len(chunks) >= 2
    distances = [c.distance for c in chunks]
    assert distances == sorted(distances), f"distance 정렬 안 됨: {distances}"


def test_retrieve_empty_query_returns_empty(monkeypatch, chroma_dir, session_factory):
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    store = ChromaStore(persist_dir=chroma_dir)
    with session_factory() as s:
        index_text(s, 1, "어떤 텍스트. " * 20, store=store)

    with session_factory() as s:
        assert retrieve(s, 1, "", k=5, store=store) == []
        assert retrieve(s, 1, "   ", k=5, store=store) == []
        assert retrieve(s, 1, "백내장", k=0, store=store) == []


def test_retrieve_no_index_returns_empty(monkeypatch, chroma_dir, session_factory):
    """인덱스 비어있는 tenant 조회는 빈 리스트."""
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    store = ChromaStore(persist_dir=chroma_dir)
    with session_factory() as s:
        chunks = retrieve(s, 999, "아무거나", k=5, store=store)
    assert chunks == []


def test_format_references_block_includes_source_url():
    chunks = [
        RetrievedChunk(
            text="백내장 본문 청크",
            source_url="https://example.com/a",
            document_id=1,
            chunk_index=0,
            distance=0.1,
            source_type="url",
        ),
    ]
    block = format_references_block(chunks)
    assert "[참고자료 #1]" in block
    assert "https://example.com/a" in block
    assert "백내장 본문 청크" in block


def test_format_references_block_empty_returns_empty_string():
    assert format_references_block([]) == ""


def test_cited_document_ids_dedupes_preserving_order():
    chunks = [
        RetrievedChunk(text="a", source_url=None, document_id=10, chunk_index=0, distance=0.1),
        RetrievedChunk(text="b", source_url=None, document_id=20, chunk_index=0, distance=0.2),
        RetrievedChunk(text="c", source_url=None, document_id=10, chunk_index=1, distance=0.3),
        RetrievedChunk(text="d", source_url=None, document_id=30, chunk_index=0, distance=0.4),
    ]
    assert cited_document_ids(chunks) == [10, 20, 30]
