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
    doctors: Mapped[list["Doctor"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    equipment: Mapped[list["Equipment"]] = relationship(
        back_populates="tenant", cascade="all, delete-orphan"
    )
    event_offers: Mapped[list["EventOffer"]] = relationship(
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


# ─── Data Feeding (Phase 1.5+) — 구조화 비즈니스 정보 ──────────


class Doctor(Base):
    """의사 자격 정보 — 콘텐츠에 실제 의사명/경력으로 인용되도록."""

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))                   # 예: 김시력
    specialty: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # 예: 라식/라섹 전문의
    education_career: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 예: 연세대 의대... 시력교정술 15년 경력
    certifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # 예: 안과 전문의, 굴절교정 전문의
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="doctors")

    @property
    def is_complete(self) -> bool:
        """모든 핵심 필드가 채워져 있으면 '최적화됨'."""
        return bool(self.name and self.specialty and self.education_career)


class Equipment(Base):
    """의료 장비 — 콘텐츠가 실제 장비 모델명을 언급하도록."""

    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))                    # 예: 아마리스 레드 1050RS
    manufacturer: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # 예: SCHWIND
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)          # 장비 설명
    features: Mapped[Optional[str]] = mapped_column(Text, nullable=True)             # 주요 기능 (콤마 구분 또는 자유)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="equipment")

    @property
    def is_complete(self) -> bool:
        return bool(self.name and self.manufacturer and self.description)


class EventOffer(Base):
    """진행 중인 이벤트/프로모션 — 콘텐츠 끝에 자연 노출 + 의료법 종료일 자동 체크."""

    __tablename__ = "event_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))                    # 예: 스마일 라식 특별 할인
    regular_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)   # 원 단위
    discount_price: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 원 단위
    period_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)              # 조건/유의사항
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    tenant: Mapped[Tenant] = relationship(back_populates="event_offers")

    @property
    def is_complete(self) -> bool:
        return bool(self.name and self.period_start and self.period_end)

    def is_currently_running(self, now: Optional[datetime] = None) -> bool:
        """오늘이 이벤트 기간 안에 있나? 콘텐츠에 노출할지 판단용.

        SQLite는 timezone 정보 없이 datetime을 저장하므로 양쪽 모두 naive로 정렬해 비교.
        """
        if not self.is_active or not self.period_start or not self.period_end:
            return False
        n = now or _now()
        # tzinfo 정렬 — SQLite의 naive datetime 비교 호환
        ps = self.period_start.replace(tzinfo=None) if self.period_start.tzinfo else self.period_start
        pe = self.period_end.replace(tzinfo=None) if self.period_end.tzinfo else self.period_end
        nn = n.replace(tzinfo=None) if n.tzinfo else n
        return ps <= nn <= pe
