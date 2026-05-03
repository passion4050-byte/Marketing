"""Schema.org JSON-LD 템플릿. 정의서 §5.3.2.

자사 웹페이지 <head>에 그대로 복사 붙여넣을 수 있는 형태로 출력.
"""

from __future__ import annotations

import json
from typing import Iterable

from src.content.llm import FAQPair


def faq_page_jsonld(qa_pairs: Iterable[FAQPair]) -> dict:
    """FAQPage Schema.org dict (raw)."""
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": p.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": p.answer,
                },
            }
            for p in qa_pairs
        ],
    }


def faq_page_script_tag(qa_pairs: Iterable[FAQPair]) -> str:
    """`<script type="application/ld+json">...</script>` 형태 — 사이트에 바로 삽입."""
    payload = faq_page_jsonld(qa_pairs)
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return f'<script type="application/ld+json">\n{body}\n</script>'


def medical_business_jsonld(name: str, region: str, category: str) -> dict:
    """MedicalBusiness Schema.org dict.

    정의서 §5.3.2 — tenant 기본 정보 구조화.
    """
    return {
        "@context": "https://schema.org",
        "@type": "MedicalBusiness",
        "name": name,
        "areaServed": region,
        "medicalSpecialty": category,
    }


def medical_business_script_tag(name: str, region: str, category: str) -> str:
    payload = medical_business_jsonld(name, region, category)
    body = json.dumps(payload, ensure_ascii=False, indent=2)
    return f'<script type="application/ld+json">\n{body}\n</script>'
