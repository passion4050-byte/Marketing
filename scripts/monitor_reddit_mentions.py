"""Round 162 (2026-08-16) — Reddit 브랜드 언급 모니터 (텍스트 축 방어).

경쟁사(growly) 데이터: AI 인용 1위 = Reddit 40.1%. 부정 스레드 1개가 잠재고객
이탈로 직결되므로, 파트너 병원 언급을 주기적으로 수집해 신규 발견 시 이메일로
알린다. **참여는 하지 않는다** — 인위 참여(위장 계정)는 수행하지 않고, 발견된
스레드에 어떻게 대응할지는 사람이 결정한다(공개 신분 참여 가이드는 필드 시트 참조).

동작:
- 해외 상품 active 테넌트의 브랜드 검색어(name_en + name)로 Reddit 공개 검색
  JSON API 조회 (읽기 전용, OAuth 불필요. 429/403 시 해당 쿼리 skip).
- reddit_mentions 에 permalink 기준 upsert — 신규 행만 이메일 (중복 알림 없음).
- 3일 주기 (map-axis-monitor.yml).

환경변수: DATABASE_URL(필수), RESEND_API_KEY, RESEND_FROM, NOTIFY_EMAIL,
  EXTRA_QUERIES (선택, '|' 구분 — 테넌트 무관 추가 감시어)
"""
from __future__ import annotations

import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import requests  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("reddit-mention-monitor")

UA = "wecircle-geo-monitor/1.0 (brand mention monitoring; contact: passion4050@gmail.com)"


def send_email(subject: str, html: str) -> bool:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    to = os.getenv("NOTIFY_EMAIL", "passion4050@gmail.com").strip()
    sender = os.getenv("RESEND_FROM", "onboarding@resend.dev").strip()
    if not api_key:
        logger.warning("RESEND_API_KEY 미설정 — 이메일 생략 (수집은 정상 수행됨)")
        return False
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"from": f"WECIRCLE GEO <{sender}>", "to": [to], "subject": subject, "html": html},
        timeout=30,
    )
    if resp.status_code >= 300:
        logger.error("Resend 발송 실패 %s: %s", resp.status_code, resp.text[:300])
        return False
    logger.info("이메일 발송 완료 → %s", to)
    return True


def search_reddit(query: str, limit: int = 25) -> list[dict]:
    """Reddit 공개 검색 (읽기 전용). 차단 시 빈 목록 — 다음 주기 재시도."""
    try:
        resp = requests.get(
            "https://www.reddit.com/search.json",
            params={"q": f'"{query}"', "sort": "new", "t": "year", "limit": limit},
            headers={"User-Agent": UA},
            timeout=30,
        )
    except requests.RequestException as e:
        logger.warning("reddit 요청 실패(%s): %s", query, e)
        return []
    if resp.status_code != 200:
        logger.warning("reddit 응답 %s (%s) — skip", resp.status_code, query)
        return []
    try:
        children = resp.json().get("data", {}).get("children", [])
    except ValueError:
        return []
    out = []
    for ch in children:
        d = ch.get("data", {})
        if not d.get("permalink"):
            continue
        out.append(
            {
                "permalink": f"https://www.reddit.com{d['permalink']}",
                "subreddit": d.get("subreddit"),
                "kind": "comment" if ch.get("kind") == "t1" else "post",
                "title": d.get("title") or d.get("link_title"),
                "snippet": (d.get("selftext") or d.get("body") or "")[:500],
                "author": d.get("author"),
                "score": d.get("score"),
                "num_comments": d.get("num_comments"),
                "created_utc": datetime.fromtimestamp(
                    d.get("created_utc", 0), tz=timezone.utc
                ),
            }
        )
    return out


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1

    engine = create_engine(db_url, pool_pre_ping=True)
    new_rows: list[dict] = []
    with engine.begin() as conn:
        tenants = conn.execute(
            text(
                "SELECT DISTINCT t.id, t.name, t.name_en FROM tenants t "
                "JOIN tenant_products tp ON tp.tenant_id = t.id "
                "WHERE tp.market = 'overseas' AND tp.status = 'active'"
            )
        ).fetchall()

        jobs: list[tuple[int | None, str]] = []
        for tid, name, name_en in tenants:
            if name_en:
                jobs.append((tid, name_en))
            if name:
                jobs.append((tid, name))
        for q in os.getenv("EXTRA_QUERIES", "").split("|"):
            if q.strip():
                jobs.append((None, q.strip()))

        seen_queries = set()
        for tid, query in jobs:
            key = query.lower()
            if key in seen_queries:
                continue
            seen_queries.add(key)
            mentions = search_reddit(query)
            logger.info("검색 '%s' → %s건", query, len(mentions))
            for m in mentions:
                inserted = conn.execute(
                    text(
                        "INSERT INTO reddit_mentions "
                        "(tenant_id, permalink, subreddit, kind, title, snippet, author, "
                        " score, num_comments, query, created_utc) "
                        "VALUES (:tid, :permalink, :subreddit, :kind, :title, :snippet, "
                        " :author, :score, :num_comments, :query, :created_utc) "
                        "ON CONFLICT (permalink) DO NOTHING RETURNING id"
                    ),
                    {"tid": tid, "query": query, **m},
                ).fetchone()
                if inserted:
                    new_rows.append({"tenant_id": tid, "query": query, **m})
            time.sleep(2)  # rate limit 예의

        if new_rows:
            items = "".join(
                f"<li><a href='{r['permalink']}'>{(r['title'] or r['permalink'])[:120]}</a>"
                f" — r/{r['subreddit']} · {r['kind']} · score {r['score']}"
                f" · 검색어: {r['query']}<br>"
                f"<span style='color:#78716c;font-size:12px'>{(r['snippet'] or '')[:200]}</span></li>"
                for r in new_rows[:30]
            )
            send_email(
                f"[WECIRCLE] Reddit 신규 언급 {len(new_rows)}건",
                "<p>파트너 병원 관련 Reddit 신규 언급이 발견되었습니다. "
                "대응 방침: 인위 참여 금지 — 공개 신분 참여 가이드(필드 시트) 참조.</p>"
                f"<ul>{items}</ul>",
            )
            new_count = len(new_rows)
            conn.execute(
                text(
                    "UPDATE reddit_mentions SET emailed_at = now() "
                    "WHERE emailed_at IS NULL"
                )
            )
            logger.info("신규 %s건 — 이메일 알림 완료", new_count)
        else:
            logger.info("신규 언급 없음")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
