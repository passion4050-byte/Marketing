"""마케팅 funnel 인프라 — UTM 자동 주입, 표준 CTA 블록, 단축도메인 redirect.

Phase 7-03/04 산출물.
"""

from src.marketing.funnel import (
    inject_utm,
    apply_publication_funnel,
    UtmParams,
)
from src.marketing.cta_templates import (
    cta_block_for_channel,
    append_cta_to_content,
    STANDARD_CTA,
)
from src.marketing.ga4 import (
    fetch_pageviews,
    join_with_publications,
    is_configured as ga4_configured,
    PageViewRow,
)

__all__ = [
    "inject_utm",
    "apply_publication_funnel",
    "UtmParams",
    "cta_block_for_channel",
    "append_cta_to_content",
    "STANDARD_CTA",
    "fetch_pageviews",
    "join_with_publications",
    "ga4_configured",
    "PageViewRow",
]
