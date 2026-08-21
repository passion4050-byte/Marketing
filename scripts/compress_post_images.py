"""Round 170 (2026-08-21) — post-images 원본 축소 재압축 (DRY_RUN 기본).

배경: 2026-08-21 사이트 전역 이미지 엑박. /_next/image 가 모든 요청에
402 PAYMENT_REQUIRED(OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) — Vercel Hobby
이미지 변환 쿼터(5,000회/월) 소진. 응급조치로 next.config.js 에
images.unoptimized=true 를 넣어 Supabase 원본을 직배송 중이나, 원본이
평균 1.0MB · 최대 3.4MB PNG 라 모바일 LCP 가 나쁘다.

이 스크립트는 **원본 자체를 작게** 만든다 (Vercel·Supabase 어느 쪽 변환
과금도 쓰지 않는 무료 해법):
- 대상: storage.objects(bucket=post-images) 중 size > MIN_BYTES
- 처리: 긴 변(가로) 상한까지 축소 → JPEG(q=QUALITY) 재인코딩
        (투명도가 실제로 있는 이미지만 WEBP — 알파 보존)
        커버(기본 1200px) / 본문 body/ 접두사(기본 900px)
- 저장: **같은 object name 으로 덮어쓰기** → 공개 URL 불변
        → generated_contents.cover_image_url/body 를 한 줄도 건드리지 않는다.
        (확장자는 .png 로 남지만 Content-Type 헤더가 진실이며
         모든 최신 브라우저가 헤더를 따른다)

안전장치:
- DRY_RUN=1(기본): 계산만, 업로드 없음
- LIMIT(기본 300): 한 번에 처리할 최대 개수 — 나눠서 여러 번 실행
- MIN_SAVING_RATIO(기본 0.15): 15% 미만으로만 줄면 건드리지 않음
- 업로드 직후 재다운로드 검증 — 열리지 않으면 즉시 중단
- 연속 실패 MAX_CONSECUTIVE_FAILURES(5) 시 중단
- 삭제 명령 없음 (덮어쓰기만)

환경변수: DATABASE_URL · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
  선택: DRY_RUN(1) · LIMIT(300) · COVER_MAX_W(1200) · BODY_MAX_W(900)
        QUALITY(82) · MIN_BYTES(250000) · ONLY_PREFIX("") · FORMAT(""|JPEG|WEBP)
"""
from __future__ import annotations

import io
import logging
import os
import sys

import requests
from PIL import Image
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("compress-post-images")

BUCKET = "post-images"
MAX_CONSECUTIVE_FAILURES = 5
SUPPORTED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}

PICK_SQL = """
SELECT o.name,
       COALESCE((o.metadata->>'size')::bigint, 0) AS size,
       COALESCE(o.metadata->>'mimetype', '') AS mime
FROM storage.objects o
WHERE o.bucket_id = :bucket
  AND COALESCE((o.metadata->>'size')::bigint, 0) > :min_bytes
  AND (:prefix = '' OR o.name LIKE :prefix_like)
ORDER BY COALESCE((o.metadata->>'size')::bigint, 0) DESC
LIMIT :limit
"""

TOTAL_SQL = """
SELECT count(*) AS n, COALESCE(sum((metadata->>'size')::bigint), 0) AS bytes
FROM storage.objects WHERE bucket_id = :bucket
"""


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)).strip() or default)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)).strip() or default)
    except ValueError:
        return default


def target_width(name: str, cover_w: int, body_w: int) -> int:
    return body_w if name.startswith("body/") else cover_w


def has_alpha(im) -> bool:
    """실제로 투명 픽셀이 있는지 (P/RGBA 라도 전부 불투명이면 False)."""
    if im.mode not in ("RGBA", "LA", "P"):
        return False
    conv = im.convert("RGBA")
    alpha = conv.getchannel("A")
    lo, _hi = alpha.getextrema()
    return lo < 250


def recompress(raw: bytes, max_w: int, quality: int) -> tuple[bytes, int, int, str] | None:
    """원본 바이트 → (재인코딩 바이트, w, h, mime). 실패 시 None.

    포맷 선택:
      - 투명도가 실제로 있는 이미지 → WEBP (알파 보존)
      - 그 외(대부분의 커버·사진) → **JPEG**
        WEBP 가 20~25% 더 작지만, 커버는 og:image 로 카카오톡·네이버
        공유 미리보기에 쓰인다. 일부 구형 OG 스크레이퍼가 WEBP 를 못 읽어
        미리보기가 비는 사고가 나면 CTA 유입에 직접 손해다. 호환성 우선.
        (FORMAT=WEBP 로 강제 전환 가능)
    """
    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
    except Exception as e:  # pragma: no cover
        logger.warning("  이미지 열기 실패: %s", e)
        return None

    force = os.getenv("FORMAT", "").strip().upper()
    keep_alpha = has_alpha(im)
    fmt = force if force in ("JPEG", "WEBP") else ("WEBP" if keep_alpha else "JPEG")

    if fmt == "WEBP" and keep_alpha:
        im = im.convert("RGBA")
    else:
        if im.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", im.size, (255, 255, 255))
            conv = im.convert("RGBA")
            bg.paste(conv, mask=conv.getchannel("A"))
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")

    w, h = im.size
    if w > max_w:
        im = im.resize((max_w, max(1, round(h * max_w / w))), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == "JPEG":
        im.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
        mime = "image/jpeg"
    else:
        im.save(buf, format="WEBP", quality=quality, method=6)
        mime = "image/webp"
    return buf.getvalue(), im.size[0], im.size[1], mime


def main() -> int:
    db_url = os.getenv("DATABASE_URL", "").strip()
    if not db_url:
        logger.error("DATABASE_URL 미설정")
        return 1
    dry = os.getenv("DRY_RUN", "1").strip() != "0"
    limit = _env_int("LIMIT", 300)
    cover_w = _env_int("COVER_MAX_W", 1200)
    body_w = _env_int("BODY_MAX_W", 900)
    quality = _env_int("QUALITY", 82)
    min_bytes = _env_int("MIN_BYTES", 250_000)
    min_saving = _env_float("MIN_SAVING_RATIO", 0.15)
    prefix = os.getenv("ONLY_PREFIX", "").strip()

    supa_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    supa_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supa_url or not supa_key:
        logger.error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 필요 (DRY_RUN 도 다운로드에 사용)")
        return 1

    engine = create_engine(db_url, pool_pre_ping=True)
    with engine.connect() as conn:
        tot = conn.execute(text(TOTAL_SQL), {"bucket": BUCKET}).one()
        rows = conn.execute(
            text(PICK_SQL),
            {
                "bucket": BUCKET,
                "min_bytes": min_bytes,
                "limit": limit,
                "prefix": prefix,
                "prefix_like": f"{prefix}%",
            },
        ).fetchall()

    logger.info(
        "버킷 %s 전체 %s개 · %.0f MB | 대상(>%.0fKB%s) %s개 · 커버 %spx / 본문 %spx / q%s",
        BUCKET, tot.n, tot.bytes / 1048576, min_bytes / 1024,
        f", prefix={prefix}" if prefix else "", len(rows), cover_w, body_w, quality,
    )
    if not rows:
        logger.info("대상 없음 — 종료")
        return 0

    headers = {"Authorization": f"Bearer {supa_key}", "apikey": supa_key}
    base = f"{supa_url}/storage/v1"
    before = after = 0
    done = skipped = 0
    consecutive_failures = 0

    for i, r in enumerate(rows, 1):
        name, size, mime = r.name, r.size, (r.mime or "").lower()
        if mime and mime not in SUPPORTED_MIME:
            logger.info("[%s/%s] skip(mime=%s) %s", i, len(rows), mime, name)
            skipped += 1
            continue
        try:
            g = requests.get(f"{base}/object/public/{BUCKET}/{name}", timeout=60)
            if g.status_code >= 300:
                raise RuntimeError(f"download {g.status_code}")
            out = recompress(g.content, target_width(name, cover_w, body_w), quality)
            if out is None:
                raise RuntimeError("decode failed")
            data, w, h, mime_out = out
            consecutive_failures = 0
        except Exception as e:
            consecutive_failures += 1
            logger.warning("[%s/%s] 실패(%s) %s", i, len(rows), e, name)
            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                logger.error("연속 실패 %s회 — 중단", consecutive_failures)
                return 1
            skipped += 1
            continue

        saving = 1 - len(data) / max(1, size)
        if saving < min_saving:
            logger.info(
                "[%s/%s] skip(절감 %.0f%% < %.0f%%) %s", i, len(rows),
                100 * saving, 100 * min_saving, name,
            )
            skipped += 1
            continue

        before += size
        after += len(data)
        logger.info(
            "[%s/%s] %s  %.0fKB → %.0fKB (-%.0f%%, %sx%s)%s",
            i, len(rows), name, size / 1024, len(data) / 1024, 100 * saving, w, h,
            "  [DRY]" if dry else "",
        )
        if dry:
            done += 1
            continue

        up = requests.put(
            f"{base}/object/{BUCKET}/{name}",
            data=data,
            headers={
                **headers,
                "Content-Type": mime_out,
                "Cache-Control": "public, max-age=31536000, immutable",
                "x-upsert": "true",
            },
            timeout=120,
        )
        if up.status_code >= 300:
            up = requests.post(
                f"{base}/object/{BUCKET}/{name}",
                data=data,
                headers={
                    **headers,
                    "Content-Type": mime_out,
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "x-upsert": "true",
                },
                timeout=120,
            )
        if up.status_code >= 300:
            logger.error("업로드 실패(%s) %s: %s", up.status_code, name, up.text[:300])
            return 1

        # 업로드 검증 — 다시 받아서 열리는지 확인. 깨졌으면 즉시 중단.
        v = requests.get(f"{base}/object/public/{BUCKET}/{name}", timeout=60)
        try:
            Image.open(io.BytesIO(v.content)).verify()
        except Exception as e:
            logger.error("검증 실패 — 업로드본이 열리지 않음 %s (%s) — 즉시 중단", name, e)
            return 1
        done += 1

    logger.info(
        "완료 — 처리 %s개 · 건너뜀 %s개 · %.0f MB → %.0f MB (-%.0f%%)%s",
        done, skipped, before / 1048576, after / 1048576,
        100 * (1 - after / max(1, before)),
        "  ※ DRY_RUN=1 — 실제 업로드 없음. 실행하려면 DRY_RUN=0" if dry else "",
    )
    if not dry and len(rows) == limit:
        logger.info("LIMIT(%s) 가득 참 — 남은 대상이 더 있을 수 있으니 재실행 권장", limit)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
