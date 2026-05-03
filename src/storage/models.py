"""SQLAlchemy ORM models. 정의서 §3 — 멀티테넌트 사전 반영.

Phase 1에서는 Tenant, ComplianceRule, GeneratedContent만 사용.
나머지(Keyword, Competitor, Query, Response, Mention, ReferenceDocument)는
Phase 2~6에서 추가하지만, 스키마는 처음부터 함께 정의해 마이그레이션 부담을 줄인다.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ─── Tenant ─────────────────────────────────────────────────────


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    domain_category: Mapped[str] = mapped_column(String(100))
    region: Mapped[str] = mapped_column(String(100))
    business_model: Mapped[str] = mapped_column(Text, default="")
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    naver_place_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    homepage: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    keywords: Mapped[list["Keyword"]] = relationship(back_populates="tenant", cascade="all, delete-orphan")
    compliance_rules: Mapped[list["ComplianceRule"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    generated_contents: Mapped[list["GeneratedContent"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )


# ─── Keyword (Phase 1에서 sample 1개 시드. 본격 사용은 Phase 4) ─


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(500))
    category: Mapped[str] = mapped_column(String(100), default="")
    target_brand: Mapped[str] = mapped_column(String(200), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant: Mapped[Tenant] = relationship(back_populates="keywords")


# ─── Compliance (Phase 1 핵심) ──────────────────────────────────


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    rule_type: Mapped[str] = mapped_column(String(50))  # forbidden_word | required_disclaimer | pattern
    pattern: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(20))  # error | warning | info
    message: Mapped[str] = mapped_column(Text)
    requires: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant: Mapped[Tenant] = relationship(back_populates="compliance_rules")


# ─── Generated Content (Phase 1 핵심) ───────────────────────────


class GeneratedContent(Base):
    __tablename__ = "generated_contents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    keyword_text: Mapped[str] = mapped_column(String(500))  # Phase 1: keyword_id 대신 text. Phase 2에서 FK 추가.
    channel: Mapped[str] = mapped_column(String(50))  # schema_org | blog_html | naver_blog | instagram
    body: Mapped[str] = mapped_column(Text)
    raw_qa_pairs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # FAQ Q&A 원본
    cited_reference_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    compliance_status: Mapped[str] = mapped_column(String(20))  # pass | warn | fail
    compliance_report: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    llm_provider: Mapped[str] = mapped_column(String(20), default="stub")
    correction_iterations: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="generated_contents")
