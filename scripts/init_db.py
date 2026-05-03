"""DB 스키마 생성 + sample tenants/compliance rules 시드.

Usage:
    python scripts/init_db.py             # 신규 또는 idempotent 업서트
    python scripts/init_db.py --reset     # drop_all 후 재생성 (개발용)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Windows 콘솔에서 한글 깨짐 방지
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# src를 path에 올리기 — uv/pip install 안 한 환경에서도 동작
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from datetime import datetime, time, timezone  # noqa: E402

from src.storage.db import drop_all, get_session_factory  # noqa: E402
from src.storage.models import (  # noqa: E402
    ComplianceRule,
    Doctor,
    Equipment,
    EventOffer,
    Keyword,
    Tenant,
)

load_dotenv(ROOT / ".env")

from src.observability.logging_config import configure_logging  # noqa: E402

configure_logging()

TENANTS_YAML = ROOT / "config" / "tenants.yaml"
RULES_YAML = ROOT / "config" / "compliance_rules" / "default.yaml"


def _seed_tenants(session) -> None:
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
            print(f"[~] tenant 업데이트: {tenant.name}")

        # Sample keywords (Phase 1 시드)
        for kw in entry.get("sample_keywords", []):
            existing = (
                session.query(Keyword)
                .filter(Keyword.tenant_id == tenant.id, Keyword.text == kw)
                .one_or_none()
            )
            if existing is None:
                session.add(Keyword(tenant_id=tenant.id, text=kw, is_active=True))

        # Doctors / Equipment / Events 시드 (Phase 1.5 — Data Feeding)
        _seed_doctors(session, tenant.id, entry.get("doctors", []) or [])
        _seed_equipment(session, tenant.id, entry.get("equipment", []) or [])
        _seed_events(session, tenant.id, entry.get("events", []) or [])


def _to_aware_date(s):
    if s is None:
        return None
    if isinstance(s, datetime):
        return s if s.tzinfo else s.replace(tzinfo=timezone.utc)
    if isinstance(s, str):
        # YYYY-MM-DD
        try:
            d = datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            d = datetime.fromisoformat(s)
        return d.replace(tzinfo=timezone.utc)
    # date object
    return datetime.combine(s, time.min, tzinfo=timezone.utc)


def _seed_doctors(session, tenant_id: int, items: list) -> None:
    if not items:
        return
    # idempotent — name 기준 upsert
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
    print(f"[+] tenant {tenant_id} 의사 {len(items)}명 시드")


def _seed_equipment(session, tenant_id: int, items: list) -> None:
    if not items:
        return
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
    print(f"[+] tenant {tenant_id} 장비 {len(items)}개 시드")


def _seed_events(session, tenant_id: int, items: list) -> None:
    if not items:
        return
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
    print(f"[+] tenant {tenant_id} 이벤트 {len(items)}개 시드")


def _seed_rules(session) -> None:
    with RULES_YAML.open(encoding="utf-8") as f:
        data = yaml.safe_load(f)

    tenant_id = data["tenant_id"]
    rules = data.get("rules", [])

    # 기존 룰 비활성화 (idempotent — 중복 추가 방지)
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

    print(f"[+] tenant {tenant_id} compliance 룰 {len(rules)}개 시드")


def _run_alembic_upgrade() -> None:
    """Alembic upgrade head — Phase 2-T1.5 기점으로 create_all() 대체."""
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(ROOT / "alembic.ini"))
    command.upgrade(cfg, "head")


def main() -> None:
    parser = argparse.ArgumentParser(description="DB 초기화 + sample seed")
    parser.add_argument("--reset", action="store_true", help="drop_all 후 재생성 (개발용)")
    args = parser.parse_args()

    if args.reset:
        print("[!] DB drop_all → alembic upgrade head")
        drop_all()

    print("[+] alembic upgrade head 실행 중...")
    _run_alembic_upgrade()
    print("[+] 스키마/마이그레이션 적용 완료")

    factory = get_session_factory()
    with factory() as session:
        _seed_tenants(session)
        _seed_rules(session)
        session.commit()

    print("[done] init_db OK")


if __name__ == "__main__":
    main()
