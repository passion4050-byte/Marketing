"""LLM 프로바이더 추상화 — Phase 1 + Phase 1.5.

지원 프로바이더:
- stub      : 미리 작성된 의료법 안전 FAQ + 블로그 post 반환 (키 0개, 즉시 동작)
- gemini    : Google Gemini Flash (무료 free tier)
- anthropic : Claude (유료)
- openai    : GPT (유료)

토글: .env 의 LLM_PROVIDER.

비용 가드레일:
- 호출 전 generations_today 카운트를 체크. MAX_CONTENT_GEN_PER_DAY 초과 시 raise.
- 일자별 카운트는 GeneratedContent.created_at 기반으로 DB에서 계산.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.storage.models import GeneratedContent

# Round 63 (2026-06-22) — module-level logger 누락 fix.
#   FallbackProvider / _build_provider_chain 이 logger.info/warning 사용 →
#   logger 미정의로 fallback 모드에서 NameError ("name 'logger' is not defined").
#   anthropic 단일 모드에선 FallbackProvider 미생성이라 안 드러났던 잠복 버그.
logger = logging.getLogger(__name__)


@dataclass
class FAQPair:
    question: str
    answer: str


@dataclass
class GenerationResult:
    qa_pairs: list[FAQPair]
    raw_text: str
    provider: str
    angle: str = ""  # 다중 발행 시 각 호출의 관점


@dataclass
class BlogGenerationResult:
    """LLM이 반환한 블로그 post의 dict 형태 + raw text."""

    post_dict: dict
    raw_text: str
    provider: str
    angle: str = ""


@dataclass
class NaverBlogGenerationResult:
    """네이버 블로그 평문 — Phase 2-T2.3."""

    post_dict: dict   # naver_blog.post_from_dict() 가 받는 schema
    raw_text: str
    provider: str
    angle: str = ""


@dataclass
class InstagramGenerationResult:
    """Instagram 캡션 — Phase 2-T2.3."""

    caption_dict: dict  # instagram.post_from_dict() 가 받는 schema
    raw_text: str
    provider: str
    angle: str = ""


class LLMError(RuntimeError):
    pass


class CostGuardrailExceeded(LLMError):
    pass


# ─── Provider Protocol ──────────────────────────────────────────


class LLMProvider(Protocol):
    name: str

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        angle: str = "",
        tenant_data_block: str = "",
        correction_hint: str | None = None,
    ) -> GenerationResult: ...

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_homepage: str = "",
        tenant_phone: str = "",
        references_block: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> BlogGenerationResult: ...

    def generate_naver_blog(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_phone: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> NaverBlogGenerationResult: ...

    def generate_instagram(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_data_block: str = "",
        angle: str = "",
        correction_hint: str | None = None,
    ) -> InstagramGenerationResult: ...


# ─── Stub Provider (키 없이 즉시 동작) ──────────────────────────


_STUB_FAQS_GENERIC = [
    FAQPair(
        question="{keyword}을(를) 고를 때 가장 중요한 기준은 뭔가요?",
        answer="✅ {tenant_name}은 **환자 개개인의 눈 상태**, 의료진의 시술 경험, 그리고 **충분한 사전 검사**를 가장 중요한 기준으로 봅니다. 의료법상 절대적 보장은 어렵지만, 임상 데이터와 환자 만족도 자료를 바탕으로 상담을 진행해요. 결과는 개인차가 있을 수 있습니다.",
    ),
    FAQPair(
        question="시술 전 어떤 검사를 받게 되나요?",
        answer="🩺 {tenant_name}에서는 시력, 안압, **각막 두께**, 각막 지형도 같은 기본 검사 외에 생활 습관과 직업 환경까지 고려한 종합 상담을 진행합니다. 검사 결과에 따라 적합한 시술법이 다르게 안내됩니다.",
    ),
    FAQPair(
        question="시술 후 회복 기간은 얼마나 걸리나요?",
        answer="⏱️ 시술 종류와 회복 속도에 따라 차이가 있는데, 일상 복귀까지는 보통 **1~3일**, 안정화는 약 **1~3개월** 정도로 안내됩니다. {tenant_name}은 회복 기간 중 정기 경과 관찰을 통해 사후 관리를 돕습니다.",
    ),
    FAQPair(
        question="시술 후 부작용이나 후유증이 있을 수 있나요?",
        answer="📌 모든 의료 시술은 부작용 가능성을 동반합니다. {tenant_name}은 시술 전 **사전 검사**로 가능성을 점검하고, 시술 후 이상 증상 발생 시 신속 대응하는 사후 관리 체계를 운영합니다. 효과·부작용은 개인차가 있을 수 있습니다.",
    ),
    FAQPair(
        question="상담 예약은 어떻게 진행되나요?",
        answer="💡 {tenant_name}은 전화 또는 홈페이지를 통한 **사전 예약**을 권장합니다. 첫 상담 시 약 **1~2시간**의 정밀 검사 후, 의료진과 1:1로 시술 가능 여부와 권장 시술법을 안내받게 됩니다.",
    ),
]


_STUB_BLOG_ANGLES = [
    "검사 단계와 사전 준비",
    "회복 기간과 일상 복귀",
    "비용 구조와 합리적 비교",
    "부작용과 사후 관리",
    "시술법 선택 기준",
    "의료진 상담 활용법",
    "직업별 회복 가이드",
    "장기 관찰과 정기 점검",
    "가족과 상의할 포인트",
    "후기/사례 활용 팁",
]

# 다중 발행 시 phase별로 골고루 다른 각도. 호출자가 인덱스로 픽.
DEFAULT_BLOG_ANGLES = _STUB_BLOG_ANGLES

# FAQ는 \"사용자가 AI에게 묻는 일반 질문 카테고리\"를 다양하게 커버
DEFAULT_FAQ_ANGLES = [
    "비용/가격대 관련 질문",
    "검사·사전 준비 관련 질문",
    "회복·일상 복귀 관련 질문",
    "부작용·후유증 관련 질문",
    "시술법·옵션 비교 관련 질문",
    "의료진·병원 선택 기준 관련 질문",
    "직장인/학생 등 직업별 고려사항",
    "보험·환불·실손 관련 질문",
    "이벤트/할인 안전성 관련 질문",
    "장기 관리·정기 점검 관련 질문",
]


def pick_angles(angles: list[str], count: int) -> list[str]:
    """다중 발행용 angle을 count개 만큼 순환 픽."""
    if count <= 0:
        return []
    if not angles:
        return [""] * count
    out = []
    for i in range(count):
        out.append(angles[i % len(angles)])
    return out


def _stub_blog_post(
    keyword: str,
    tenant_name: str,
    tenant_address: str,
    tenant_naver_place_url: str,
    image_count: int,
    angle: str = "",
) -> dict:
    """미리 작성된 사람-톤 의료법 안전 블로그 post.

    angle이 있으면 title과 첫 섹션이 그 관점으로 살짝 변형 (다중 발행 시 중복 회피).
    볼드/이모지 포함된 자연 톤.
    """
    angle_label = angle or "처음 알아볼 때 꼭 확인해야 할 것들"
    addr_line = ""
    if tenant_address or tenant_naver_place_url:
        place_part = f" 네이버 지도({tenant_naver_place_url})에서도 확인하실 수 있습니다." if tenant_naver_place_url else ""
        addr_line = (
            f"📍 **{tenant_name}** 위치 안내: {tenant_address or '서울'}.{place_part}"
        )

    refs = []
    if tenant_naver_place_url:
        refs.append(tenant_naver_place_url)

    return {
        "title": f"{keyword}, {angle_label}",
        "meta_description": (
            f"{keyword}을(를) 고민 중이라면 먼저 읽어보세요. "
            f"{tenant_name}에서 자주 받는 질문 위주로 검사·회복·비용을 정직하게 정리했습니다. "
            "결과는 개인차가 있을 수 있어요."
        )[:155],
        "keywords": [keyword, tenant_name, "사전 검사", "회복 기간", "상담"],
        "canonical_keyword": keyword,
        "intro_paragraphs": [
            (
                f"💡 {keyword}을(를) 알아보러 다니는 분들 얘기를 듣다 보면, 묻는 질문은 의외로 비슷합니다. "
                "\"**검사는 얼마나 걸리는지**\", \"**부작용은 정말 없는지**\", \"**비용은 합리적인지**\". "
                "오늘은 이 세 가지를 중심으로, 그 사이에 흔히 빠지는 함정도 함께 짚어보려고 합니다."
            ),
            (
                "참고로 이 글은 의료광고 가이드라인을 지켜 작성했고, 특정 시술이나 결과를 보장하는 표현은 의도적으로 배제했습니다. "
                "결과는 **개인의 눈 상태와 생활습관에 따라 다를 수 있습니다**."
            ),
        ],
        "sections": [
            {
                "heading": "🩺 검사 단계, 생각보다 시간이 걸립니다",
                "paragraphs": [
                    (
                        "처음 병원에 방문하면 시력만 확인하고 끝날 거라고 생각하시는 분이 많습니다. "
                        "그런데 실제로는 시력, 안압, **각막 두께**, 각막 지형도, 동공 크기 등 10개에 가까운 항목을 짚어요. "
                        "직장인 분이라면 점심시간에 잠깐 들렀다 가는 일정으로는 빠듯할 수 있습니다."
                    ),
                    (
                        f"{tenant_name}에서는 첫 검사에 보통 **1~2시간**을 잡으시라고 안내드립니다. "
                        "검사 결과를 의사 선생님과 1:1로 살펴보는 시간이 함께 포함돼서 그렇습니다."
                    ),
                ],
                "sub_sections": [
                    {
                        "heading": "검사 결과지, 가방에 넣지 마세요",
                        "paragraphs": [
                            (
                                "각막 두께 같은 수치는 **시술 가능 여부의 핵심 변수**입니다. "
                                "수치가 경계에 있다면 한 가지 시술법만 권장되는 경우도 있어요. "
                                "결과지를 그냥 챙기지 말고, 어떤 수치가 무슨 의미인지 한 번 더 묻고 가시는 걸 권장합니다."
                            )
                        ],
                    }
                ],
            },
            {
                "heading": "⏱️ 회복 기간, 평균치보다 본인의 직업이 중요합니다",
                "paragraphs": [
                    (
                        "회복 기간은 시술 종류에 따라 1일에서 수개월까지 차이가 있습니다. "
                        "다만 평균치보다 더 중요한 건, **본인의 직업과 생활 환경**이에요. "
                        "장시간 모니터를 봐야 하는 직군, 운동 강도가 높은 직군, 건조한 사무 환경에서 일하는 분들은 "
                        "회복 일정과 사후 관리가 다르게 잡힙니다."
                    ),
                    (
                        "이런 점을 상담 단계에서 솔직히 말씀하시면, 시술법 선택 자체가 달라질 수 있어요. "
                        "예를 들어 같은 시력이라도 회복 시간 여유가 있는 분과 그렇지 않은 분에게 권장되는 옵션이 다른 경우가 많습니다."
                    ),
                ],
                "sub_sections": [],
            },
            {
                "heading": "📌 비용보다 \"무엇이 포함되어 있는지\"를 보세요",
                "paragraphs": [
                    (
                        "표면 가격만 비교하면 함정에 빠지기 쉽습니다. "
                        "**사후 검진, 보호용 안경, 인공눈물, 추가 보정 시술**까지 포함된 가격인지 꼭 확인해보시기 바랍니다. "
                        "같은 금액이라도 포함 항목이 다르면 실제 부담은 크게 차이가 날 수 있어요."
                    ),
                    (
                        "이벤트 가격이 있다면 종료일과 조건을 함께 적은 자료를 받아두시는 게 좋습니다. "
                        "병원 측 안내가 변경될 때 근거가 됩니다."
                    ),
                ],
                "sub_sections": [],
            },
        ],
        "conclusion_paragraphs": [
            (
                "정리하면, 검사는 시간 여유를 두고 결과지를 챙기시고, "
                "회복은 본인 직업·생활을 의사 선생님과 솔직히 나누시고, "
                "비용은 \"포함 항목\"으로 판단하시길 권장드립니다. "
                f"**{tenant_name}**은 이 세 가지를 상담 첫 시간에 함께 점검하는 절차로 운영하고 있어요."
            ),
            (addr_line if addr_line else ""),
            (
                "효과와 부작용은 개인차가 있을 수 있고, 이 글은 일반적인 안내입니다. "
                "구체적인 진단과 권고는 정밀 검사 후 의료진의 판단을 따르세요."
            ),
        ],
        "references": refs,
    }


class StubProvider:
    """API 키 없이 즉시 동작하는 데모 프로바이더.

    의료법 안전 표현 + 사람-톤 콘텐츠 반환.
    """

    name = "stub"

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        angle: str = "",
        tenant_data_block: str = "",
        correction_hint: str | None = None,
    ) -> GenerationResult:
        # angle이 있으면 첫 질문에 angle을 살짝 끼워 다양성 확보
        pairs = []
        for i, tpl in enumerate(_STUB_FAQS_GENERIC[:n_pairs]):
            q = tpl.question.format(keyword=keyword, tenant_name=tenant_name)
            a = tpl.answer.format(keyword=keyword, tenant_name=tenant_name)
            if i == 0 and angle:
                q = f"({angle}) {q}"
            pairs.append(FAQPair(question=q, answer=a))
        raw = json.dumps([{"q": p.question, "a": p.answer} for p in pairs], ensure_ascii=False, indent=2)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name, angle=angle)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_homepage: str = "",
        tenant_phone: str = "",
        references_block: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        post = _stub_blog_post(
            keyword=keyword,
            tenant_name=tenant_name,
            tenant_address=tenant_address,
            tenant_naver_place_url=tenant_naver_place_url,
            image_count=image_count,
            angle=angle,
        )
        raw = json.dumps(post, ensure_ascii=False, indent=2)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_naver_blog(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_phone: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> NaverBlogGenerationResult:
        post = _stub_naver_blog(
            keyword=keyword,
            tenant_name=tenant_name,
            image_count=image_count,
            angle=angle,
        )
        raw = json.dumps(post, ensure_ascii=False, indent=2)
        return NaverBlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_instagram(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_data_block: str = "",
        angle: str = "",
        correction_hint: str | None = None,
    ) -> InstagramGenerationResult:
        cap = _stub_instagram_caption(
            keyword=keyword,
            tenant_name=tenant_name,
            angle=angle,
        )
        raw = json.dumps(cap, ensure_ascii=False, indent=2)
        return InstagramGenerationResult(caption_dict=cap, raw_text=raw, provider=self.name, angle=angle)


# ─── Stub Naver/Instagram 견본 ───────────────────────────────


def _stub_naver_blog(keyword: str, tenant_name: str, image_count: int, angle: str = "") -> dict:
    """미리 작성된 의료법 안전 + 사람-톤 네이버 블로그 견본.

    1500~2500자 범위, 이모지 헤더, 위치/해시태그.
    """
    angle_label = angle or "처음 알아볼 때 꼭 확인해야 할 것들"
    intro = [
        f"안녕하세요, 오늘은 {keyword}을(를) 고민 중이신 분들을 위해 평소 자주 받는 질문들을 정리해 봤습니다.",
        f"개인적으로 {tenant_name}에서 상담 받으면서 느낀 점, 그리고 검사·회복까지의 흐름을 솔직하게 적어볼게요.",
    ]
    sections = [
        {
            "heading": "💡 1. 어떤 검사부터 받게 되나요?",
            "paragraphs": [
                f"{keyword} 시술을 결정하기 전에는 **사전 검사**가 정말 중요해요.",
                "시력, 안압, 각막 두께, 각막 지형도 같은 기본 검사 외에 직업·생활 환경까지 고려한 종합 상담이 진행됩니다.",
                f"{tenant_name}에서는 검사 결과지를 직접 보면서 의료진과 1:1로 시술 가능 여부를 확인할 수 있었습니다.",
            ],
        },
        {
            "heading": "🩺 2. 회복 기간은 얼마나 걸리는 편인가요?",
            "paragraphs": [
                f"({angle_label}) 시술 종류에 따라 차이가 있는데, 일상 복귀까지는 보통 **1~3일**, 안정화는 약 **1~3개월** 정도로 안내됩니다.",
                "직장인이라면 휴가 일정에 맞춰 시기를 조율하시는 분들이 많아요. 회복 기간 중에는 정기 경과 관찰을 받는 게 좋습니다.",
                "효과나 회복 속도는 개인차가 있을 수 있으니 진료의 판단을 우선해주세요.",
            ],
        },
        {
            "heading": "📌 3. 부작용·후유증 가능성은요?",
            "paragraphs": [
                "모든 의료 시술은 부작용 가능성을 동반합니다. 가장 안전한 방법은 **사전 검사**를 통해 가능성을 미리 점검하는 것이에요.",
                f"{tenant_name}에서는 시술 후 이상 증상이 발생하면 신속히 대응할 수 있도록 사후 관리 체계를 운영하고 있습니다.",
            ],
        },
        {
            "heading": "🗓️ 4. 상담 예약은 어떻게 하나요?",
            "paragraphs": [
                f"전화 또는 홈페이지를 통한 **사전 예약**을 권장합니다.",
                "첫 상담 시에는 약 1~2시간의 정밀 검사 후, 의료진과 함께 시술 가능 여부와 권장 시술법을 안내받게 됩니다.",
            ],
        },
    ]
    conclusion = [
        f"{keyword}을(를) 고민하실 때, 가장 중요한 건 본인의 눈 상태에 맞는 시술을 선택하는 것입니다.",
        "후기보다는 **정밀 검사 결과**를 우선하고, 필요하면 두 번 상담받는 것도 좋아요. 이 글이 결정에 도움이 되셨으면 합니다.",
    ]
    hashtags = [keyword, f"{tenant_name}", "안과", "라식", "라섹", "시력교정", "강남안과"]
    return {
        "title": f"{keyword}, {angle_label}",
        "intro": intro,
        "sections": sections,
        "conclusion": conclusion,
        "hashtags": hashtags,
        "image_count": image_count or 3,
    }


def _stub_instagram_caption(keyword: str, tenant_name: str, angle: str = "") -> dict:
    """미리 작성된 Instagram 캡션 견본 — 200~300자 + 5~10 해시태그."""
    angle_label = angle or "처음 시작하시는 분들께"
    hook = f"{keyword} 고민 중이라면? 👀 ({angle_label})"
    body = (
        f"많은 분들이 후기부터 찾아보시지만, 실제로 가장 중요한 건 **사전 검사** 결과예요. "
        f"{tenant_name}에서는 검사 결과를 직접 보면서 1:1 상담을 받을 수 있습니다. "
        f"개인차가 있으니 본인의 눈 상태에 맞는 시술을 우선 확인해보세요. 🩺"
    )
    cta = "DM 또는 프로필 링크로 상담 예약 가능합니다 💌"
    hashtags = [keyword, "안과", "시력교정", "라식", "라섹", "강남안과", f"{tenant_name}"]
    return {
        "hook": hook,
        "body": body,
        "cta": cta,
        "hashtags": hashtags,
    }


# ─── Real LLM Providers ─────────────────────────────────────────

_FAQ_SYSTEM_PROMPT = """당신은 한국 의료기관을 위한 GEO(Generative Engine Optimization) Q&A 콘텐츠 작가입니다.

[역할]
사용자가 ChatGPT, Perplexity, Gemini, Claude 같은 AI 검색엔진에 일반적인 질문(general question)을 던졌을 때, 당신이 작성한 Q&A가 답변에 \"맞춤 추천\"으로 인용되도록 콘텐츠를 만듭니다. 따라서 질문은 \"실제 사람이 AI에게 물어볼 법한 자연어\"여야 하고, 답변은 \"AI가 그대로 인용하기 좋은 사실 기반 정보\"여야 합니다.

[질문 작성 원칙]
1. 사용자가 실제로 물어볼 자연어 (예: "강남에서 라식 잘하는 곳 어디예요?", "라식 부작용은 어떤 게 있어요?")
2. 키워드를 포함하되, 검색어가 아닌 \"질문 형태\"로
3. 5W1H를 자연스럽게 활용 (어디/언제/어떻게/왜/무엇/얼마)

[답변 작성 원칙 — AI 인용 친화]
1. 첫 1~2문장에 핵심 답을 명확히 (AI가 발췌하기 쉽도록)
2. 구체 수치/사실 우선 — \"약 1~3일\", \"각막 두께 480~500μm\" 같이
3. 의료기관명을 자연스럽게 1~2회 언급
4. 200~300자 내외, 너무 길지 않게

[의료법 컴플라이언스 — 가장 중요]
1. 의료법 제56조와 의료광고 사전심의 가이드 준수.
2. 금지: \"100% 보장\", \"최고\", \"유일\", \"최초\", \"완치 보장\", \"통증 제로\", \"전혀 아프지 않\".
3. 효과/결과는 \"개인차가 있을 수 있다\" 취지 포함.
4. 타 병원과의 직접 비교 금지.
5. 이벤트/할인 시 기간/종료일 명시.
6. 환자 유인 표현(파격 할인, 공짜) 금지.

[사람이 쓴 것처럼 보이는 톤]
1. 답변에 자연스러운 이모지 1~2개 사용 (의료 톤 해치지 않을 정도).
2. 강조하고 싶은 핵심 키워드는 답변에 **굵게** (마크다운 ** **) 표시.
3. 문장 길이 변주 — 짧은 문장과 긴 문장 섞기.
4. 번역체(\"~을 통해\", \"~에 있어서\") 회피.

출력은 정확히 다음 JSON 형식만 (코드블록/주석 X):
{
  "qa_pairs": [
    {"q": "질문 1", "a": "답변 1 (마크다운 **bold**, 이모지 가능)"},
    {"q": "질문 2", "a": "답변 2"},
    ...
  ]
}
"""

_FAQ_USER_TEMPLATE = """키워드: {keyword}
의료기관: {tenant_name}
분야: {tenant_category}
지역: {tenant_region}

위 정보로 AI 검색엔진(ChatGPT, Perplexity, Gemini 등)이 사용자의 일반 질문에 답할 때 인용하기 좋은 GEO Q&A를 {n_pairs}쌍 작성하세요.{angle_block}

각 질문은 \"사람이 실제로 AI에게 물어볼 자연어\"로, 답변은 200~300자 내외로 핵심을 앞에 두고 작성하세요. 의료법 가이드 + 자연스러운 이모지 + 핵심 키워드 **bold** 모두 적용하세요."""


# ─── Blog post system prompt — 사람-톤 강화 ────────────────────

_BLOG_SYSTEM_PROMPT = """당신은 한국 의료기관 블로그를 운영하는 전문 카피라이터입니다.
당신의 글은 \"AI가 쓴 것\"으로 들키지 않아야 합니다. 다음 원칙을 모두 따르세요:

[A. 의료법 컴플라이언스 — 가장 중요]
1. 의료법 제56조와 의료광고 사전심의 가이드를 준수하세요.
2. 절대적 표현 금지: "100% 보장", "최고", "유일", "최초", "완치", "통증 제로", "전혀 아프지 않".
3. 효과/결과는 \"개인차가 있을 수 있다\"는 취지를 자연스럽게 포함.
4. 타 병원과의 직접 비교 금지.
5. 이벤트/할인 표현은 종료일 또는 \"기간 한정\" 함께 명시.
6. 환자 유인 표현(파격 할인, 공짜 등) 금지.

[B. AI같지 않은 자연스러운 톤 — 검색 신뢰도와 직결]
1. 문장 길이를 일부러 변주하세요. 짧은 문장 한두 개 사이에 긴 문장 하나. 호흡이 살도록.
2. 한자어/추상 개념 나열 금지. 구체적인 사례·숫자·시간·체감 묘사 섞기.
   - 나쁨: "고객 만족도가 우수합니다"
   - 좋음: "검사 다음 날 출근해야 했던 30대 직장인 분의 경우"
3. 1인칭(\"저희\")/2인칭(\"이런 분이라면\") 자연스럽게.
4. 번역체(\"~을 통해\", \"~에 있어서\", \"~에 대한\") 회피.
5. 매번 \"또한\", \"따라서\"로 시작하지 않기.
6. 작은 솔직함(\"사실 이게 더 중요해요\") 끼우기.
7. 4개 이상 나열은 단락으로 풀기.

[C. 가독성 — 사람 글의 리듬]
1. **핵심 키워드/문장은 마크다운 볼드 처리**: `**핵심 표현**` 형태로. 한 단락에 1~2회.
   - 예: \"검사는 **각막 두께**가 핵심입니다.\"
2. **이모지를 자연스럽게**: 1단락에 0~1개. 의료 톤을 해치지 않는 선에서.
   - 적절: ✅ 📌 💡 🩺 👀 ⏱️ 🏥
   - 부적절: 너무 가벼운 😂 🥹 💯 (의료 신뢰도↓)
3. 단락 길이 다양하게 — 한 문장짜리 단락도 OK.

[D. SEO 구조]
1. title: 키워드 포함, 30~60자.
2. meta_description: 150자 이내, 검색결과에 노출되는 요약.
3. h2(sections): 3~5개. 각 섹션 200~600자.
4. 필요시 h3(sub_sections) 1~2개.
5. 키워드는 자연스럽게 본문 전체에 분포 (1~2% 밀도).
6. 결론(conclusion_paragraphs)은 핵심 3가지를 한 번 더 정리.

[E. 영업 정보 — 본문 끝부분에 자연 노출]
의료기관 정보(이름/주소/지역/네이버 플레이스 URL)가 user 메시지에 주어집니다.
본문 마지막 섹션 또는 conclusion 직전에 \"위치/연락 안내\"를 자연 노출하세요.
- 주소를 \"강남대로 462에 위치한\" 같은 자연스러운 문장으로 통합
- 네이버 플레이스 URL이 있으면 \"네이버 지도\"로 안내한다는 표현 (URL은 references에도 추가)
- 광고 톤 회피, 정보 톤 유지

[F. Reference 자료가 주어진 경우]
1. 자료의 사실/수치를 인용하되, 본 글 톤으로 다시 쓰기.
2. 한 자료 통째 복사 금지. \"여러 자료의 공통점/차이점\" 정리.
3. 인용한 URL을 references 배열에 모두 포함.

[G. 이미지 — image_count > 0인 경우]
1. \"after_section\"으로 어느 H2 섹션 뒤에 배치할지 결정.
2. alt 텍스트(50~100자)는 본문 흐름에 맞춰.
3. 캡션 1줄.
4. src는 빈 문자열 \"\"로.

출력은 정확히 다음 JSON 형식만 (코드 블록/주석 X):
{
  "title": "...",
  "meta_description": "...",
  "keywords": ["...", "..."],
  "canonical_keyword": "...",
  "intro_paragraphs": ["...단락에 **bold** 와 자연스러운 이모지 ✅ 등 포함...", "..."],
  "sections": [
    {
      "heading": "...",
      "paragraphs": ["...", "..."],
      "sub_sections": [{"heading": "...", "paragraphs": ["..."]}]
    }
  ],
  "conclusion_paragraphs": ["..."],
  "references": ["https://...", "naver_place_url 있으면 여기에"],
  "images": [
    {"src": "", "alt": "...", "caption": "...", "after_section": 1}
  ]
}
"""


# ─── Naver Blog system prompt — Phase 2-T2.4 ─────────────────

_NAVER_SYSTEM_PROMPT = """당신은 한국 네이버 블로그를 운영하는 의료기관 마케팅 카피라이터입니다.
네이버 SmartEditor 에 그대로 붙여넣을 평문(plain text) 으로 글을 씁니다 — HTML/마크다운 사용 금지.

[A. 의료법 컴플라이언스 — 가장 중요]
1. 절대표현 금지: "100% 보장", "최고", "유일", "최초", "완치", "통증 제로".
2. 효과/결과는 "개인차가 있을 수 있다" 자연 포함.
3. 타 병원과의 직접 비교 금지.
4. 이벤트/할인은 기간(시작~종료일) 또는 "기간 한정" 명시.
5. 환자 유인 표현(파격 할인, 공짜) 금지.

[B. 네이버 검색 SEO 톤]
1. 본문은 1500~2500자. 너무 짧으면 검색 노출 약함, 너무 길면 이탈.
2. 사람-톤 — 1인칭("저희"), 2인칭("이런 분이라면"), 일상 표현.
3. 각 섹션 시작은 이모지 헤더(💡 🩺 📌 🗓️ ✅ ⏱️ 등) + 짧은 H2 같은 한 줄.
4. 번역체("~을 통해", "~에 있어서") 회피.
5. 짧은 문장과 긴 문장 호흡 변주.
6. 4개 이상 나열은 단락으로 풀기.

[C. 이미지 placeholder]
1. image_count 가 N이면 본문 흐름에 맞춰 [이미지1] ~ [이미지N] 자연스럽게 배치.
2. 도입부 직후 1개, 짝수 섹션 뒤에 나머지 분배 권장.

[D. 위치 안내 + 해시태그]
1. 본문 끝(마무리 다음)에 병원명/주소/네이버 플레이스 URL 자연 언급.
2. 마지막 줄에 해시태그 5~10개. # 없이 단어만 (renderer 가 # 붙임).

출력은 정확히 다음 JSON 형식만 (코드 블록/주석 X):
{
  "title": "...",
  "intro": ["도입 단락1", "도입 단락2"],
  "sections": [
    {"heading": "💡 1. ...", "paragraphs": ["단락1", "단락2"]},
    {"heading": "🩺 2. ...", "paragraphs": ["단락1", "단락2"]}
  ],
  "conclusion": ["마무리 단락"],
  "hashtags": ["키워드1", "병원명", "지역명", "..."],
  "image_count": 3
}
"""


# ─── Instagram system prompt — Phase 2-T2.4 ──────────────────

_INSTAGRAM_SYSTEM_PROMPT = """당신은 한국 의료기관 Instagram 운영 담당자입니다.
짧고 임팩트 있는 캡션을 작성합니다.

[A. 의료법 — 짧을수록 위험]
1. 절대표현 금지(100%, 최고, 완치, 즉시 효과 등).
2. 효과/결과 언급 시 짧게라도 "개인차" 또는 "사례에 따라" 표현.
3. 타 병원 비교 금지, 환자 유인 표현 금지.
4. 가격/이벤트 언급 시 기간 명시 (캡션 길이 제약 있어도 생략 X).

[B. 캡션 길이/구조]
1. body 영역은 200~300자(한글 1자=1, 이모지 1자=1) — 너무 짧으면 정보 X, 너무 길면 "더보기" 잘림.
2. hook(첫 1줄): 호기심·질문·공감으로 시작. 일반적인 의료 광고 톤 X.
3. body: 핵심 메시지 1~2개 압축. 이모지 적절히.
4. cta: 마지막에 행동 유도 ("DM", "프로필 링크", "예약 문의" 등).
5. 해시태그: 5~10개. # 없이 단어만 (renderer 가 # 붙임).

[C. 톤]
1. 친근, 솔직, 작은 이모지.
2. 1인칭/2인칭 자연스럽게.
3. 의학용어 남발 금지 — 일상어로 전환.

출력은 정확히 다음 JSON 형식만 (코드 블록/주석 X):
{
  "hook": "강남에서 라식 고민 중이라면? 👀",
  "body": "본문 200~300자 (해시태그 제외)",
  "cta": "DM 으로 상담 받아보세요 💌",
  "hashtags": ["키워드", "병원명", "..."]
}
"""


def _build_naver_user_prompt(
    keyword: str,
    tenant_name: str,
    tenant_category: str,
    tenant_region: str,
    tenant_address: str = "",
    tenant_naver_place_url: str = "",
    tenant_phone: str = "",
    tenant_data_block: str = "",
    image_count: int = 0,
    target_chars: int = 2000,
    angle: str = "",
    correction_hint: str | None = None,
) -> str:
    parts = [
        f"키워드: {keyword}",
        f"의료기관: {tenant_name}",
        f"분야: {tenant_category}",
        f"지역: {tenant_region}",
    ]
    if tenant_address:
        parts.append(f"주소: {tenant_address}")
    if tenant_naver_place_url:
        parts.append(f"네이버 플레이스: {tenant_naver_place_url}")
    if tenant_phone:
        parts.append(f"전화: {tenant_phone}")
    parts.append(f"이미지 갯수: {image_count} (이 만큼 [이미지N] placeholder 배치)")
    parts.append(f"목표 본문 글자 수: {target_chars} (1500~2500 권장)")
    if angle:
        parts.append(f"각도/관점: {angle}")
    if tenant_data_block:
        parts.append("\n--- 의료기관 사실 정보 (인용 권장) ---")
        parts.append(tenant_data_block)
    if correction_hint:
        parts.append("\n--- 직전 위반 수정 가이드 ---")
        parts.append(correction_hint)
    parts.append("\n위 정보를 바탕으로 네이버 블로그 평문 JSON 한 개를 생성하세요.")
    return "\n".join(parts)


def _build_instagram_user_prompt(
    keyword: str,
    tenant_name: str,
    tenant_category: str,
    tenant_region: str,
    tenant_data_block: str = "",
    angle: str = "",
    correction_hint: str | None = None,
) -> str:
    parts = [
        f"키워드: {keyword}",
        f"의료기관: {tenant_name}",
        f"분야: {tenant_category}",
        f"지역: {tenant_region}",
    ]
    if angle:
        parts.append(f"각도/관점: {angle}")
    if tenant_data_block:
        parts.append("\n--- 의료기관 사실 정보 (인용 권장) ---")
        parts.append(tenant_data_block)
    if correction_hint:
        parts.append("\n--- 직전 위반 수정 가이드 ---")
        parts.append(correction_hint)
    parts.append("\n위 정보를 바탕으로 Instagram 캡션 JSON 한 개를 생성하세요. body 는 반드시 200~300자.")
    return "\n".join(parts)


def _parse_naver_json(raw: str) -> dict:
    """LLM raw text → dict. 실패 시 빈 schema 반환."""
    try:
        # JSON 외 텍스트 제거 시도
        s = raw.strip()
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            s = s[start : end + 1]
        return json.loads(s)
    except Exception:
        return {"title": "", "intro": [], "sections": [], "conclusion": [], "hashtags": [], "image_count": 0}


def _parse_instagram_json(raw: str) -> dict:
    try:
        s = raw.strip()
        start = s.find("{")
        end = s.rfind("}")
        if start >= 0 and end > start:
            s = s[start : end + 1]
        return json.loads(s)
    except Exception:
        return {"hook": "", "body": "", "cta": "", "hashtags": []}


def _build_blog_user_prompt(
    keyword: str,
    tenant_name: str,
    tenant_category: str,
    tenant_region: str,
    tenant_address: str = "",
    tenant_naver_place_url: str = "",
    tenant_homepage: str = "",
    tenant_phone: str = "",
    references_block: str = "",
    tenant_data_block: str = "",
    image_count: int = 0,
    target_chars: int = 2000,
    angle: str = "",
    correction_hint: str | None = None,
) -> str:
    parts = [
        f"키워드: {keyword}",
        f"의료기관: {tenant_name}",
        f"분야: {tenant_category}",
        f"지역: {tenant_region}",
    ]
    if tenant_address:
        parts.append(f"주소: {tenant_address}")
    if tenant_naver_place_url:
        parts.append(f"네이버 플레이스: {tenant_naver_place_url}")
    if tenant_homepage:
        parts.append(f"홈페이지: {tenant_homepage}")
    if tenant_phone:
        parts.append(f"전화: {tenant_phone}")
    parts.append(f"목표 본문 길이: 약 {target_chars}자 (네이버 블로그 가이드 1500~2500자 권장)")
    parts.append(f"포함 이미지 수: {image_count}")

    if angle:
        parts.append(f"\n[이번 글의 관점/소주제]\n{angle}\n같은 키워드라도 이 관점으로 차별화된 글을 작성하세요.")

    if tenant_data_block:
        parts.append("\n" + tenant_data_block)

    if references_block:
        parts.append("\n" + references_block)
        parts.append(
            "\n위 참고 자료의 사실을 활용하되, 자료를 통째로 옮기지 말고 본 글의 톤으로 다시 쓰세요. "
            "참고한 URL은 references 배열에 모두 포함하세요."
        )
    elif not tenant_data_block:
        parts.append("\n참고 자료 없음 — 도메인 일반 지식 + 의료법 안전 표현으로 작성하세요.")

    if image_count > 0:
        parts.append(
            f"\n이미지 {image_count}개를 본문에 자연스럽게 배치할 alt + caption + after_section을 제안하세요. "
            "src는 빈 문자열로 두세요."
        )

    parts.append(
        "\n[필수] 본문에 **마크다운 볼드** 와 자연스러운 이모지를 포함하세요. "
        "본문 마지막 섹션이나 결론 직전에 위치/연락 안내를 자연 노출하세요. "
        "네이버 플레이스 URL이 주어졌다면 references 배열에 포함하세요."
    )

    if correction_hint:
        parts.append("\n--- 이전 출력 수정 요청 ---")
        parts.append(correction_hint)
        parts.append("위 위반 사항을 모두 제거하고, 톤을 더 사람처럼 자연스럽게 다듬어 다시 작성하세요.")

    return "\n".join(parts)



def _lenient_json_loads(raw: str) -> dict:
    """LLM 출력 JSON 파싱 — 표준 json.loads 실패 시 자동 수정 시도.

    2026-05-24: Gemini 가 markdown wrap + 한국어 콘텐츠 안에 escape 안 된 줄바꿈/
    따옴표 넣어서 malformed JSON 빈번. response_mime_type 강제 후에도 가끔
    실패. 자동 보정 (smart quotes / trailing comma / control char) 시도.

    Round 58 (2026-06-01): Claude Sonnet 4.6 가 작은따옴표를 `\\'` 로 escape 하는
    경향 — 표준 JSON 에서 invalid. 또한 ```json fence + 후미 ``` 추가 처리.
    """
    import json as _json
    import re as _re
    try:
        return _json.loads(raw)
    except _json.JSONDecodeError:
        pass
    fixed = raw
    # Round 58 — markdown fence strip (앞/뒤 모두)
    fixed = _re.sub(r"^\s*```(?:json)?\s*\n?", "", fixed)
    fixed = _re.sub(r"\n?```\s*$", "", fixed)
    fixed = fixed.strip()
    # smart quotes → ASCII
    fixed = fixed.replace("“", '"').replace("”", '"')
    fixed = fixed.replace("‘", "'").replace("’", "'")
    # Round 58 — Claude Sonnet 의 `\'` (작은따옴표 escape) → `'` (JSON 비표준 → 표준)
    #   주의: string value 안에서만 발생 가정. backslash escape 전체를 푸는 것은 위험.
    fixed = fixed.replace("\\'", "'")
    # trailing comma in object/array
    fixed = _re.sub(r",\s*([}\]])", r"\1", fixed)
    # control char in string (Gemini 가 \n 안 escape 한 경우) — string 안 \n → \\n
    # 가장 위험. 일단 stub 우회 — strip 시도만.
    try:
        return _json.loads(fixed)
    except _json.JSONDecodeError:
        pass
    # Round 58 — 마지막 fallback: strict=False (control character 허용)
    try:
        return _json.loads(fixed, strict=False)
    except _json.JSONDecodeError as e:
        # 최종 실패 시 더 자세한 진단 정보
        raise _json.JSONDecodeError(
            f"{e.msg} (lenient 시도 후에도 실패. raw 첫 200자: {raw[:200]!r})",
            e.doc, e.pos
        ) from e

def _parse_qa_json(text: str) -> list[FAQPair]:
    """LLM 응답에서 FAQ JSON 추출."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not m:
        raise LLMError(f"LLM 응답에서 JSON을 찾지 못함: {text[:200]}")
    try:
        data = _lenient_json_loads(m.group(0))
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON 파싱 실패: {e}; raw={text[:500]}") from e

    # Round 61 — HTML entity 영구 차단
    data = _decode_html_entities_deep(data)
    pairs_raw = data.get("qa_pairs") or data.get("faq") or data.get("pairs") or []
    if not pairs_raw:
        raise LLMError(f"qa_pairs 키 없음: {data}")
    return [FAQPair(question=p["q"], answer=p["a"]) for p in pairs_raw if "q" in p and "a" in p]


def _decode_html_entities_deep(obj):
    """Round 61 (2026-06-01) — LLM 응답의 모든 string 에 html.unescape() 재귀 적용.

    Gemini/Sonnet 이 한국어 응답 시 `'` → `&#x27;`, `&` → `&amp;` 로 escape 한 채 반환.
    DB 에 그대로 저장되면 라이브 페이지에 entity 가 literal 로 노출됨.
    JSON 파싱 직후 dict/list/str 재귀 순회로 영구 차단.
    """
    import html as _html
    if isinstance(obj, str):
        return _html.unescape(obj)
    if isinstance(obj, dict):
        return {k: _decode_html_entities_deep(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_decode_html_entities_deep(v) for v in obj]
    return obj


def _parse_blog_json(text: str) -> dict:
    """LLM 응답에서 블로그 post JSON 추출."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not m:
        raise LLMError(f"LLM 응답에서 JSON을 찾지 못함: {text[:200]}")
    try:
        data = _lenient_json_loads(m.group(0))
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON 파싱 실패: {e}; raw={text[:500]}") from e

    # Round 61 — HTML entity 영구 차단
    data = _decode_html_entities_deep(data)

    # 최소 필드 검증
    if "title" not in data and "sections" not in data:
        raise LLMError(f"블로그 JSON 형식 부적합: {list(data.keys())}")
    return data


def _build_user_prompt(
    keyword: str,
    tenant_name: str,
    tenant_category: str,
    tenant_region: str,
    n_pairs: int,
    angle: str = "",
    tenant_data_block: str = "",
    correction_hint: str | None = None,
) -> str:
    angle_block = ""
    if angle:
        angle_block = (
            f"\n\n[이번 발행의 관점/소주제]\n{angle}\n같은 키워드라도 이 관점으로 차별화된 Q&A를 만드세요."
        )
    prompt = _FAQ_USER_TEMPLATE.format(
        keyword=keyword,
        tenant_name=tenant_name,
        tenant_category=tenant_category,
        tenant_region=tenant_region,
        n_pairs=n_pairs,
        angle_block=angle_block,
    )
    if tenant_data_block:
        prompt += "\n\n" + tenant_data_block
        prompt += (
            "\n\n[중요] 위 \"의료기관 사실 정보\"를 답변에 적극 인용하세요. "
            "추상적 표현 대신 의사명/장비명/이벤트 정보 같은 구체 사실을 언급하면 "
            "AI 검색엔진이 인용할 가능성이 크게 올라갑니다."
        )
    if correction_hint:
        prompt += f"\n\n--- 이전 출력 수정 요청 ---\n{correction_hint}\n반드시 위반을 모두 제거하고 다시 작성하세요."
    return prompt


# ─── Provider 구현 ──────────────────────────────────────────────


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        try:
            from google import genai
            from google.genai import types as genai_types
        except ImportError as e:
            raise LLMError("google-genai 미설치. `pip install google-genai`") from e
        self._client = genai.Client(api_key=api_key)
        self._types = genai_types
        self._model = model
        # 2026-05-24: response_mime_type=application/json 강제. Gemini 가 markdown
        # 코드 블록 (```json...```) 으로 감싸지 않고 strict JSON 만 출력 → parser 통과율 ↑.
        # 추가 safety: temperature 명시 (사실 조작 위험 감소).
        _json_kwargs = {"response_mime_type": "application/json", "temperature": 0.7}
        self._faq_config = genai_types.GenerateContentConfig(
            system_instruction=_FAQ_SYSTEM_PROMPT, **_json_kwargs
        )
        self._blog_config = genai_types.GenerateContentConfig(
            system_instruction=_BLOG_SYSTEM_PROMPT, **_json_kwargs
        )
        self._naver_config = genai_types.GenerateContentConfig(
            system_instruction=_NAVER_SYSTEM_PROMPT, **_json_kwargs
        )
        self._instagram_config = genai_types.GenerateContentConfig(
            system_instruction=_INSTAGRAM_SYSTEM_PROMPT, **_json_kwargs
        )

    def _generate(self, prompt: str, config) -> str:
        resp = self._client.models.generate_content(
            model=self._model, contents=prompt, config=config
        )
        return resp.text or ""

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        angle: str = "",
        tenant_data_block: str = "",
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs,
            angle=angle, tenant_data_block=tenant_data_block, correction_hint=correction_hint,
        )
        try:
            raw = self._generate(prompt, self._faq_config)
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        pairs = _parse_qa_json(raw)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name, angle=angle)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_homepage: str = "",
        tenant_phone: str = "",
        references_block: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword=keyword,
            tenant_name=tenant_name,
            tenant_category=tenant_category,
            tenant_region=tenant_region,
            tenant_address=tenant_address,
            tenant_naver_place_url=tenant_naver_place_url,
            tenant_homepage=tenant_homepage,
            tenant_phone=tenant_phone,
            references_block=references_block,
            tenant_data_block=tenant_data_block,
            image_count=image_count,
            target_chars=target_chars,
            angle=angle,
            correction_hint=correction_hint,
        )
        try:
            raw = self._generate(prompt, self._blog_config)
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        post = _parse_blog_json(raw)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_naver_blog(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_phone: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> NaverBlogGenerationResult:
        prompt = _build_naver_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_address=tenant_address, tenant_naver_place_url=tenant_naver_place_url,
            tenant_phone=tenant_phone, tenant_data_block=tenant_data_block,
            image_count=image_count, target_chars=target_chars,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            raw = self._generate(prompt, self._naver_config)
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        post = _parse_naver_json(raw)
        return NaverBlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_instagram(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_data_block: str = "",
        angle: str = "",
        correction_hint: str | None = None,
    ) -> InstagramGenerationResult:
        prompt = _build_instagram_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_data_block=tenant_data_block,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            raw = self._generate(prompt, self._instagram_config)
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        cap = _parse_instagram_json(raw)
        return InstagramGenerationResult(caption_dict=cap, raw_text=raw, provider=self.name, angle=angle)


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str = "claude-haiku-4-5-20251001"):
        try:
            import anthropic
        except ImportError as e:
            raise LLMError("anthropic 미설치. `pip install anthropic`") from e
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        angle: str = "",
        tenant_data_block: str = "",
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs,
            angle=angle, tenant_data_block=tenant_data_block, correction_hint=correction_hint,
        )
        try:
            # Round 63 (2026-06-22) — assistant prefill 제거 (함정 CC).
            #   Sonnet 4.6 등 일부 모델이 assistant prefill 미지원 → 400 invalid_request_error.
            #   _parse_qa_json 이 정규식으로 JSON 객체를 추출하므로 prefill 없이도 안전.
            # Round 58 fix 3 — max_tokens 2048 → 4096
            msg = self._client.messages.create(
                model=self._model,
                system=_FAQ_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=[
                    {"role": "user", "content": prompt},
                ],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
            # Round 58 fix 3 — 응답 잘림 감지
            stop_reason = getattr(msg, "stop_reason", None)
            if stop_reason == "max_tokens":
                raise LLMError(
                    f"Anthropic FAQ 응답 잘림 (max_tokens 4096 도달). "
                    f"raw 마지막 200자: {raw[-200:]!r}."
                )
        except LLMError:
            raise
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        pairs = _parse_qa_json(raw)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name, angle=angle)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_homepage: str = "",
        tenant_phone: str = "",
        references_block: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword=keyword,
            tenant_name=tenant_name,
            tenant_category=tenant_category,
            tenant_region=tenant_region,
            tenant_address=tenant_address,
            tenant_naver_place_url=tenant_naver_place_url,
            tenant_homepage=tenant_homepage,
            tenant_phone=tenant_phone,
            references_block=references_block,
            tenant_data_block=tenant_data_block,
            image_count=image_count,
            target_chars=target_chars,
            angle=angle,
            correction_hint=correction_hint,
        )
        try:
            # Round 63 (2026-06-22) — assistant prefill 제거 (함정 CC).
            #   Sonnet 4.6 등 일부 모델이 assistant prefill 미지원 → 400 invalid_request_error.
            #   _parse_blog_json 이 정규식으로 JSON 객체를 추출하므로 prefill 없이도 안전.
            # Round 58 fix 3 (2026-06-01) — max_tokens 4096 → 8192 (한국어 blog 4-5 sections 안전 마진)
            msg = self._client.messages.create(
                model=self._model,
                system=_BLOG_SYSTEM_PROMPT,
                max_tokens=8192,
                messages=[
                    {"role": "user", "content": prompt},
                ],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
            # Round 58 fix 3 — 응답 잘림 감지 (max_tokens 도달 시 stop_reason == "max_tokens")
            stop_reason = getattr(msg, "stop_reason", None)
            if stop_reason == "max_tokens":
                raise LLMError(
                    f"Anthropic 응답 잘림 (max_tokens 8192 도달). "
                    f"raw 마지막 200자: {raw[-200:]!r}. "
                    f"system prompt 단축 또는 max_tokens 증가 필요."
                )
        except LLMError:
            raise
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        post = _parse_blog_json(raw)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_naver_blog(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_phone: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> NaverBlogGenerationResult:
        prompt = _build_naver_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_address=tenant_address, tenant_naver_place_url=tenant_naver_place_url,
            tenant_phone=tenant_phone, tenant_data_block=tenant_data_block,
            image_count=image_count, target_chars=target_chars,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            msg = self._client.messages.create(
                model=self._model,
                system=_NAVER_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        post = _parse_naver_json(raw)
        return NaverBlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_instagram(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_data_block: str = "",
        angle: str = "",
        correction_hint: str | None = None,
    ) -> InstagramGenerationResult:
        prompt = _build_instagram_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_data_block=tenant_data_block,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            msg = self._client.messages.create(
                model=self._model,
                system=_INSTAGRAM_SYSTEM_PROMPT,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        cap = _parse_instagram_json(raw)
        return InstagramGenerationResult(caption_dict=cap, raw_text=raw, provider=self.name, angle=angle)


class OpenAIProvider:
    name = "openai"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        try:
            from openai import OpenAI
        except ImportError as e:
            raise LLMError("openai 미설치. `pip install openai`") from e
        self._client = OpenAI(api_key=api_key)
        self._model = model

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        angle: str = "",
        tenant_data_block: str = "",
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs,
            angle=angle, tenant_data_block=tenant_data_block, correction_hint=correction_hint,
        )
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _FAQ_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or ""
        except Exception as e:
            raise LLMError(f"OpenAI 호출 실패: {e}") from e
        pairs = _parse_qa_json(raw)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name, angle=angle)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_homepage: str = "",
        tenant_phone: str = "",
        references_block: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword=keyword,
            tenant_name=tenant_name,
            tenant_category=tenant_category,
            tenant_region=tenant_region,
            tenant_address=tenant_address,
            tenant_naver_place_url=tenant_naver_place_url,
            tenant_homepage=tenant_homepage,
            tenant_phone=tenant_phone,
            references_block=references_block,
            tenant_data_block=tenant_data_block,
            image_count=image_count,
            target_chars=target_chars,
            angle=angle,
            correction_hint=correction_hint,
        )
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _BLOG_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or ""
        except Exception as e:
            raise LLMError(f"OpenAI 호출 실패: {e}") from e
        post = _parse_blog_json(raw)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_naver_blog(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_address: str = "",
        tenant_naver_place_url: str = "",
        tenant_phone: str = "",
        tenant_data_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        angle: str = "",
        correction_hint: str | None = None,
    ) -> NaverBlogGenerationResult:
        prompt = _build_naver_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_address=tenant_address, tenant_naver_place_url=tenant_naver_place_url,
            tenant_phone=tenant_phone, tenant_data_block=tenant_data_block,
            image_count=image_count, target_chars=target_chars,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _NAVER_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or ""
        except Exception as e:
            raise LLMError(f"OpenAI 호출 실패: {e}") from e
        post = _parse_naver_json(raw)
        return NaverBlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name, angle=angle)

    def generate_instagram(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        tenant_data_block: str = "",
        angle: str = "",
        correction_hint: str | None = None,
    ) -> InstagramGenerationResult:
        prompt = _build_instagram_user_prompt(
            keyword=keyword, tenant_name=tenant_name,
            tenant_category=tenant_category, tenant_region=tenant_region,
            tenant_data_block=tenant_data_block,
            angle=angle, correction_hint=correction_hint,
        )
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _INSTAGRAM_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
            )
            raw = resp.choices[0].message.content or ""
        except Exception as e:
            raise LLMError(f"OpenAI 호출 실패: {e}") from e
        cap = _parse_instagram_json(raw)
        return InstagramGenerationResult(caption_dict=cap, raw_text=raw, provider=self.name, angle=angle)


# ─── Factory ────────────────────────────────────────────────────


class FallbackProvider:
    """Round 40 B1 (2026-05-31) — 여러 provider 순차 시도.

    Gemini 503/429 → Anthropic → OpenAI → Stub 자동 fallback.
    각 메서드 호출 시 1번 provider 시도 → 실패 시 다음.
    """
    name = "fallback"

    def __init__(self, providers: list):
        if not providers:
            providers = [StubProvider()]
        self._providers = providers
        logger.info("FallbackProvider 활성: %s", [p.name for p in providers])

    def _try_all(self, method_name: str, *args, **kwargs):
        last_error: Exception | None = None
        for p in self._providers:
            try:
                method = getattr(p, method_name, None)
                if method is None:
                    continue
                return method(*args, **kwargs)
            except Exception as e:  # noqa: BLE001
                logger.warning(
                    "FallbackProvider: %s.%s 실패 — %s — 다음 provider 시도",
                    p.name, method_name, str(e)[:200],
                )
                last_error = e
        raise LLMError(f"모든 provider 실패. 마지막 에러: {last_error}")

    def generate_faq(self, *args, **kwargs):
        return self._try_all("generate_faq", *args, **kwargs)

    def generate_blog_post(self, *args, **kwargs):
        return self._try_all("generate_blog_post", *args, **kwargs)

    def generate_naver_blog(self, *args, **kwargs):
        return self._try_all("generate_naver_blog", *args, **kwargs)

    def generate_instagram(self, *args, **kwargs):
        return self._try_all("generate_instagram", *args, **kwargs)


def _build_provider_chain() -> list:
    """환경변수로 가능한 provider 만 활성.
    우선순위: Gemini > Anthropic > OpenAI > Stub.
    Round 63 (2026-06-22) — 비즈니스 정책 변경: Gemini(무료)를 주력으로,
      Gemini 가 quota/503 으로 막히면 Anthropic(유료)이 자동 대체.
      (이전 Round 38: Anthropic 우선 → Round 63 에서 Gemini 우선으로 뒤집음.)
    """
    chain = []
    if (k := os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")):
        try:
            chain.append(GeminiProvider(api_key=k))
        except Exception as e:  # noqa: BLE001
            logger.warning("GeminiProvider init 실패: %s", e)
    if (k := os.getenv("ANTHROPIC_API_KEY")):
        try:
            # Round 58 (2026-06-01) — ANTHROPIC_MODEL 환경변수 적용
            model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
            chain.append(AnthropicProvider(api_key=k, model=model))
        except Exception as e:  # noqa: BLE001
            logger.warning("AnthropicProvider init 실패: %s", e)
    if (k := os.getenv("OPENAI_API_KEY")):
        try:
            chain.append(OpenAIProvider(api_key=k))
        except Exception as e:  # noqa: BLE001
            logger.warning("OpenAIProvider init 실패: %s", e)
    if not chain:
        chain.append(StubProvider())
    return chain


def get_provider(provider_name: str | None = None) -> LLMProvider:
    """환경변수 또는 인자로 프로바이더 선택.

    Round 40 — 'fallback' 추가. Gemini quota exhaust 등에서 자동 다음 provider.
    LLM_PROVIDER=fallback 으로 설정 시 활성 provider 중 우선순위대로 시도.
    """
    name = (provider_name or os.getenv("LLM_PROVIDER", "stub")).lower().strip()

    if name == "fallback":
        return FallbackProvider(_build_provider_chain())

    if name == "stub":
        return StubProvider()

    if name == "gemini":
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise LLMError(
                "GOOGLE_API_KEY 미설정. https://aistudio.google.com/apikey 에서 무료 발급 후 .env에 추가."
            )
        return GeminiProvider(api_key=key)

    if name == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise LLMError("ANTHROPIC_API_KEY 미설정.")
        # Round 58 (2026-06-01) — ANTHROPIC_MODEL 환경변수 적용. 미설정 시 default haiku.
        model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        return AnthropicProvider(api_key=key, model=model)

    if name == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise LLMError("OPENAI_API_KEY 미설정.")
        return OpenAIProvider(api_key=key)

    raise LLMError(f"알 수 없는 LLM_PROVIDER: {name}. (fallback|stub|gemini|anthropic|openai)")


# ─── Cost Guardrail ─────────────────────────────────────────────


def check_daily_budget(session: Session, tenant_id: int) -> None:
    """일일 콘텐츠 생성 한도 사전 체크."""
    max_per_day = int(os.getenv("MAX_CONTENT_GEN_PER_DAY", "50"))
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    count = (
        session.query(func.count(GeneratedContent.id))
        .filter(
            GeneratedContent.tenant_id == tenant_id,
            GeneratedContent.created_at >= today_start,
        )
        .scalar()
        or 0
    )
    if count >= max_per_day:
        raise CostGuardrailExceeded(
            f"tenant {tenant_id}의 일일 한도({max_per_day}) 초과: 오늘 {count}건 생성. "
            f"한도는 .env의 MAX_CONTENT_GEN_PER_DAY로 조정."
        )
