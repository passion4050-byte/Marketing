# MEDIMAP GEO · Hospital AI Platform

병원 데이터를 구조화·발행하고, ChatGPT / Claude / Gemini / Perplexity가 자사 콘텐츠를 인용하도록 만드는 AEO/GEO SaaS.

## 한 줄 요약

키워드 풀 → LLM 5변형 자동 생성 → 의료법 린터 → Schema.org JSON-LD + llms.txt + sitemap + IndexNow 동시 발행 → 4-엔진 인용 시계열 측정.

## 사이트 구조 (Figma 시안 100% 싱크로)

GEO SaaS

| 경로 | 역할 |
|---|---|
| `/` | 통합 대시보드 & AI 모니터링 — GEO 가시성·멘션·엔진 성능·키워드·실시간 피드 |
| `/data-feeding` | 9개 카테고리 / 36개 항목 데이터 피딩 + AI 프로필 완성도 |
| `/simulator` | BEFORE / AFTER 3-패널(ChatGPT·Claude·Gemini) 응답 비교 |

콘텐츠 배포

| 경로 | 역할 |
|---|---|
| `/ai-code` | 6종 Schema.org 엔티티 토글 + JSON-LD 자동 합성 + 코드 복사 |
| `/faq` | FAQ → Schema.org FAQPage 자동 변환 + 발행/검수 워크플로 |
| `/blog` | 1소재 = 5글 자동 생성(정보·후기·Q&A·비교·체크리스트) + 네이버 발행 |
| `/video` | Shorts / Reels / YouTube 스크립트 자동 생성 + 캡션 메타 |

자동 노출 자산 (AI 크롤러용)

| 경로 | 역할 |
|---|---|
| `/llms.txt` | AI 크롤러용 사이트 인덱스 (llmstxt.org 표준) |
| `/llms-full.txt` | 자사 풀 코퍼스 (FAQ + 블로그 본문) |
| `/robots.txt` | GPTBot · ClaudeBot · Google-Extended · PerplexityBot 명시 허용 |
| `/sitemap.xml` | 발행 글 + 정적 페이지 |

API

| 경로 | 역할 |
|---|---|
| `POST /api/publish/auto` | 자동 발행 트리거 (Vercel Cron: 매일 03:00 KST) |
| `POST /api/monitor/tick` | LLM 인용 측정 트리거 (Vercel Cron: 6시간마다) |
| `POST /api/faq/generate` | 키워드 → FAQ 5개 자동 생성 |
| `GET /api/health` | 헬스체크 |

## 기술 스택

- **Next.js 14** App Router · SSG + Route Handlers · Edge runtime
- **Tailwind CSS** — 메디맵 GEO 디자인 토큰 (Primary 딥 티얼 `#0E5A6B`)
- **Supabase** Postgres + Service Role (env 없으면 mock-data로 작동)
- **TypeScript** strict
- **lucide-react** 아이콘 · **date-fns** KST 포맷
- **자동 발행 스케줄** — `vercel.json` cron

## 사용자 목표(LLM 인용 유도) 달성 메커니즘

| 메커니즘 | 구현 위치 | 효과 |
|---|---|---|
| Schema.org JSON-LD 자동 합성 (6 엔티티) | `/ai-code`, `src/lib/aeo.ts` | Google·Bing의 Rich Result + AI 답변 컨텍스트 강화 |
| FAQ Schema 자동 부착 | `/faq`, `aeo.faqPageSchema()` | AI 모델이 Q/A 매칭 — 인용 1순위 포맷 |
| `llms.txt` + `llms-full.txt` | `src/app/llms.txt/route.ts` | Anthropic·OpenAI가 검토하는 명시 신호 |
| AI 봇 robots 허용 | `src/app/robots.txt/route.ts` | 차단 시 인용 0 — 디폴트 허용 |
| IndexNow ping | `src/lib/aeo.ts::pingIndexNow` | Bing 즉시 인덱싱 → Copilot/Perplexity 노출 가속 |
| Sitemap + ISR revalidate | `src/app/sitemap.xml/route.ts` | 발행 즉시 크롤 가능 |
| E-E-A-T 시그널 (reviewedBy·lastReviewed) | `aeo.articleSchema()` | 의료 콘텐츠 신뢰도 가산 |
| 4-엔진 인용 추적 + sentiment | `/api/monitor/tick` | 무엇이 왜 인용되는지 학습 → 콘텐츠 보강 루프 |

## 빠른 시작

```bash
pnpm install            # 또는 npm install / yarn
cp .env.example .env.local
pnpm dev                # http://localhost:3000
```

env 비워두면 mock-data로 풀 UI 동작.

배포: `git push` → Vercel 자동 빌드.

## 디자인 토큰

| 변수 | 값 | 용도 |
|---|---|---|
| `--brand` | `#0E5A6B` | Primary CTA · 진행률바 · 차트 메인 |
| `--brand-tint` | `#E0EDEF` | 탭 활성 · 카드 강조 배경 |
| `--accent` | `#15B8A6` | 보조 강조 (데이터 highlight) |
| `--status-success` | `#10B981` | 긍정 / 완료 / 발행됨 |
| `--status-warning` | `#F59E0B` | 검수 필요 / 초안 |
| `--status-danger` | `#EF4444` | 부정 / 누락 |
| `--engine-chatgpt` / `claude` / `gemini` / `perplexity` | 엔진 시그니처 색 | 멘션 차트·뱃지 |

## 운영 컨벤션 (반드시 유지)

1. **No mocking compliance** — 의료법 린터 우회 금지 (`/api/publish/auto`)
2. **Token-first** — `#hex` 직접 사용 금지, Tailwind 토큰 또는 CSS 변수만
3. **AI 봇은 디폴트 허용** — robots.txt에서 GPTBot 등 차단 시 인용 0
4. **published만 sitemap/llms.txt 노출** — draft/review는 자동 제외
5. **Korean-first** — UI는 한국어, 코드 식별자만 영어

## 다음 작업 (오픈 토픽)

- Supabase 스키마 + Alembic 대체 SQL 마이그레이션
- LLM provider 실 SDK 연결 (`src/lib/llm/*.ts`)
- 의료법 린터 룰 풀 — 기존 `src/compliance` 포팅
- 네이버 블로그 발행 자동화 (현재 클립보드만)
- Funnel — Publication 클릭 → 문의 전환 매칭

## Figma 레퍼런스

- 기획정의서: `0aTpygHZIzbzv5lHr0iRnc?node-id=791-15556`
- UI 100% 싱크로 대상: `0aTpygHZIzbzv5lHr0iRnc?node-id=804-353`
