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

from src.storage.db import create_all, drop_all, get_session_factory  # noqa: E402
from src.storage.models import ComplianceRule, Keyword, Tenant  # noqa: E402

load_dotenv(ROOT / ".env")

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
            )
            session.add(tenant)
            print(f"[+] tenant 생성: {tenant.name}")
        else:
            tenant.name = entry["name"]
            tenant.domain_category = entry["domain_category"]
            tenant.region = entry["region"]
            tenant.business_model = entry.get("business_model", "")
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


def main() -> None:
    parser = argparse.ArgumentParser(description="DB 초기화 + sample seed")
    parser.add_argument("--reset", action="store_true", help="drop_all 후 재생성 (개발용)")
    args = parser.parse_args()

    if args.reset:
        print("[!] DB drop_all → create_all")
        drop_all()
    create_all()
    print("[+] 스키마 생성 완료")

    factory = get_session_factory()
    with factory() as session:
        _seed_tenants(session)
        _seed_rules(session)
        session.commit()

    print("[done] init_db OK")


if __name__ == "__main__":
    main()
