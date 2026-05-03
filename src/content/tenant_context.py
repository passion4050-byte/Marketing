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


def build_tenant_context_block(session: Session, tenant_id: int) -> str:
    """tenant의 활성 의사/장비/이벤트를 LLM 프롬프트용 블록으로.

    빈 값이면 빈 문자열 반환 (프롬프트에 넣어도 영향 없도록).
    """
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

    if not (doctors or equipment or events):
        return ""

    lines: list[str] = []
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
