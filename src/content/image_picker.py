"""Pollinations.AI 자동 이미지 생성 — 100% 무료, API 키 불필요.

MVP 단계 무료 이미지. 픽사 일러스트 스타일. URL 호출 → PNG bytes →
Supabase Storage 업로드 → public URL → generated_contents.cover_image_url.

환경:
    IMAGE_GEN_ENABLED       (기본 false → true 로 활성화)
    POLLINATIONS_MODEL      (기본 flux. turbo / sdxl 도 가능)
    SUPABASE_URL            Storage 업로드용
    SUPABASE_SERVICE_ROLE_KEY  Storage 권한

비용: $0. Rate limit 가끔 있지만 1/시간 수준의 cron 호출엔 충분.
"""
from __future__ import annotations

import os
import re
import hashlib
import logging
import urllib.parse
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

KEYWORD_MAP: dict[str, str] = {
    "강남라식": "LASIK eye surgery consultation in modern Gangnam clinic",
    "잠실라식": "eye examination preparation, friendly ophthalmologist",
    "송파라식": "comprehensive eye health check, warm clinic interior",
    "강남라섹": "LASEK laser eye treatment, calm patient",
    "잠실라섹": "LASEK procedure preparation",
    "백내장수술": "cataract surgery consultation with elderly patient, gentle care",
    "백내장": "cataract treatment, warm conversation between ophthalmologist and senior",
    "노안교정": "presbyopia correction consultation, senior eye health",
    "스마일라식": "SMILE laser eye treatment, modern equipment",
    "스마일": "SMILE eye surgery preparation",
    "라식": "LASIK eye surgery, modern ophthalmology clinic",
    "라섹": "LASEK eye treatment, professional clinic",
    "안과": "modern ophthalmology clinic, warm atmosphere",
    "TETE안과": "premium ophthalmology clinic with friendly staff",
    "TETE라식": "premium LASIK clinic consultation",
}

# Round 81 (2026-06-24) — 사람 제거. AI(flux)가 얼굴·손·몸을 자주 망가뜨려(찌그러짐·잘림)
#   이미지 퀄리티가 떨어지던 핵심 원인 + 강한 no-people 네거티브.
# Round 125-B (2026-07-05) — 획일화 해소. 기존엔 모든 글이 "clinic interior" 로 수렴해
#   "AI 가 쓴 글" 티가 남 (사용자 지적). 사람 배제 원칙은 유지하되 카테고리별
#   컨셉 풀(매크로 디테일·정물·추상 컨셉·아이소메트릭 일러스트·인테리어)을
#   keyword+title+섹션 해시로 회전 — 같은 병원 글끼리도 매번 다른 비주얼.
PROMPT_TEMPLATE = (
    "{context}, editorial magazine quality, soft natural light, fine detail, 8k uhd, "
    "no people, no person, no face, no hands, no text, no logo, no watermark"
)

# 자사 인사이트 — documentary 톤 한 겹 추가
PROMPT_TEMPLATE_REALISTIC = (
    "{context}, documentary editorial photography, shot on DSLR, professional color grading, "
    "sharp focus, fine detail, 8k uhd, magazine editorial quality, "
    "no people, no person, no face, no hands, no text, no logo, no watermark"
)

# Round 125-B — 카테고리별 컨셉 풀 (전부 사람 없음 · 샷 타입 5종 회전)
CONCEPT_POOLS: dict[str, list[str]] = {
    "eye": [
        "macro photography of a precision ophthalmic lens and optical examination equipment, cool clean tones",
        "still life of eyeglasses, an eye test chart and a contact lens case on a bright white desk",
        "abstract concept of clear vision, light rays focusing through a lens into sharp focus, soft bokeh background",
        "minimal 3d isometric illustration of an eye examination device and vision chart, soft pastel colors",
        "modern ophthalmology equipment room, clean panoramic interior, natural daylight",
    ],
    "derma": [
        "macro photography of a skincare serum droplet and water texture on glass, soft studio light",
        "still life of a dermatology laser handpiece and minimal cosmetic bottles on a clean counter",
        "abstract smooth gradient texture resembling healthy glowing skin, warm beige tones",
        "minimal 3d isometric illustration of skin layers diagram, soft pastel palette",
        "bright dermatology clinic treatment room, clean minimal interior",
    ],
    "plastic": [
        "still life of surgical precision instruments neatly arranged on a sterile tray, cool tones",
        "abstract elegant curves and soft shadows, beauty aesthetic concept, warm beige tones",
        "macro of measuring calipers and a face proportion sketch on a clean desk",
        "minimal 3d isometric illustration of a medical consultation room, pastel colors",
        "modern aesthetic clinic lounge, clean minimal interior, soft daylight",
    ],
    "dental": [
        "macro photography of a dental mirror and instruments on a clean tray, cool tones",
        "still life of clear dental aligners and a tooth model on a white desk",
        "minimal 3d isometric illustration of a tooth with dental care icons, pastel colors",
        "abstract clean white geometric shapes resembling healthy teeth, bright studio light",
        "modern dental clinic treatment room, bright clean interior",
    ],
    "hair": [
        "macro photography of healthy hair strands texture in soft golden light",
        "still life of hair transplant precision instruments and a microscope on a tray",
        "minimal 3d isometric illustration of hair follicle growth cycle, pastel colors",
        "abstract flowing lines resembling smooth hair strands, warm elegant tones",
        "modern hair clinic consultation room with scalp analysis equipment, clean interior",
    ],
    "oriental": [
        "still life of korean herbal medicine ingredients in wooden bowls, warm natural light",
        "macro photography of acupuncture needles and dried herbs on linen cloth, calm earthy tones",
        "traditional korean medicine cabinet with small wooden drawers, warm cozy interior",
        "minimal flat illustration of herbal leaves and a teapot, muted earth tones",
        "abstract calm zen composition of smooth stones and herbs, soft daylight",
    ],
    "marketing": [
        "close-up of an analytics dashboard with charts on a laptop screen, modern minimal desk scene",
        "abstract data network visualization with glowing nodes and connections, deep navy background",
        "still life of printed growth charts, a notebook and pen on a minimal desk, morning light",
        "minimal 3d isometric illustration of a search engine result page and content blocks, soft colors",
        "abstract upward growth graph made of light streaks, dark elegant background",
    ],
    "generic": [
        "still life of a stethoscope and a medical chart on a clean desk, soft light",
        "macro photography of laboratory glassware with soft window light, clean tones",
        "minimal 3d isometric illustration of a modern clinic building, pastel colors",
        "abstract calm gradient composition with a subtle medical motif, clean tones",
        "modern medical clinic corridor, bright minimal interior",
    ],
}


# Round 126-C (2026-07-05) — tenants.domain_category(진료과) 정확 매핑.
#   키워드 추론보다 신뢰도 높은 1차 신호. 실사고: 모우림의원(모발이식) "헤어라인교정"
#   글이 dental 키워드 "교정" 에 걸려 치아 이미지가 생성됨.
_DOMAIN_CATEGORY_MAP: dict[str, str] = {
    "안과": "eye", "피부과": "derma", "성형외과": "plastic", "치과": "dental",
    "내과": "generic", "모발이식": "hair", "한방의원": "oriental", "한방": "oriental",
    "자사인사이트": "marketing",
}


def _concept_category(keyword: str, domain_category: str | None = None) -> str:
    # 1차: tenant 진료과 정확 매핑 (있으면 무조건 우선)
    if domain_category:
        mapped = _DOMAIN_CATEGORY_MAP.get(domain_category.strip())
        if mapped:
            return mapped
    # 2차: 키워드 추론 — Round 126-C: hair 를 dental 보다 먼저 체크 + dental 의
    # 단독 "교정" 제거("치아교정"으로 구체화). "헤어라인교정" 오분류 방지.
    k = (keyword or "").strip()
    if any(kw in k for kw in ["모발", "탈모", "헤어", "두피", "비절개", "모낭"]):
        return "hair"
    if any(kw in k for kw in ["안과", "라식", "라섹", "스마일", "시력", "백내장", "노안"]):
        return "eye"
    if any(kw in k for kw in ["피부", "여드름", "필러", "보톡스", "레이저", "스킨", "리쥬란", "울쎄라"]):
        return "derma"
    if any(kw in k for kw in ["치과", "임플란트", "치아교정", "충치", "치아"]):
        return "dental"
    if any(kw in k for kw in ["성형", "안면", "양악", "쌍꺼풀", "가슴"]):
        return "plastic"
    if any(kw in k for kw in ["한방", "한의원", "한약", "다이어트 한약"]):
        return "oriental"
    if any(kw in k for kw in ["GEO", "AEO", "마케팅", "광고", "콘텐츠", "의료법", "병원", "SEO", "검색", "SaaS"]):
        return "marketing"
    return "generic"


def pick_concept(keyword: str, salt: str = "", domain_category: str | None = None) -> str:
    """카테고리 컨셉 풀에서 결정적(deterministic) 회전 선택.

    domain_category(tenant 진료과)가 있으면 키워드 추론보다 우선.
    salt 에 title/섹션제목/인덱스를 섞으면 같은 키워드의 글·섹션끼리도
    서로 다른 비주얼 컨셉이 나온다.
    """
    pool = CONCEPT_POOLS.get(
        _concept_category(keyword, domain_category), CONCEPT_POOLS["generic"]
    )
    h = int(hashlib.md5(f"{keyword}|{salt}".encode("utf-8")).hexdigest(), 16)
    return pool[h % len(pool)]


_PEOPLE_WORDS_RE = re.compile(
    r"\b(consultation|patient|patients|people|person|doctor|doctors|professional|"
    r"professionals|woman|women|man|men|senior|seniors|elderly|child|children|staff|"
    r"team|portrait|face|faces|hand|hands|surgeon|nurse|nurses)\b",
    re.IGNORECASE,
)


def _people_free(ctx: str) -> str:
    """프롬프트 context 에서 사람 명사를 제거(공간·장비 중심으로)."""
    out = _PEOPLE_WORDS_RE.sub("", ctx or "")
    out = re.sub(r"\s{2,}", " ", out)
    return out.strip(" ,")


def keyword_to_english_context(keyword: str) -> str:
    k = keyword.strip()
    if k in KEYWORD_MAP:
        return KEYWORD_MAP[k]
    for ko, en in KEYWORD_MAP.items():
        if ko in k or k in ko:
            return en
    if any(kw in k for kw in ["안과", "라식", "라섹", "스마일", "시력", "백내장", "노안"]):
        return f"korean ophthalmology clinic consultation about {k}"
    return f"korean medical clinic, friendly consultation about {k}"


def keyword_to_unsplash_query(keyword: str) -> str:
    """Unsplash 검색 전용 query — 영문만 (한글 query 는 매칭 0개).

    Round 30 fix (2026-05-30): keyword_to_english_context 가 fallback 에서
    원본 한글 키워드 `{k}` 를 query 에 포함 → Unsplash 매칭 0개 → Pollinations fallback.
    Unsplash 전용 함수로 카테고리별 영문 query 만 반환.

    Round 102 (2026-06-29): 사용자 요구 "외국인 지양". Unsplash 결과가 대부분 백인
    인물 사진이라 인종 문제 회피 위해 **사람 없는 인테리어/장비/장소** query 로 통일.
    "korean clinic" 검색해도 실제로는 백인 나오는 게 태반. clinic interior/equipment
    쿼리면 사람 대신 공간·기기가 매칭돼 인종 무관 (DALL-E 실패 fallback 안전망).
    """
    k = keyword.strip()
    # Round 125-B — 인테리어 고정 → 카테고리별 query 풀 회전 (사람 없는 사물/개념 위주).
    _pools = {
        "eye": ["eyeglasses close up", "optometry equipment", "eye chart", "contact lens macro"],
        "derma": ["skincare texture", "cosmetic serum bottle", "spa still life", "water droplet macro"],
        "plastic": ["minimal medical instruments", "clean aesthetic still life", "modern clinic detail"],
        "dental": ["dental tools", "tooth model", "dental clinic detail"],
        "hair": ["hair texture close up", "microscope laboratory", "comb still life"],
        "oriental": ["herbal medicine", "korean tea ceremony", "dried herbs wooden"],
        "marketing": ["analytics dashboard laptop", "data chart desk", "growth graph"],
        "generic": ["medical equipment detail", "stethoscope desk", "laboratory glassware"],
    }
    _cat = _concept_category(k)
    _pool = _pools.get(_cat, _pools["generic"])
    _h = int(hashlib.md5(k.encode("utf-8")).hexdigest(), 16)
    return _pool[_h % len(_pool)]


def build_prompt(
    keyword: str,
    title: Optional[str] = None,
    *,
    realistic: bool = False,
    domain_category: Optional[str] = None,
) -> str:
    """Pollinations prompt 빌더.

    Round 125-B — 고정 인테리어 템플릿 → 컨셉 풀 회전 (title 을 salt 로 사용해
    같은 키워드 글끼리도 다른 비주얼). 사람 배제 네거티브는 템플릿이 유지.
    Round 126-C — domain_category(진료과) 우선 매핑.
    """
    context = _people_free(
        pick_concept(keyword, salt=(title or ""), domain_category=domain_category)
    )
    template = PROMPT_TEMPLATE_REALISTIC if realistic else PROMPT_TEMPLATE
    return template.format(context=context)


def is_enabled() -> bool:
    # Round 81 (2026-06-24) — opt-out 으로 변경 (기존: 기본값 "" → 미설정/빈값이면 False).
    #   IMAGE_GEN_ENABLED 가 GitHub cron 외 경로(Streamlit '지금 1회 실행', 로컬 등)에 없으면
    #   cover + 본문 일러스트가 통째로 조용히 꺼져 콘텐츠가 밋밋해지던 footgun.
    #   이제 명시적 비활성('false'/'0'/'no'/'off')일 때만 끄고, 미설정/빈값/그 외는 활성.
    val = (os.environ.get("IMAGE_GEN_ENABLED") or "").strip().lower()
    return val not in ("0", "false", "no", "off")


def _slugify_for_filename(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9가-힣\-_]", "-", s.lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "image"


def _slugify_for_storage_path(s: str) -> str:
    """Supabase Storage path 용 — 한글 거부 (InvalidKey 400).

    Round 30 fix (2026-05-30): _slugify_for_filename 은 alt/title 용도로 한글 유지.
    Storage path 의 key 에 한글이 들어가면 400 InvalidKey 거부.
    별도 함수로 영문/숫자/하이픈/언더스코어만 허용.
    """
    s = re.sub(r"[^a-zA-Z0-9\-_]", "-", s.lower())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:60] or "img"


def generate_image_for_content(
    keyword: str,
    title: Optional[str] = None,
    *,
    width: int = 1280,
    height: int = 720,
    is_self_tenant: bool = False,
    domain_category: Optional[str] = None,
) -> Optional[dict]:
    """Cover 이미지 생성 + Supabase Storage 업로드.

    Round 29 (2026-05-30):
        - is_self_tenant=True 면 자사 인사이트 → Unsplash 우선 (실사 톤) + Pollinations realistic fallback
        - is_self_tenant=False 면 파트너 → Pollinations Pixar 톤 (기존 동작)

    Returns:
        {url, alt, prompt, generated_at, source} | None
    """
    if not is_enabled():
        logger.info("IMAGE_GEN_ENABLED != true — 이미지 생성 skip")
        return None

    # Round 108-a (2026-07-03) — Nano Banana (Gemini 2.5 Flash Image) 우선.
    # OpenAI tier 2 는 dall-e-3/dall-e-2 접근 불가 (Round 107 진단).
    # Gemini paid tier 는 Nano Banana 접근 가능 (ListModels 로 실측 확인).
    # IMAGE_STRICT_DALLE=true (Round 105 잔재) 이면 fallback 안 함 → image None.
    _strict = (os.getenv("IMAGE_STRICT_DALLE") or os.getenv("IMAGE_STRICT") or "true").strip().lower() == "true"
    try:
        from src.content.nano_banana_client import is_nano_banana_enabled, generate_nano_banana_image
        if is_nano_banana_enabled():
            # 재시도 3회 (rate limit / 일시 실패 대응)
            for attempt in range(3):
                nb = generate_nano_banana_image(
                    keyword, title,
                    is_self_tenant=is_self_tenant, domain_category=domain_category,
                )
                if nb and nb.get("url"):
                    logger.info("Nano Banana cover 생성 성공 (attempt=%d): %s", attempt, nb["url"][:80])
                    return nb
                if attempt < 2:
                    logger.warning("Nano Banana 실패(attempt=%d) — 5초 후 재시도", attempt)
                    import time as _t
                    _t.sleep(5)
            if _strict:
                logger.error(
                    "Nano Banana 3회 실패 — IMAGE_STRICT=true 로 fallback 차단. "
                    "image_url=None 반환. GEMINI_API_KEY GH Secret 확인 필요."
                )
                return None
            logger.info("Nano Banana skip/실패 — Unsplash/Pollinations fallback (STRICT=false)")
        else:
            if _strict:
                logger.error(
                    "Nano Banana 비활성 (GEMINI_API_KEY 미설정 or IMAGE_PROVIDER 부적합) — "
                    "STRICT=true 이므로 image_url=None."
                )
                return None
    except Exception as e:  # noqa: BLE001
        if _strict:
            logger.error("Nano Banana 분기 예외 — STRICT=true 이므로 image None: %s", e)
            return None
        logger.warning("Nano Banana 분기 실패 — fallback: %s", e)

    # Round 102 (2026-06-29) — 자사 인사이트에서 Unsplash 제거.
    # 사용자 명시 요구: "한국 모델 원함, 외국인 지양". Unsplash 는 대부분 백인 사진이라
    # 근본적으로 요구와 상충. DALL-E 실패 시 Pollinations realistic (한국인 프롬프트) 로 바로.
    # 옵트인: USE_UNSPLASH_FOR_SELF_CONTENT=true 시에만 자사에도 Unsplash 사용.
    _allow_unsplash_self = (os.getenv("USE_UNSPLASH_FOR_SELF_CONTENT", "false") or "false").strip().lower() == "true"
    if is_self_tenant and _allow_unsplash_self:
        try:
            from src.content.unsplash_client import fetch_unsplash_to_storage
            # Round 30 fix (2026-05-30): keyword_to_english_context 의 fallback 이
            # 한글 keyword 를 query 에 포함시킴 → Unsplash 매칭 0개. 전용 함수로 대체.
            unsplash_query = keyword_to_unsplash_query(keyword)
            uns = fetch_unsplash_to_storage(
                unsplash_query,
                name_hint=f"cover-{keyword}",
                subdir="cover",
            )
            if uns and uns.get("url"):
                # Round 81 — Unsplash 약관: 작가 크레딧(이름|프로필링크)을 cover_image_prompt 에
                #   파싱 가능한 형태로 저장 → 블로그 figcaption 이 클릭 가능한 링크로 렌더.
                _author = uns.get("author", "Unsplash")
                _alink = uns.get("author_link", "https://unsplash.com")
                return {
                    "url": uns["url"],
                    "alt": f"{title or keyword}",
                    "prompt": f"unsplash_credit|{_author}|{_alink}",
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "source": "unsplash",
                }
        except Exception as e:  # noqa: BLE001
            logger.warning("Unsplash fallback failed: %s — try Pollinations", e)
        # Unsplash 실패 → Pollinations realistic fallback

    prompt = build_prompt(
        keyword, title, realistic=is_self_tenant, domain_category=domain_category
    )
    model = os.environ.get("POLLINATIONS_MODEL", "flux")
    # Round 73 — 모든 cover 1600x900 으로 통일 (품질 개선)
    width, height = 1600, 900
    seed = abs(hash(keyword + (title or ""))) % (2**31)
    alt_text = f"{title or keyword}"

    encoded = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&model={model}&seed={seed}&nologo=true&enhance=true"
    )

    # Round 81 (2026-06-23) — 함정 CJ: Pollinations 5xx/timeout 시 cover NULL 군집(16편).
    #   기존엔 다운로드 실패 → return None → cover NULL. 이제 재시도 2회 + 최종 실패 시에도
    #   raw Pollinations URL fallback (None 반환 금지). 브라우저가 로드 시 on-the-fly 재생성.
    img_bytes: bytes | None = None
    for attempt in range(2):
        try:
            with httpx.Client(timeout=45, follow_redirects=True) as client:
                r = client.get(url)
                r.raise_for_status()
                img_bytes = r.content
            if img_bytes and len(img_bytes) >= 1024:
                break
            logger.warning("Pollinations 응답 너무 작음(attempt %d): %d bytes", attempt, len(img_bytes or b""))
            img_bytes = None
        except Exception as e:  # noqa: BLE001
            logger.warning("Pollinations 호출 실패(attempt %d): %s", attempt, e)
            img_bytes = None

    if not img_bytes:
        logger.warning("Pollinations 다운로드 최종 실패 → raw URL fallback (cover NULL 회피)")
        return {
            "url": url,
            "alt": alt_text,
            "prompt": prompt,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "pollinations_raw_fallback",
        }

    storage_url = _upload_to_supabase(img_bytes, keyword, title)
    if not storage_url:
        # Round 60 fix (2026-06-01) — Storage upload 실패 시 raw Pollinations URL 그대로 사용.
        # 한 달간 cover 비어있던 함정 (Storage 401/500 시 cover NULL 채로 저장).
        # medimap-blog 의 next.config.js 가 image.pollinations.ai remote pattern 이미 허용.
        # 단점: Pollinations 가 다운되면 깨진 이미지. 그래도 NULL 보다 시각 우위.
        logger.warning(
            "Storage upload 실패 → raw Pollinations URL fallback (cover NULL 회피)"
        )
        return {
            "url": url,  # raw Pollinations URL
            "alt": alt_text,
            "prompt": prompt,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "pollinations_raw",  # source 구분
        }

    return {
        "url": storage_url,
        "alt": alt_text,
        "prompt": prompt,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "pollinations",
    }


def _upload_to_supabase(img_bytes: bytes, keyword: str, title: Optional[str]) -> Optional[str]:
    supa_url = os.environ.get("SUPABASE_URL")
    supa_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not (supa_url and supa_key):
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정")
        return None

    bucket = "post-images"
    sha = hashlib.sha1(img_bytes).hexdigest()[:10]
    # Round 30 fix (2026-05-30): Storage path 는 한글 거부 (InvalidKey 400)
    # → _slugify_for_storage_path 로 영문/숫자만. alt/title 용 slug 는 _slugify_for_filename.
    slug = _slugify_for_storage_path(title or keyword)
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    path = f"{today}/{slug}-{sha}.jpg"

    upload_url = f"{supa_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {supa_key}",
        "apikey": supa_key,
        "Content-Type": "image/jpeg",
        "x-upsert": "true",
    }
    try:
        with httpx.Client(timeout=30) as client:
            r = client.post(upload_url, content=img_bytes, headers=headers)
            if r.status_code not in (200, 201):
                logger.warning("Storage 업로드 실패 status=%s body=%s", r.status_code, r.text[:200])
                return None
    except Exception as e:
        logger.exception("Storage 업로드 예외: %s", e)
        return None

    return f"{supa_url}/storage/v1/object/public/{bucket}/{path}"


def attach_image_html(body_html: str, image: dict) -> str:
    """blog_html 본문 맨 위에 <figure> hero 이미지 삽입."""
    figure = (
        f'<figure class="post-hero">'
        f'<img src="{image["url"]}" alt="{image["alt"]}" loading="eager" decoding="async" />'
        f'<figcaption>{image["alt"]}</figcaption>'
        f'</figure>'
    )
    if "</h1>" in body_html:
        return body_html.replace("</h1>", "</h1>" + figure, 1)
    return figure + body_html


# ============================================================================
# 2026-05-28 Round 22 — Phase 3 body 일러스트 N장 정책
# ============================================================================

BODY_FIGURE_TEMPLATE = (
    '<figure style="margin: 2.5em 0;">\n'
    '  <img src="{url}" alt="{alt}" loading="lazy" '
    'style="width: 100%; height: auto; border-radius: 12px;" />\n'
    '  <figcaption style="text-align: center; color: #64748b; '
    'font-size: 0.9em; margin-top: 0.6em;">{caption}</figcaption>\n'
    '</figure>\n\n'
)


def generate_body_illustration_for_section(
    keyword: str,
    section_heading: str,
    *,
    index: int,
    width: int = 1200,
    height: int = 630,
    domain_category: Optional[str] = None,
) -> Optional[dict]:
    """본문 H2 섹션 1개당 일러스트 1장.

    Round 26 (2026-05-29): Pollinations URL 호출 → bytes → Supabase Storage 업로드 →
    영구 public URL 반환. 이전 Round 22~25 는 Pollinations URL 직접 삽입 → lazy gen
    으로 인한 X 박스 빈발. Storage 업로드 후 안정적인 CDN URL 사용.

    seed 는 index 로 분기해 같은 키워드 안에서도 그림이 겹치지 않도록 함.
    Storage 업로드 실패 시 Pollinations URL fallback (graceful — figure 가 사라지지 않게).
    """
    if not is_enabled():
        return None

    # 섹션 제목에서 이모지/특수문자 제거 (Pollinations prompt 정화)
    clean_heading = re.sub(r"[^\w가-힣\s]+", " ", section_heading).strip()
    # Round 125-B — 섹션 제목+인덱스를 salt 로 컨셉 회전: 한 글 안의 본문 이미지들이
    # 서로 다른 샷 타입(매크로/정물/추상/일러스트/공간)을 갖는다. 사람 배제 유지.
    # Round 126-C — ① 섹션 헤딩을 주제로 직접 주입(글 맥락) ② 진료과 우선 매핑.
    en_ctx = _people_free(
        pick_concept(keyword, salt=f"{clean_heading}:{index}", domain_category=domain_category)
    )
    _topic = f", related to the article section '{clean_heading}'" if clean_heading else ""
    prompt = (
        f"{en_ctx}{_topic}, editorial magazine quality, soft natural light, fine detail, 8k, "
        f"no people, no person, no face, no hands, no text, no logo"
    )
    model = os.environ.get("POLLINATIONS_MODEL", "flux")
    seed = (abs(hash(keyword + clean_heading)) % (2**24)) + index

    encoded = urllib.parse.quote(prompt)
    pollinations_url = (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={width}&height={height}&model={model}&seed={seed}&nologo=true&enhance=true"
    )

    # Round 26: Storage 업로드 → 영구 URL. 실패 시 Pollinations URL fallback.
    final_url = pollinations_url
    try:
        from src.content.image_uploader import storage_url_for_section_figure
        final_url = storage_url_for_section_figure(
            pollinations_url,
            keyword=keyword,
            section_heading=clean_heading or keyword,
        )
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "image_picker.body.storage_upload_failed err=%s — fallback to pollinations URL",
            e,
        )

    return {
        "url": final_url,
        "alt": (section_heading or keyword)[:120],
        "caption": (section_heading or keyword)[:120],
        "prompt": prompt,
    }


def inject_body_illustrations(
    body_html: str,
    keyword: str,
    *,
    max_count: int = 4,
    domain_category: Optional[str] = None,
) -> str:
    """본문 HTML 의 <h2> 직전에 figure 를 max_count 개까지 삽입.

    Round 17 SQL 패턴과 동일한 결과(<h2> 앞 figure) 를 코드로 생성.
    이미 figure 가 충분히 있는 글은 건드리지 않음 (멱등).
    """
    if not body_html or max_count <= 0:
        return body_html

    # 이미 figure 가 max_count 이상이면 skip — 재실행 시 중복 방지(멱등).
    # cover_image_url 은 별도 컬럼이라 body figure 카운트에 포함하지 않음.
    existing = body_html.count("<figure")
    if existing >= max_count:
        return body_html

    # <h2 ...>제목</h2> 추출 — 본문 H2 만 (제목 h1 제외)
    h2_pattern = re.compile(r'(<h2[^>]*>)(.*?)(</h2>)', re.IGNORECASE | re.DOTALL)
    matches = list(h2_pattern.finditer(body_html))
    if not matches:
        return body_html

    # 첫 H2 는 인사이트 글에서 보통 hook 이므로 두 번째부터 사용
    target_indices = list(range(1, min(len(matches), max_count + 1)))
    if not target_indices:
        target_indices = [0]

    # 뒤에서부터 삽입 — 앞 인덱스 offset 변동 회피
    insertions: list[tuple[int, str]] = []
    for k, idx in enumerate(target_indices):
        m = matches[idx]
        # 텍스트만 추출 (inner HTML 의 이모지/스타일은 보존)
        heading_text = re.sub(r"<[^>]+>", "", m.group(2)).strip()
        img = generate_body_illustration_for_section(
            keyword, heading_text, index=k, domain_category=domain_category
        )
        if not img:
            continue
        figure = BODY_FIGURE_TEMPLATE.format(
            url=img["url"], alt=img["alt"], caption=img["caption"]
        )
        insertions.append((m.start(), figure))

    if not insertions:
        return body_html

    # 뒤에서부터 substring insert
    result = body_html
    for pos, figure in sorted(insertions, key=lambda x: -x[0]):
        result = result[:pos] + figure + result[pos:]
    return result
