"""Chroma vector store wrapper — Phase 3-T1.3.

Tenant 격리 정책:
- collection 명: ``tenant_{id}`` — 다른 tenant 의 청크가 절대 노출되지 않음
- 메타데이터: ``{tenant_id, document_id, chunk_index, source_url, source_type}``

영속화:
- ``persist_dir`` (기본 ``./data/chroma``) 에 PersistentClient 가 SQLite + parquet 저장
- Streamlit Cloud 컨테이너 재시작 시 휘발 (Phase 4+ 에서 Supabase pgvector 등 외부 저장소로 이전)

ID 정책:
- chunk id = ``{document_id}::{chunk_index}`` — document 내 unique
- ``add_chunks`` 는 upsert 시그니처 (collection.add 대신 add+set 패턴은 chroma 1.x 의
  ``upsert`` 메서드 직접 사용). 같은 ID 재호출 시 덮어씀.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

from src.reference.chunker import Chunk

if TYPE_CHECKING:  # pragma: no cover
    from chromadb.api.models.Collection import Collection


DEFAULT_PERSIST_DIR = Path(os.getenv("CHROMA_PERSIST_DIR", "./data/chroma"))


@dataclass
class ChunkResult:
    """``ChromaStore.query`` 반환 형식."""

    text: str
    document_id: int
    chunk_index: int
    source_url: str | None
    source_type: str | None
    distance: float


def _collection_name(tenant_id: int) -> str:
    return f"tenant_{int(tenant_id)}"


class ChromaStore:
    """tenant-격리 Chroma persistent store wrapper.

    ``add_chunks`` 와 ``query`` 모두 ``tenant_id`` 를 받고, 내부에서
    collection 을 분리 관리한다. 외부 코드가 collection 을 직접 다룰 일은 없다.
    """

    def __init__(self, persist_dir: Path | str | None = None) -> None:
        try:
            import chromadb
        except ImportError as e:  # pragma: no cover
            raise RuntimeError(
                "chromadb 미설치 — `pip install chromadb` 후 재시도."
            ) from e

        self._persist_dir = Path(persist_dir) if persist_dir else DEFAULT_PERSIST_DIR
        self._persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=str(self._persist_dir))

    # ─── collection ──────────────────────────────────────────────

    def get_or_create_collection(self, tenant_id: int) -> "Collection":
        """tenant 별 collection 을 가져오거나 생성. 멱등."""
        return self._client.get_or_create_collection(
            name=_collection_name(tenant_id),
            metadata={"tenant_id": int(tenant_id)},
        )

    def reset_tenant(self, tenant_id: int) -> None:
        """테스트/관리용 — tenant collection 전체 삭제."""
        try:
            self._client.delete_collection(_collection_name(tenant_id))
        except Exception:
            # 존재하지 않으면 무시
            pass

    # ─── write ───────────────────────────────────────────────────

    def add_chunks(
        self,
        tenant_id: int,
        document_id: int,
        chunks: list[Chunk],
        embeddings: list[list[float]],
        *,
        source_url: str | None = None,
        source_type: str | None = None,
    ) -> int:
        """청크 + embedding 을 tenant collection 에 upsert. 추가된 row 수 반환."""
        if not chunks:
            return 0
        if len(chunks) != len(embeddings):
            raise ValueError(
                f"chunks({len(chunks)}) and embeddings({len(embeddings)}) length mismatch"
            )
        collection = self.get_or_create_collection(tenant_id)

        ids = [f"{document_id}::{i}" for i in range(len(chunks))]
        documents = [c.text for c in chunks]
        metadatas = [
            {
                "tenant_id": int(tenant_id),
                "document_id": int(document_id),
                "chunk_index": i,
                "source_url": source_url or "",
                "source_type": source_type or "",
                "char_start": int(c.char_start),
                "char_end": int(c.char_end),
            }
            for i, c in enumerate(chunks)
        ]
        # upsert 로 동일 document_id 재인덱싱 시 자동 덮어씀
        collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        return len(chunks)

    def delete_document(self, tenant_id: int, document_id: int) -> None:
        """ReferenceDocument 삭제 시 호출 — 해당 문서의 모든 청크 제거."""
        collection = self.get_or_create_collection(tenant_id)
        collection.delete(where={"document_id": int(document_id)})

    # ─── read ────────────────────────────────────────────────────

    def query(
        self,
        tenant_id: int,
        query_embedding: list[float],
        *,
        k: int = 5,
    ) -> list[ChunkResult]:
        """top-k 유사 청크 반환. 다른 tenant 의 청크는 collection 격리로 자동 차단."""
        if k <= 0:
            return []
        collection = self.get_or_create_collection(tenant_id)
        # collection.count 가 0 이면 query 가 빈 결과 → 안전
        res = collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
        out: list[ChunkResult] = []
        # chroma query 는 batch 형식 — 첫 query 의 결과만 사용
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        for doc, meta, dist in zip(docs, metas, dists):
            meta = meta or {}
            out.append(
                ChunkResult(
                    text=doc or "",
                    document_id=int(meta.get("document_id", 0)),
                    chunk_index=int(meta.get("chunk_index", 0)),
                    source_url=(meta.get("source_url") or None) or None,
                    source_type=(meta.get("source_type") or None) or None,
                    distance=float(dist) if dist is not None else float("inf"),
                )
            )
        return out

    def count(self, tenant_id: int) -> int:
        """tenant collection 의 chunk 개수."""
        collection = self.get_or_create_collection(tenant_id)
        return int(collection.count())
