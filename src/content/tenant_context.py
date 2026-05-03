"""Tenant 비즈니스 데이터 → LLM 컨텍스트 블록 변환.

LLM이 콘텐츠 생성 시 \"사실\"로 인용할 정보:
- 활성 의사 (이름, 전문 분야, 경력)
- 활성 장비 (모델명, 제조사, 설명)
- 현재 진행 중인 이벤트 (이름, 가격, 기간)

이 블록을 프롬프트에 넣으면 콘텐츠가 추상 표현 대신 구체적 사실을 인용하게 됨.
의료법 관점에서도 \"이벤트 기간\"이 자동으로 본문에 들어가 종료일 명시 룰 통과.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from src.storage.models import Doctor, Equipment, EventOffer


def _fmt_price(p: Optional[int]) -> str:
    if not p:
        return "—"
    return f"{p:,}원"


def _fmt_date(d: Optional[datetime]) -> str:
    if not d:
        return "—"
    return d.strftime("%Y.%m.%d")


def build_tenant_context_block(session: Session, tenant_id: int, include_brand_voice: bool = True) -> str:
    """tenant의 활성 의사/장비/이벤트 + 브랜드 보이스를 LLM 프롬프트용 블록으로.

    빈 값이면 빈 문자열 반환 (프롬프트에 넣어도 영향 없도록).
    """
    from src.storage.models import BrandVoice

    brand_voice_block = ""
    if include_brand_voice:
        bv = (
            session.query(BrandVoice)
            .filter(BrandVoice.tenant_id == tenant_id)
            .one_or_none()
        )
        if bv:
            brand_voice_block = bv.to_prompt_block()
    doctors = (
        session.query(Doctor)
        .filter(Doctor.tenant_id == tenant_id, Doctor.is_active.is_(True))
        .order_by(Doctor.id)
        .all()
    )
    equipment = (
        session.query(Equipment)
        .filter(Equipment.tenant_id == tenant_id, Equipment.is_active.is_(True))
        .order_by(Equipment.id)
        .all()
    )
    now = datetime.now(timezone.utc)
    events = [
        e
        for e in session.query(EventOffer)
        .filter(EventOffer.tenant_id == tenant_id, EventOffer.is_active.is_(True))
        .order_by(EventOffer.id)
        .all()
        if e.is_currently_running(now)
    ]

    if not (doctors or equipment or events or brand_voice_block):
        return ""

    lines: list[str] = []
    if brand_voice_block:
        lines.append(brand_voice_block)
        lines.append("")
    lines.append("## 의료기관 사실 정보 (data feeding) — 콘텐츠 작성 시 인용 권장")

    if doctors:
        lines.append("\n### 활성 의료진")
        for d in doctors:
            parts = [f"- **{d.name}**"]
            if d.specialty:
                parts.append(f"({d.specialty})")
            lines.append(" ".join(parts))
            if d.education_career:
                # 줄바꿈을 공백으로 정리
                career = " · ".join(s.strip() for s in d.education_career.splitlines() if s.strip())
                lines.append(f"    경력: {career}")
            if d.certifications:
                certs = ", ".join(s.strip() for s in d.certifications.replace("\n", ",").split(",") if s.strip())
                lines.append(f"    자격: {certs}")

    if equipment:
        lines.append("\n### 사용 장비")
        for eq in equipment:
            parts = [f"- **{eq.name}**"]
            if eq.manufacturer:
                parts.append(f"(제조사: {eq.manufacturer})")
            lines.append(" ".join(parts))
            if eq.description:
                desc = " ".join(s.strip() for s in eq.description.splitlines() if s.strip())
                lines.append(f"    설명: {desc}")
            if eq.features:
                feats = ", ".join(s.strip() for s in eq.features.replace("\n", ",").split(",") if s.strip())
                lines.append(f"    주요 기능: {feats}")

    if events:
        lines.append("\n### 진행 중인 이벤트 (의료법 — 종료일 반드시 본문에 명시)")
        for ev in events:
            lines.append(
                f"- **{ev.name}**: 정상가 {_fmt_price(ev.regular_price)} → "
                f"이벤트가 {_fmt_price(ev.discount_price)} "
                f"(기간 {_fmt_date(ev.period_start)} ~ {_fmt_date(ev.period_end)})"
            )
            if ev.notes:
                notes = " ".join(s.strip() for s in ev.notes.splitlines() if s.strip())
                lines.append(f"    조건: {notes}")

    lines.append(
        "\n[작성 지침]\n"
        "- 위 정보를 콘텐츠에 자연스럽게 인용하세요. 추상적 표현(\"전문 의료진\") 대신 구체 사실(\"15년 경력의 김시력 전문의\")을 우선.\n"
        "- 이벤트 정보가 있으면 본문 마지막 또는 결론 직전에 자연 노출하고, 반드시 기간(시작~종료일)을 함께 적으세요.\n"
        "- 가격은 정상가/이벤트가를 함께 언급해 비교 가능하도록.\n"
        "- 효과/결과는 항상 '개인차가 있을 수 있다' 취지를 함께.\n"
    )
    return "\n".join(lines)


def has_active_data(session: Session, tenant_id: int) -> dict:
    """탭 미리보기용 — 각 카테고리 활성 카운트."""
    n_doctors = (
        session.query(Doctor)
        .filter(Doctor.tenant_id == tenant_id, Doctor.is_active.is_(True))
        .count()
    )
    n_equipment = (
        session.query(Equipment)
        .filter(Equipment.tenant_id == tenant_id, Equipment.is_active.is_(True))
        .count()
    )
    now = datetime.now(timezone.utc)
    active_events = [
        e
        for e in session.query(EventOffer)
        .filter(EventOffer.tenant_id == tenant_id, EventOffer.is_active.is_(True))
        .all()
        if e.is_currently_running(now)
    ]
    return {
        "doctors": n_doctors,
        "equipment": n_equipment,
        "active_events": len(active_events),
    }


def calculate_health_score(session: Session, tenant_id: int) -> dict:
    """데이터 건강 점수 — 입력 완성도 기반 0~100.

    가중치:
    - Tenant 기본 영업 정보 (주소/전화/홈페이지/네이버 플레이스): 25
    - 의사: 활성 1명 이상 + 핵심 필드 완성 → 25, 추가 의사당 +5 (최대 35)
    - 장비: 활성 1개 이상 + 핵심 필드 완성 → 20, 추가 +3 (최대 25)
    - 이벤트: 진행 중 1개 이상 → 15, 추가 +2 (최대 20) — 무이벤트는 감점 없음
    - 누락 카테고리는 0점

    반환:
    {
        "score": int,                # 0~100
        "doctors": (count, complete_count),
        "equipment": (count, complete_count),
        "events": (total, running),
        "tenant_base_filled": int (0~4),
    }
    """
    from src.storage.models import Tenant

    tenant = session.get(Tenant, tenant_id)
    score = 0.0

    # Tenant 영업 정보 (25)
    base_fields = [
        bool(tenant.address) if tenant else False,
        bool(tenant.phone) if tenant else False,
        bool(tenant.homepage) if tenant else False,
        bool(tenant.naver_place_url) if tenant else False,
    ]
    base_filled = sum(base_fields)
    score += base_filled * 6.25  # 4개 × 6.25 = 25

    # 의사 (max 35)
    doctors = (
        session.query(Doctor)
        .filter(Doctor.tenant_id == tenant_id, Doctor.is_active.is_(True))
        .all()
    )
    complete_doctors = [d for d in doctors if d.is_complete]
    if complete_doctors:
        score += 25 + min(10, (len(complete_doctors) - 1) * 5)
    elif doctors:
        score += 10  # 등록은 됐으나 미완성

    # 장비 (max 25)
    items = (
        session.query(Equipment)
        .filter(Equipment.tenant_id == tenant_id, Equipment.is_active.is_(True))
        .all()
    )
    complete_eq = [e for e in items if e.is_complete]
    if complete_eq:
        score += 20 + min(5, (len(complete_eq) - 1) * 3)
    elif items:
        score += 8

    # 이벤트 (max 20)
    now = datetime.now(timezone.utc)
    events_total = (
        session.query(EventOffer)
        .filter(EventOffer.tenant_id == tenant_id, EventOffer.is_active.is_(True))
        .all()
    )
    running = [e for e in events_total if e.is_currently_running(now)]
    if running:
        score += 15 + min(5, (len(running) - 1) * 2)
    elif events_total:
        score += 5

    return {
        "score": min(100, int(round(score))),
        "doctors": (len(doctors), len(complete_doctors)),
        "equipment": (len(items), len(complete_eq)),
        "events": (len(events_total), len(running)),
        "tenant_base_filled": base_filled,
    }
