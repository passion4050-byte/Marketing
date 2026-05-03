"""Phase 3-T2.4 — RAG 통합 e2e 테스트.

검증:
- generator 가 use_rag=True + 인덱싱된 자료 있으면 cited_reference_ids 채움
- use_rag=False 면 빈 리스트
- 인덱싱된 자료 없으면 빈 리스트 (graceful)
- ChromaStore 를 monkeypatch 로 in-memory 디렉토리에 격리
"""

from __future__ import annotations

import shutil
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.content.generator import generate_faq_content, generate_instagram_content
from src.reference import store as store_mod
from src.reference.indexer import index_text
from src.reference.store import ChromaStore
from src.storage.models import Base, Tenant


@pytest.fixture
def chroma_dir():
    d = tempfile.mkdtemp(prefix="pytest_rag_")
    yield d
    shutil.rmtree(d, ignore_errors=True)


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with SessionLocal() as s:
        s.add(
            Tenant(
                id=1,
                name="메디맵",
                domain_category="안과/시력교정",
                region="서울 강남",
                business_model="라식/라섹",
            )
        )
        s.commit()
    return SessionLocal


@pytest.fixture
def patched_chroma(monkeypatch, chroma_dir):
    """ChromaStore() 기본 호출이 격리된 임시 dir 을 사용하도록 패치."""
    monkeypatch.setenv("EMBEDDING_PROVIDER", "stub")
    monkeypatch.setenv("LLM_PROVIDER", "stub")

    original_init = ChromaStore.__init__

    def init_with_default(self, persist_dir=None):
        return original_init(self, persist_dir or chroma_dir)

    monkeypatch.setattr(ChromaStore, "__init__", init_with_default)
    return chroma_dir


def test_faq_generator_populates_cited_ids_when_rag_indexed(
    monkeypatch, patched_chroma, session_factory
):
    """인덱싱된 자료가 있고 use_rag=True 면 cited_reference_ids 가 채워진다."""
    store = ChromaStore()  # patched dir
    with session_factory() as s:
        index_text(
            s, 1,
            "백내장은 수정체가 혼탁해지는 안과 질환입니다. 강남에서 잘하는 안과를 찾을 때는 의사 경험이 중요합니다. " * 5,
            source_type="text",
            source_url="https://example.com/cataract",
            store=store,
        )

    with session_factory() as s:
        result = generate_faq_content(
            s, tenant_id=1, keyword="백내장 수정체",
            n_pairs=3, max_corrections=0,
            use_rag=True, rag_k=5,
            save=False,
        )

    assert result.cited_reference_ids, "RAG 활성 + 인덱싱된 자료 있는데 cited_ids 비어있음"
    assert all(isinstance(i, int) for i in result.cited_reference_ids)


def test_faq_generator_use_rag_false_returns_empty_cited_ids(
    monkeypatch, patched_chroma, session_factory
):
    store = ChromaStore()
    with session_factory() as s:
        index_text(
            s, 1, "백내장 안과 본문. " * 20,
            source_url="https://example.com/cataract", store=store,
        )

    with session_factory() as s:
        result = generate_faq_content(
            s, tenant_id=1, keyword="백내장",
            n_pairs=3, max_corrections=0,
            use_rag=False,
            save=False,
        )
    assert result.cited_reference_ids == []


def test_faq_generator_no_index_returns_empty_cited_ids(
    monkeypatch, patched_chroma, session_factory
):
    """인덱스 비어있어도 graceful — 발행은 진행, cited_ids 는 빈 리스트."""
    with session_factory() as s:
        result = generate_faq_content(
            s, tenant_id=1, keyword="백내장",
            n_pairs=3, max_corrections=0,
            use_rag=True, rag_k=5,
            save=False,
        )
    assert result.cited_reference_ids == []
    # 발행 자체는 정상 동작
    assert len(result.qa_pairs) > 0


def test_instagram_generator_populates_cited_ids(
    monkeypatch, patched_chroma, session_factory
):
    store = ChromaStore()
    with session_factory() as s:
        index_text(
            s, 1, "라식과 라섹은 시력 교정 수술입니다. " * 20,
            source_url="https://example.com/lasik", store=store,
        )

    with session_factory() as s:
        result = generate_instagram_content(
            s, tenant_id=1, keyword="라식 라섹",
            max_corrections=0,
            use_rag=True, rag_k=5,
            save=False,
        )
    assert result.cited_reference_ids, "Instagram generator RAG 미동작"


def test_rag_persists_to_generated_content_cited_reference_ids(
    monkeypatch, patched_chroma, session_factory
):
    """save=True 면 GeneratedContent.cited_reference_ids 가 DB 에 저장된다."""
    from src.storage.models import GeneratedContent

    store = ChromaStore()
    with session_factory() as s:
        index_text(
            s, 1, "백내장 진료와 수술 안내. " * 20,
            source_url="https://example.com/cataract", store=store,
        )

    with session_factory() as s:
        r = generate_faq_content(
            s, tenant_id=1, keyword="백내장",
            n_pairs=3, max_corrections=0,
            use_rag=True, rag_k=5,
            save=True,
        )

    with session_factory() as s:
        gc = s.get(GeneratedContent, r.saved_id)
        assert gc is not None
        assert gc.cited_reference_ids, "DB 에 cited_reference_ids 미저장"
        assert set(gc.cited_reference_ids) == set(r.cited_reference_ids)
