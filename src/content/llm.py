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
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.storage.models import GeneratedContent


@dataclass
class FAQPair:
    question: str
    answer: str


@dataclass
class GenerationResult:
    qa_pairs: list[FAQPair]
    raw_text: str
    provider: str


@dataclass
class BlogGenerationResult:
    """LLM이 반환한 블로그 post의 dict 형태 + raw text."""

    post_dict: dict
    raw_text: str
    provider: str


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
        correction_hint: str | None = None,
    ) -> GenerationResult: ...

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        references_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        correction_hint: str | None = None,
    ) -> BlogGenerationResult: ...


# ─── Stub Provider (키 없이 즉시 동작) ──────────────────────────


_STUB_FAQS_GENERIC = [
    FAQPair(
        question="{keyword}을 고를 때 가장 중요한 기준은 무엇인가요?",
        answer="{tenant_name}은 환자분의 눈 상태에 맞는 시술법 선택, 의료진의 시술 경험, 충분한 사전 검사를 가장 중요한 기준으로 봅니다. 의료법상 절대적 보장 표현은 어렵지만, 다년간 축적된 임상 데이터와 환자 만족도 자료를 바탕으로 상담을 진행하고 있습니다.",
    ),
    FAQPair(
        question="시술 전 어떤 검사를 받게 되나요?",
        answer="{tenant_name}에서는 시력, 안압, 각막 두께, 각막 지형도 등 기본 검사 외에 환자의 생활 습관과 직업 환경을 함께 고려한 종합 상담을 진행합니다. 검사 결과에 따라 적합한 시술법을 안내드리며, 결과는 개인의 눈 상태에 따라 차이가 있을 수 있습니다.",
    ),
    FAQPair(
        question="시술 후 회복 기간은 얼마나 걸리나요?",
        answer="시술 종류와 개인의 회복 속도에 따라 다르지만, 일반적으로 일상 복귀까지는 1~3일, 안정화까지는 약 1~3개월이 소요됩니다. {tenant_name}에서는 회복 기간 중 정기 경과 관찰을 통해 환자의 회복을 돕고 있습니다.",
    ),
    FAQPair(
        question="시술 후 부작용이나 후유증은 없나요?",
        answer="모든 의료 시술은 일정한 부작용 가능성을 동반합니다. {tenant_name}은 시술 전 충분한 상담과 검사로 부작용 가능성을 사전에 점검하며, 시술 후에도 이상 증상 발생 시 신속히 대응하는 사후 관리 체계를 운영합니다. 효과 및 부작용은 개인차가 있을 수 있습니다.",
    ),
    FAQPair(
        question="상담 예약은 어떻게 진행되나요?",
        answer="{tenant_name}은 전화 또는 홈페이지를 통한 사전 예약을 권장합니다. 첫 상담 시 약 1~2시간의 정밀 검사가 진행되며, 검사 후 의료진과 1:1 상담을 통해 시술 가능 여부와 권장 시술법을 안내드립니다.",
    ),
]


def _stub_blog_post(keyword: str, tenant_name: str, image_count: int) -> dict:
    """미리 작성된 사람-톤 의료법 안전 블로그 post.

    의도적으로 자연스러운 문체, 1인칭/구체 사례, 호흡, 비유 포함.
    image_count만큼 image placeholder가 후속 처리에서 들어감.
    """
    return {
        "title": f"{keyword}, 처음 알아볼 때 꼭 확인해야 할 것들",
        "meta_description": (
            f"{keyword}을(를) 고민 중이라면 이 글을 먼저 읽어보세요. "
            f"{tenant_name}에서 자주 받는 질문과 함께, 검사 단계부터 회복까지 "
            "정직하게 정리했습니다. 결과는 개인차가 있을 수 있다는 점도 함께요."
        )[:155],
        "keywords": [keyword, tenant_name, "사전 검사", "회복 기간", "상담"],
        "canonical_keyword": keyword,
        "intro_paragraphs": [
            (
                f"{keyword}을(를) 알아보러 다닌다는 분들의 얘기를 들어보면, "
                "많이 묻는 질문은 의외로 비슷합니다. \"검사는 얼마나 걸리는지\", "
                "\"부작용은 정말 없는지\", \"비용은 합리적인지\". "
                "오늘은 이 세 가지를 중심으로, 그리고 그 사이에 흔히 빠지는 "
                "함정 몇 가지를 함께 짚어보려고 합니다."
            ),
            (
                "참고로 이 글은 의료광고 가이드라인을 지켜 작성했고, "
                "특정 시술이나 결과를 보장하는 표현은 의도적으로 배제했습니다. "
                "결과는 개인의 눈 상태와 생활습관에 따라 다를 수 있습니다."
            ),
        ],
        "sections": [
            {
                "heading": "검사 단계, 생각보다 시간이 걸립니다",
                "paragraphs": [
                    (
                        "처음 병원에 방문하면 시력만 확인하고 끝날 거라고 생각하시는 분이 많습니다. "
                        "그런데 실제로는 시력, 안압, 각막 두께, 각막 지형도, 동공 크기 등 "
                        "10개에 가까운 항목을 짚습니다. 직장인 분이라면 점심시간에 잠깐 들렀다 "
                        "가는 일정으로는 빠듯할 수 있어요."
                    ),
                    (
                        f"{tenant_name}에서는 첫 검사에 보통 1~2시간을 잡으시라고 안내드립니다. "
                        "검사 결과를 의사 선생님과 1:1로 살펴보는 시간이 함께 포함되어서 그렇습니다."
                    ),
                ],
                "sub_sections": [
                    {
                        "heading": "검사 결과지를 받으면 꼭 보세요",
                        "paragraphs": [
                            (
                                "각막 두께 같은 수치는 시술 가능 여부의 핵심 변수입니다. "
                                "수치가 경계에 있다면 한 가지 시술법만 권장되는 경우도 있어요. "
                                "결과지를 그냥 가방에 넣지 말고, 어디 수치가 어떤 의미인지 "
                                "한 번 더 묻고 가시는 걸 권장합니다."
                            )
                        ],
                    }
                ],
            },
            {
                "heading": "회복 기간, 평균치보다 본인의 직업이 중요합니다",
                "paragraphs": [
                    (
                        "회복 기간은 시술 종류에 따라 1일에서 수개월까지 차이가 있습니다. "
                        "다만 평균치보다 더 중요한 건, 본인의 직업과 생활 환경이에요. "
                        "장시간 모니터를 봐야 하는 직군, 운동 강도가 높은 직군, "
                        "건조한 사무 환경에서 일하는 분들은 회복 일정과 사후 관리가 다르게 잡힙니다."
                    ),
                    (
                        "이런 점을 상담 단계에서 솔직히 말씀하시면, 시술법 선택 자체가 달라질 수 있어요. "
                        "예를 들어 같은 시력이라도 회복 시간 여유가 있는 분과 그렇지 않은 분에게 "
                        "권장되는 옵션이 다른 경우가 많습니다."
                    ),
                ],
                "sub_sections": [],
            },
            {
                "heading": "비용보다 \"무엇이 포함되어 있는지\"를 보세요",
                "paragraphs": [
                    (
                        "표면 가격만 비교하면 함정에 빠지기 쉽습니다. "
                        "사후 검진, 보호용 안경, 인공눈물, 추가 보정 시술까지 포함된 가격인지 "
                        "꼭 확인해보시기 바랍니다. 같은 금액이라도 포함 항목이 다르면 "
                        "실제 부담은 크게 차이가 날 수 있어요."
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
                "정리하면, 검사 단계에서는 시간 여유를 두고 결과지를 챙기시고, "
                "회복 기간은 본인 직업·생활을 의사 선생님과 솔직히 나누시고, "
                "비용은 \"포함 항목\"으로 판단하시는 것을 권장드립니다. "
                f"{tenant_name}은 이 세 가지를 상담 첫 시간에 함께 점검하는 절차로 운영하고 있어요."
            ),
            (
                "효과와 부작용은 개인차가 있을 수 있고, 이 글의 내용은 일반적인 안내입니다. "
                "구체적인 진단과 권고는 정밀 검사 후 의료진의 판단을 따르세요."
            ),
        ],
        "references": [],  # Reference URL이 들어오면 generator에서 채움
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
        correction_hint: str | None = None,
    ) -> GenerationResult:
        pairs = []
        for tpl in _STUB_FAQS_GENERIC[:n_pairs]:
            pairs.append(
                FAQPair(
                    question=tpl.question.format(keyword=keyword, tenant_name=tenant_name),
                    answer=tpl.answer.format(keyword=keyword, tenant_name=tenant_name),
                )
            )
        raw = json.dumps([{"q": p.question, "a": p.answer} for p in pairs], ensure_ascii=False, indent=2)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        references_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        post = _stub_blog_post(keyword, tenant_name, image_count)
        raw = json.dumps(post, ensure_ascii=False, indent=2)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name)


# ─── Real LLM Providers ─────────────────────────────────────────

_FAQ_SYSTEM_PROMPT = """당신은 한국 의료기관(특히 의료광고 제약이 큰 분야)을 위한 콘텐츠 작가입니다.
다음 규칙을 반드시 지키세요:

1. 의료법 제56조(의료광고 금지)와 의료광고 사전심의 가이드라인을 준수하세요.
2. 절대적 표현 금지: "100% 보장", "최고", "유일", "최초", "완치 보장", "통증 제로", "전혀 아프지 않" 등.
3. 효과/결과는 항상 "개인차가 있을 수 있다"는 취지를 포함하세요.
4. 비교 광고(예: "타 병원보다 우월") 금지.
5. 이벤트/할인 표현이 들어가면 반드시 "기간 한정" 또는 종료일을 함께 명시하세요.
6. 환자 유인 표현(예: "파격 할인", "공짜") 금지.
7. 시술 전후 사진/표현은 사전심의 대상임을 인지하세요.

출력은 정확히 다음 JSON 형식만:
{
  "qa_pairs": [
    {"q": "질문 1", "a": "답변 1"},
    {"q": "질문 2", "a": "답변 2"},
    ...
  ]
}
"""

_FAQ_USER_TEMPLATE = """다음 키워드와 의료기관 정보를 바탕으로 AEO(Answer Engine Optimization)에 최적화된 FAQ를 {n_pairs}쌍 작성해주세요.

키워드: {keyword}
의료기관: {tenant_name}
분야: {tenant_category}
지역: {tenant_region}

각 답변은 200자 이내로 간결하게, 환자가 AI 검색엔진(ChatGPT, Perplexity 등)에서 검색했을 때 인용되기 쉽도록 사실 위주로 작성하세요. 의료법 가이드를 반드시 지키세요."""


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
1. 문장 길이를 일부러 변주하세요. 짧은 문장 한두 개 사이에 긴 문장 하나. 그래야 호흡이 살아납니다.
2. 한자어/추상 개념을 나열하지 말고, 구체적인 사례·숫자·시간·체감 묘사를 섞으세요.
   - 나쁨: "고객 만족도가 우수합니다"
   - 좋음: "검사 다음 날 출근해야 했던 30대 직장인 분의 경우"
3. 1인칭("저희"/"환자분들") 또는 2인칭("이런 분이라면") 표현을 자연스럽게 사용.
4. \"~을 통해\", \"~에 있어서\", \"~에 대한\" 같은 번역체 표현 회피.
5. 문장 첫머리를 매번 \"또한\", \"따라서\"로 시작하지 않기.
6. 작은 솔직함 한 줄(예: "그런데 사실 이게 더 중요해요") 같은 자연스러운 감정/판단 끼우기.
7. 항목 나열할 때 4개 이상이면 둘로 쪼개거나 단락으로 풀기. 모든 글이 똑같은 bullet 패턴이 되지 않도록.

[C. SEO 구조]
1. title: 키워드 포함, 30~60자.
2. meta_description: 150자 이내, 검색결과에 노출되는 요약.
3. h2(sections): 3~5개. 각 섹션 200~600자.
4. 필요시 h3(sub_sections) 1~2개.
5. 키워드는 자연스럽게 본문 전체에 분포 (1~2% 밀도).
6. 결론(conclusion_paragraphs)은 핵심 3가지를 한 번 더 정리.

[D. Reference 자료가 주어진 경우]
1. 자료의 사실/수치를 인용하되, 표현은 본 글의 톤으로 다시 쓰기.
2. 한 자료를 통째로 옮기지 말고 \"여러 자료의 공통점/차이점\"을 정리.
3. 인용한 URL은 references 배열에 모두 넣으세요.

[E. 이미지 — image_count > 0인 경우]
1. \"after_section\"으로 어느 H2 섹션 뒤에 배치할지 결정.
2. 본문 흐름에 맞춰 alt 텍스트(50~100자) 자동 생성.
3. 캡션(caption)은 짧게 1줄.
4. 사진 src는 호출 측에서 채우므로 빈 문자열 \"\"로 두세요.

출력은 정확히 다음 JSON 형식만 (코드 블록/주석 X):
{
  "title": "...",
  "meta_description": "...",
  "keywords": ["...", "..."],
  "canonical_keyword": "...",
  "intro_paragraphs": ["...", "..."],
  "sections": [
    {
      "heading": "...",
      "paragraphs": ["...", "..."],
      "sub_sections": [{"heading": "...", "paragraphs": ["..."]}]
    }
  ],
  "conclusion_paragraphs": ["..."],
  "references": ["https://..."],
  "images": [
    {"src": "", "alt": "...", "caption": "...", "after_section": 1}
  ]
}
"""


def _build_blog_user_prompt(
    keyword: str,
    tenant_name: str,
    tenant_category: str,
    tenant_region: str,
    references_block: str,
    image_count: int,
    target_chars: int,
    correction_hint: str | None,
) -> str:
    parts = [
        f"키워드: {keyword}",
        f"의료기관: {tenant_name}",
        f"분야: {tenant_category}",
        f"지역: {tenant_region}",
        f"목표 본문 길이: 약 {target_chars}자 (네이버 블로그 가이드 1500~2500자 권장)",
        f"포함 이미지 수: {image_count}",
    ]
    if references_block:
        parts.append("\n" + references_block)
        parts.append(
            "\n위 참고 자료의 사실을 활용하되, 자료를 통째로 옮기지 말고 본 글의 톤으로 다시 쓰세요. "
            "참고한 URL은 references 배열에 모두 포함하세요."
        )
    else:
        parts.append("\n참고 자료 없음 — 도메인 일반 지식 + 의료법 안전 표현으로 작성하세요.")

    if image_count > 0:
        parts.append(
            f"\n이미지 {image_count}개를 본문에 자연스럽게 배치할 alt + caption + after_section을 제안하세요. "
            "src는 빈 문자열로 두세요."
        )

    if correction_hint:
        parts.append("\n--- 이전 출력 수정 요청 ---")
        parts.append(correction_hint)
        parts.append("위 위반 사항을 모두 제거하고, 톤을 더 사람처럼 자연스럽게 다듬어 다시 작성하세요.")

    return "\n".join(parts)


def _parse_qa_json(text: str) -> list[FAQPair]:
    """LLM 응답에서 FAQ JSON 추출."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not m:
        raise LLMError(f"LLM 응답에서 JSON을 찾지 못함: {text[:200]}")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON 파싱 실패: {e}; raw={text[:200]}") from e

    pairs_raw = data.get("qa_pairs") or data.get("faq") or data.get("pairs") or []
    if not pairs_raw:
        raise LLMError(f"qa_pairs 키 없음: {data}")
    return [FAQPair(question=p["q"], answer=p["a"]) for p in pairs_raw if "q" in p and "a" in p]


def _parse_blog_json(text: str) -> dict:
    """LLM 응답에서 블로그 post JSON 추출."""
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not m:
        raise LLMError(f"LLM 응답에서 JSON을 찾지 못함: {text[:200]}")
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError as e:
        raise LLMError(f"JSON 파싱 실패: {e}; raw={text[:200]}") from e

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
    correction_hint: str | None,
) -> str:
    prompt = _FAQ_USER_TEMPLATE.format(
        keyword=keyword,
        tenant_name=tenant_name,
        tenant_category=tenant_category,
        tenant_region=tenant_region,
        n_pairs=n_pairs,
    )
    if correction_hint:
        prompt += f"\n\n--- 이전 출력 수정 요청 ---\n{correction_hint}\n반드시 위반을 모두 제거하고 다시 작성하세요."
    return prompt


# ─── Provider 구현 ──────────────────────────────────────────────


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        try:
            import google.generativeai as genai
        except ImportError as e:
            raise LLMError("google-generativeai 미설치. `pip install google-generativeai`") from e
        genai.configure(api_key=api_key)
        self._faq_model = genai.GenerativeModel(
            model_name=model, system_instruction=_FAQ_SYSTEM_PROMPT
        )
        self._blog_model = genai.GenerativeModel(
            model_name=model, system_instruction=_BLOG_SYSTEM_PROMPT
        )

    def generate_faq(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        n_pairs: int = 5,
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs, correction_hint
        )
        try:
            resp = self._faq_model.generate_content(prompt)
            raw = resp.text or ""
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        pairs = _parse_qa_json(raw)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        references_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword,
            tenant_name,
            tenant_category,
            tenant_region,
            references_block,
            image_count,
            target_chars,
            correction_hint,
        )
        try:
            resp = self._blog_model.generate_content(prompt)
            raw = resp.text or ""
        except Exception as e:
            raise LLMError(f"Gemini 호출 실패: {e}") from e
        post = _parse_blog_json(raw)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name)


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
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs, correction_hint
        )
        try:
            msg = self._client.messages.create(
                model=self._model,
                system=_FAQ_SYSTEM_PROMPT,
                max_tokens=2048,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        pairs = _parse_qa_json(raw)
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        references_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword,
            tenant_name,
            tenant_category,
            tenant_region,
            references_block,
            image_count,
            target_chars,
            correction_hint,
        )
        try:
            msg = self._client.messages.create(
                model=self._model,
                system=_BLOG_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = "".join(b.text for b in msg.content if hasattr(b, "text"))
        except Exception as e:
            raise LLMError(f"Anthropic 호출 실패: {e}") from e
        post = _parse_blog_json(raw)
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name)


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
        correction_hint: str | None = None,
    ) -> GenerationResult:
        prompt = _build_user_prompt(
            keyword, tenant_name, tenant_category, tenant_region, n_pairs, correction_hint
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
        return GenerationResult(qa_pairs=pairs, raw_text=raw, provider=self.name)

    def generate_blog_post(
        self,
        keyword: str,
        tenant_name: str,
        tenant_category: str,
        tenant_region: str,
        references_block: str = "",
        image_count: int = 0,
        target_chars: int = 2000,
        correction_hint: str | None = None,
    ) -> BlogGenerationResult:
        prompt = _build_blog_user_prompt(
            keyword,
            tenant_name,
            tenant_category,
            tenant_region,
            references_block,
            image_count,
            target_chars,
            correction_hint,
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
        return BlogGenerationResult(post_dict=post, raw_text=raw, provider=self.name)


# ─── Factory ────────────────────────────────────────────────────


def get_provider(provider_name: str | None = None) -> LLMProvider:
    """환경변수 또는 인자로 프로바이더 선택."""
    name = (provider_name or os.getenv("LLM_PROVIDER", "stub")).lower().strip()

    if name == "stub":
        return StubProvider()

    if name == "gemini":
        key = os.getenv("GOOGLE_API_KEY")
        if not key:
            raise LLMError(
                "GOOGLE_API_KEY 미설정. https://aistudio.google.com/apikey 에서 무료 발급 후 .env에 추가."
            )
        return GeminiProvider(api_key=key)

    if name == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise LLMError("ANTHROPIC_API_KEY 미설정.")
        return AnthropicProvider(api_key=key)

    if name == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise LLMError("OPENAI_API_KEY 미설정.")
        return OpenAIProvider(api_key=key)

    raise LLMError(f"알 수 없는 LLM_PROVIDER: {name}. (stub|gemini|anthropic|openai)")


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
