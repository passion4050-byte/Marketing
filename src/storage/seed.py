"""DB 시드 로직 — scripts/init_db.py 와 Streamlit 부트스트랩이 공유.

Streamlit Cloud 처럼 매 컨테이너 재시작마다 SQLite 가 휘발되는 환경에서
앱 시작 시 자동으로 호출돼 sample tenants/rules 를 다시 채운다.
"""

from __future__ import annotations

from datetime import datetime, time, timezone
from pathlib import Path

import yaml
from sqlalchemy.orm import Session

from src.storage.models import (
    ComplianceRule,
    Doctor,
    Equipment,
    EventOffer,
    Keyword,
    Tenant,
)

ROOT = Path(__file__).resolve().parent.parent.parent
TENANTS_YAML = ROOT / "config" / "tenants.yaml"
RULES_YAML = ROOT / "config" / "compliance_rules" / "default.yaml"


def _to_aware_date(s):
    if s is None:
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    if isinstance(s, str):
        try:
            d = datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            d = datetime.fromisoformat(s)
        return d.replace(tzinfo=timezone.utc)
    return datetime.combine(s, time.min, tzinfo=timezone.utc)


def seed_tenants(session: Session, *, verbose: bool = False) -> None:
    with TENANTS_YAML.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)

    for entry in data.get("tenants", []):
        tenant = session.get(Tenant, entry["id"])
        if tenant is None:
            tenant = Tenant(
                id=entry["id"],
                name=entry["name"],
                domain_category=entry["domain_category"],
                region=entry["region"],
                business_model=entry.get("business_model", ""),
                address=entry.get("address") or None,
                naver_place_url=entry.get("naver_place_url") or None,
                phone=entry.get("phone") or None,
                homepage=entry.get("homepage") or None,
            )
            session.add(tenant)
            if verbose:
                print(f"[+] tenant 생성: {tenant.name}")
        else:
            tenant.name = entry["name"]
            tenant.domain_category = entry["domain_category"]
            tenant.region = entry["region"]
            tenant.business_model = entry.get("business_model", "")
            tenant.address = entry.get("address") or None
            tenant.naver_place_url = entry.get("naver_place_url") or None
            tenant.phone = entry.get("phone") or None
            tenant.homepage = entry.get("homepage") or None

        for kw in entry.get("sample_keywords", []):
            existing = (
                session.query(Keyword)
                .filter(Keyword.tenant_id == tenant.id, Keyword.text == kw)
                .one_or_none()
            )
            if existing is None:
                session.add(Keyword(tenant_id=tenant.id, text=kw, is_active=True))

        _seed_doctors(session, tenant.id, entry.get("doctors", []) or [])
        _seed_equipment(session, tenant.id, entry.get("equipment", []) or [])
        _seed_events(session, tenant.id, entry.get("events", []) or [])


def _seed_doctors(session, tenant_id: int, items: list) -> None:
    for it in items:
        existing = (
            session.query(Doctor)
            .filter(Doctor.tenant_id == tenant_id, Doctor.name == it["name"])
            .one_or_none()
        )
        if existing is None:
            session.add(
                Doctor(
                    tenant_id=tenant_id,
                    name=it["name"],
                    specialty=it.get("specialty") or None,
                    education_career=it.get("education_career") or None,
                    certifications=it.get("certifications") or None,
                    is_active=it.get("is_active", True),
                )
            )
        else:
            existing.specialty = it.get("specialty") or None
            existing.education_career = it.get("education_career") or None
            existing.certifications = it.get("certifications") or None
            existing.is_active = it.get("is_active", True)


def _seed_equipment(session, tenant_id: int, items: list) -> None:
    for it in items:
        existing = (
            session.query(Equipment)
            .filter(Equipment.tenant_id == tenant_id, Equipment.name == it["name"])
            .one_or_none()
        )
        if existing is None:
            session.add(
                Equipment(
                    tenant_id=tenant_id,
                    name=it["name"],
                    manufacturer=it.get("manufacturer") or None,
                    description=it.get("description") or None,
                    features=it.get("features") or None,
                    is_active=it.get("is_active", True),
                )
            )
        else:
            existing.manufacturer = it.get("manufacturer") or None
            existing.description = it.get("description") or None
            existing.features = it.get("features") or None
            existing.is_active = it.get("is_active", True)


def _seed_events(session, tenant_id: int, items: list) -> None:
    for it in items:
        existing = (
            session.query(EventOffer)
            .filter(EventOffer.tenant_id == tenant_id, EventOffer.name == it["name"])
            .one_or_none()
        )
        ps = _to_aware_date(it.get("period_start"))
        pe = _to_aware_date(it.get("period_end"))
        if existing is None:
            session.add(
                EventOffer(
                    tenant_id=tenant_id,
                    name=it["name"],
                    regular_price=it.get("regular_price"),
                    discount_price=it.get("discount_price"),
                    period_start=ps,
                    period_end=pe,
                    notes=it.get("notes") or None,
                    is_active=it.get("is_active", True),
                )
            )
        else:
            existing.regular_price = it.get("regular_price")
            existing.discount_price = it.get("discount_price")
            existing.period_start = ps
            existing.period_end = pe
            existing.notes = it.get("notes") or None
            existing.is_active = it.get("is_active", True)


def seed_rules(session: Session, *, verbose: bool = False) -> None:
    with RULES_YAML.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)

    tenant_id = data["tenant_id"]
    rules = data.get("rules", [])

    session.query(ComplianceRule).filter(ComplianceRule.tenant_id == tenant_id).update(
        {ComplianceRule.is_active: False}
    )

    for rule in rules:
        existing = (
            session.query(ComplianceRule)
            .filter(
                ComplianceRule.tenant_id == tenant_id,
                ComplianceRule.pattern == rule["pattern"],
            )
            .one_or_none()
        )
        if existing is None:
            session.add(
                ComplianceRule(
                    tenant_id=tenant_id,
                    rule_type=rule["type"],
                    pattern=rule["pattern"],
                    severity=rule["severity"],
                    message=rule["message"],
                    requires=rule.get("requires"),
                    is_active=True,
                )
            )
        else:
            existing.rule_type = rule["type"]
            existing.severity = rule["severity"]
            existing.message = rule["message"]
            existing.requires = rule.get("requires")
            existing.is_active = True

    if verbose:
        print(f"[+] tenant {tenant_id} compliance 룰 {len(rules)}개 시드")


def seed_if_empty(session: Session) -> bool:
    """tenant 테이블이 비어있을 때만 시드. 앱 부트스트랩에서 호출.

    Returns:
        시드를 실행했으면 True.
    """
    has_tenant = session.query(Tenant).first() is not None
    if has_tenant:
        return False
    seed_tenants(session)
    seed_rules(session)
    session.commit()
    return True
