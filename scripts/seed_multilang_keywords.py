"""Round 164 (2026-08-17) — 전 병원 ko 키워드 → 4개 언어 트랜스크리에이션 시딩.

사용자 결정: 국내 콘텐츠 영향력을 en·ja·zh-Hans·zh-Hant 로 확장 — 직역 백필이 아니라
키워드 시딩 방식(우리 전략: 그 언어 사용자의 실제 검색어). 시딩 후에는 기존 데일리
로테이션 + tenant_products 게이팅이 언어별 네이티브 글을 자동 생성·발행한다.

동작:
- 대상: partner_slug 보유(자사 제외) 테넌트의 active ko own 키워드.
- 테넌트별 해외 상품 active 언어 중, 같은 언어에 이미 있는 키워드(소문자 일치)는 skip.
- 번역: analyze_rank_levers.translate_keyword 재사용 (Claude 트랜스크리에이션 —
  직역 금지·대륙/대만 용어 분리 프롬프트 내장).
- 멱등: (tenant, lang, lower(text)) 중복 삽입 없음. 재실행 안전.
- KEYWORD_CAP (기본 400): 이번 실행에서 번역할 ko 키워드 상한 (비용 가드).

환경변수: DATABASE_URL(필수), ANTHROPIC_API_KEY(필수 — 없으면 전체 skip),
  ANTHROPIC_MODEL, KEYWORD_CAP, DRY_RUN(1 = 삽입 없이 목록만)
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from sqlalchemy import create_engine, text  # noqa: E402

from analyze_rank_levers import translate_keyword  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("seed-multilang-keywords")

TARGET_LANGS = ["en", "ja", "zh-Hans", "zh-Hant"]


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        logger.error("ANTHROPIC_API_KEY 미설정 — 트랜스크리에이션 불가")
        return 1
    dry = os.getenv("DRY_RUN", "").strip() == "1"
    cap = int(os.getenv("KEYWORD_CAP", "400"))

    engine = create_engine(db_url, pool_pre_ping=True)
    translated = 0
    inserted = 0
    with engine.begin() as conn:
        tenants = conn.execute(
            text(
                "SELECT t.id, t.name, COALESCE(t.name_en, t.name) AS brand "
                "FROM tenants t WHERE t.partner_slug IS NOT NULL "
                "AND COALESCE(t.business_model,'') <> 'self' "
                "AND t.partner_slug NOT IN ('medimap-self','wecircle-self') ORDER BY t.id"
            )
        ).fetchall()

        for tid, tname, brand in tenants:
            active_langs = [
                r[0]
                for r in conn.execute(
                    text(
                        "SELECT lang FROM tenant_products WHERE tenant_id=:tid "
                        "AND market='overseas' AND status='active'"
                    ),
                    {"tid": tid},
                ).fetchall()
                if r[0] in TARGET_LANGS
            ]
            if not active_langs:
                continue

            ko_rows = conn.execute(
                text(
                    "SELECT id, text, category FROM keywords WHERE tenant_id=:tid "
                    "AND lang='ko' AND is_active=true AND (purpose='own' OR purpose IS NULL) "
                    "ORDER BY id"
                ),
                {"tid": tid},
            ).fetchall()
            if not ko_rows:
                continue

            existing: dict[str, set[str]] = {}
            for lang in active_langs:
                existing[lang] = {
                    (r[0] or "").strip().lower()
                    for r in conn.execute(
                        text("SELECT text FROM keywords WHERE tenant_id=:tid AND lang=:lang"),
                        {"tid": tid, "lang": lang},
                    ).fetchall()
                }

            for _kid, ko_text, category in ko_rows:
                if translated >= cap:
                    logger.warning("KEYWORD_CAP(%s) 도달 — 다음 실행에서 이어감 (멱등)", cap)
                    break
                # 이미 전 언어에 충분히 시딩된 키워드는 번역 호출 자체를 생략할 수 없으므로
                # (1:1 매핑 없음), 언어별 기존 수량 휴리스틱: 모든 대상 언어에 ko own 수 이상
                # 있으면 skip — 재실행 시 중복 번역 비용 방지.
                langs_needing = [
                    lang for lang in active_langs if len(existing[lang]) < len(ko_rows)
                ]
                if not langs_needing:
                    break
                result = translate_keyword(ko_text, langs_needing)
                translated += 1
                if not result:
                    logger.warning("번역 실패: %s (%s)", ko_text, tname)
                    continue
                for lang, tr_text in result.items():
                    tr_norm = (tr_text or "").strip()
                    if not tr_norm or tr_norm.lower() in existing.get(lang, set()):
                        continue
                    if dry:
                        logger.info("[DRY] %s(%s) %s → [%s] %s", tname, tid, ko_text, lang, tr_norm)
                        continue
                    conn.execute(
                        text(
                            "INSERT INTO keywords "
                            "(tenant_id, text, category, target_brand, is_active, purpose, market, lang) "
                            "VALUES (:tid, :text, :cat, :brand, true, 'own', 'overseas', :lang)"
                        ),
                        {"tid": tid, "text": tr_norm, "cat": category, "brand": brand, "lang": lang},
                    )
                    existing[lang].add(tr_norm.lower())
                    inserted += 1
            logger.info("%s(%s): 번역 진행 누계 %s · 삽입 누계 %s", tname, tid, translated, inserted)
            if translated >= cap:
                break

    logger.info("완료 — ko 키워드 %s건 번역, 해외 키워드 %s건 시딩%s", translated, inserted, " (DRY)" if dry else "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
