"""Round 173b (2026-08-23) - deterministic internal-link repair and injection.

Why this is not a prompt fix
---------------------------
Round 165 added an `[내부 링크 — 권장]` directive that hands the model the *absolute*
URLs of the tenant's own published posts and says, in so many words, "never invent a
URL that is not in this list". Measured outcome across 234 published ko partner posts:

    href="/with-partners/{slug}"          (2 segments - 404)   45
    href=".../{cat}/{partner}/{slug}"     (correct)             7
    no internal link at all                                   182

So the model both truncated the paths it was given AND skipped the directive entirely
on most runs. Every one of those 45 links is a 404 that spends crawl budget and leaks
link equity - on a site whose GSC diagnosis is that Google never crawls 326 of its
URLs in the first place.

Instruction-following is the wrong layer for a constraint that is mechanically
checkable. This module runs after the body is rendered and:

  1. rewrites an internal link whose final path segment matches a known post,
  2. unwraps (keeps the anchor text, drops the <a>) anything it cannot resolve,
  3. appends a small "함께 읽으면 좋은 글" block when fewer than `min_links` remain,
     so topic clustering does not depend on the model cooperating.

Pure string work, no I/O - the caller supplies the candidate list.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

SITE = "https://wecircle.co.kr"

_OVERSEAS_LANG_PATH = {"en": "en", "ja": "ja", "zh-Hans": "zh", "zh-Hant": "tw"}

# medimap-blog/src/app/with-partners/.../page.tsx::stripReferenceSection 와 동일한 패턴.
_REF_H2 = re.compile(
    r"<h2[^>]*>\s*(?:참고\s*자료|참고\s*문헌|References?)\s*</h2>", re.IGNORECASE
)

_A_TAG = re.compile(
    r'<a\b[^>]*\bhref\s*=\s*"([^"]*)"[^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class LinkCandidate:
    """One of the tenant's own published posts, with its canonical path."""

    title: str
    slug: str
    path: str  # site-relative, always starts with "/"


def canonical_path(
    *,
    lang: str,
    is_partner: bool,
    partner_category: str | None,
    partner_slug: str | None,
    slug: str,
) -> str | None:
    """Site-relative canonical path for a published post, or None if unresolvable.

    Mirrors medimap-blog/src/lib/posts.ts::canonicalPathFor - if these two ever
    disagree, generated links start pointing at 308 redirects instead of the real URL.
    """
    slug = (slug or "").strip()
    if not slug:
        return None
    lang = (lang or "ko").strip() or "ko"
    cat = (partner_category or "").strip()
    pslug = (partner_slug or "").strip()

    if lang != "ko":
        lp = _OVERSEAS_LANG_PATH.get(lang)
        if not lp:
            return None
        if is_partner and cat and pslug:
            return f"/{lp}/clinics/{cat}/{pslug}/{slug}"
        return f"/{lp}/guides/{slug}"

    if is_partner and cat and pslug and pslug != "wecircle-self":
        return f"/with-partners/{cat}/{pslug}/{slug}"
    return f"/blog/{slug}"


def _to_path(href: str) -> str | None:
    """Return the site-relative path for an internal href, else None (external)."""
    h = (href or "").strip()
    if not h:
        return None
    for prefix in (SITE, "http://wecircle.co.kr", "https://www.wecircle.co.kr"):
        if h.startswith(prefix):
            h = h[len(prefix) :] or "/"
            break
    if not h.startswith("/"):
        return None  # external, mailto:, tel:, #anchor
    return h.split("#", 1)[0].split("?", 1)[0].rstrip("/") or "/"


# Hub routes that always exist regardless of the candidate list. Without this,
# a perfectly good link to a category hub (/with-partners/eyeclinic) or to a partner
# hub (/with-partners/eyeclinic/bgn) would be unwrapped as "unresolvable".
_STATIC_HUBS = {"/", "/blog", "/all", "/with-partners", "/guide", "/about", "/contact"}

# ⚠ Must be matched by a CLOSED list, not by shape. `/with-partners/{one-segment}` is
#   both the category-hub shape AND the exact malformed shape this module exists to
#   catch (`/with-partners/{post-slug}`, 45 live 404s). Only a real category name
#   distinguishes them.
#   Keep in sync with medimap-blog/src/lib/partners.ts::PARTNER_CATEGORIES.
_PARTNER_CATEGORIES = (
    "eyeclinic", "derma", "plastic", "dental", "internal", "hair", "oriental",
)
_CAT = "|".join(_PARTNER_CATEGORIES)
_HUB_SHAPES = (
    re.compile(rf"^/with-partners/({_CAT})$"),                    # category hub
    re.compile(rf"^/with-partners/({_CAT})/[a-z0-9-]+$"),         # partner hub
    re.compile(r"^/(en|ja|zh|tw)(/(blog|clinics|about|contact))?$"),
    re.compile(rf"^/(en|ja|zh|tw)/clinics/({_CAT})(/[a-z0-9-]+)?$"),
    re.compile(r"^/(en|ja|zh|tw)/blog/category/[a-z0-9_-]+$"),
)


def _is_known_hub(path: str) -> bool:
    if path in _STATIC_HUBS:
        return True
    return any(rx.match(path) for rx in _HUB_SHAPES)


def sanitize(
    body: str,
    candidates: list[LinkCandidate],
    *,
    self_slug: str | None = None,
) -> tuple[str, int, int]:
    """Repair or remove internal links. Returns (body, n_fixed, n_dropped).

    External links are never touched - reference citations must survive.
    """
    by_path = {c.path: c for c in candidates}
    by_slug = {c.slug: c for c in candidates}
    fixed = 0
    dropped = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal fixed, dropped
        href, inner = m.group(1), m.group(2)
        path = _to_path(href)
        if path is None:
            return m.group(0)  # external - leave alone
        if path in by_path or _is_known_hub(path):
            # already correct; normalise absolute -> relative for consistency
            return f'<a href="{path}">{inner}</a>' if href != path else m.group(0)
        tail = path.rsplit("/", 1)[-1]
        if self_slug and tail == self_slug:
            dropped += 1
            return inner  # self-link adds nothing
        target = by_slug.get(tail)
        if target is not None:
            fixed += 1
            return f'<a href="{target.path}">{inner}</a>'
        dropped += 1
        return inner  # unresolvable - keep the sentence, drop the dead link

    return _A_TAG.sub(repl, body), fixed, dropped


def _existing_internal_paths(body: str) -> set[str]:
    out: set[str] = set()
    for m in _A_TAG.finditer(body):
        p = _to_path(m.group(1))
        if p:
            out.add(p)
    return out


def ensure(
    body: str,
    candidates: list[LinkCandidate],
    *,
    self_slug: str | None = None,
    min_links: int = 2,
    heading: str = "함께 읽으면 좋은 글",
) -> tuple[str, int]:
    """Guarantee at least `min_links` valid internal links. Returns (body, n_added).

    Appended as a labelled block rather than forced into prose: a reader-visible
    "related reading" list is honest about what it is, and it is the shape Google
    already understands as topic clustering.
    """
    have = _existing_internal_paths(body)
    need = min_links - len(have)
    if need <= 0:
        return body, 0
    pick = [
        c
        for c in candidates
        if c.path not in have and (self_slug is None or c.slug != self_slug)
    ][:need]
    if not pick:
        return body, 0
    items = "".join(f'<li><a href="{c.path}">{c.title}</a></li>' for c in pick)
    block = f"<h2>{heading}</h2><ul>{items}</ul>"
    # ⚠ 문서 맨 끝에 붙이면 안 되는 경우가 있다.
    #   medimap-blog 의 파트너 상세 렌더러(stripReferenceSection)는
    #   <h2>참고 자료|참고 문헌|References</h2> 부터 **문서 끝까지** 통째로 잘라낸다.
    #   그 뒤에 붙이면 사용자에게도 구글에게도 안 보인다 — 링크를 보장하려던 코드가
    #   조용히 아무것도 안 하게 된다. 참고자료 h2 가 있으면 그 앞에 넣는다.
    #   (현재 발행본 234편 중 해당 h2 는 0건이지만, 렌더러가 그 케이스를 처리하는 이상
    #    프롬프트가 바뀌면 언제든 다시 생긴다.)
    m = _REF_H2.search(body)
    if m:
        return body[: m.start()] + block + body[m.start() :], len(pick)
    return body.rstrip() + block, len(pick)


def apply(
    body: str,
    candidates: list[LinkCandidate],
    *,
    self_slug: str | None = None,
    min_links: int = 2,
) -> tuple[str, dict[str, int]]:
    """sanitize() then ensure(). Returns (body, stats) for structured logging."""
    body, fixed, dropped = sanitize(body, candidates, self_slug=self_slug)
    body, added = ensure(body, candidates, self_slug=self_slug, min_links=min_links)
    return body, {"fixed": fixed, "dropped": dropped, "added": added}
