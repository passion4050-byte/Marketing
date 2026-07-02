# Round 110 (2026-07-02) — 신규 인용 알림 + 크롤러 로그 + Kakao UTM + 리포트 브랜드 감사

## 110-A. 신규 AI 인용 감지 → passion4050@gmail.com 이메일 알림

**신규 파일**
- `medimap-blog-v2/src/app/api/cron/citation-alerts/route.ts` — 최근 24h 신규 mentions 감지 → tenant/engine 별 요약 → Resend 이메일 발송. 0건이면 skip (스팸 방지).
- `.github/workflows/citation-alerts.yml` — 매일 00:00 UTC (09:00 KST) cron. 측정 cron 07:00 KST 이후 2시간 후 실행.

**필수 Vercel 환경변수**
- `RESEND_API_KEY` (이미 있음)
- `RESEND_FROM` (기본: `WECIRCLE GEO <reports@medimap.team>`)
- `CITATION_ALERT_EMAIL` (기본: `passion4050@gmail.com`)
- `CRON_SECRET` (이미 있음)

**필수 GH secrets**
- `VERCEL_PROD_URL`, `CRON_SECRET` (이미 있음)

### 카카오톡 알림에 대한 정직한 판단

| 옵션 | 가능 여부 | 이유 |
|---|---|---|
| 개인 카카오톡 push (내 계정에 알림) | ❌ 불가 | 카카오 공식 API 없음. 스팸 방지 정책. |
| 카카오 알림톡 (사업자 → 개인) | 🟡 가능하지만 오버킬 | 사업자 등록 + 템플릿 사전 승인 필요 (2~4주). 건당 8~15원. 자기 자신용으로는 과함. |
| 카카오 채널 상담 챗 (자동 메시지) | ❌ 불가 | 챗봇 승인 필요. 알림용 아님. |

**결론 (사용자용 냉정 판단)**: 카카오톡 알림은 자기 자신용으로는 실무 오버헤드가 크다. **이메일 (즉시)** 을 primary 로 쓰고, 즉시성이 더 필요하면 다음 옵션이 저렴하고 안정적이다:

1. **Telegram Bot API** (무료, 5분 설정): BotFather 로 봇 생성 → chat_id 확인 → `curl -d 'chat_id=X&text=Y' https://api.telegram.org/bot<TOKEN>/sendMessage`
2. **Discord webhook** (무료, 5분 설정): 개인 Discord 서버 채널 → Webhook URL 발급 → POST JSON
3. **SMS (naver cloud SENS)** (유료, 건당 ~8원): 사업자 인증 필요하지만 알림톡보다 빠름

원하면 Telegram 이나 Discord 도 endpoint 에 추가해 줄 수 있음. 지금은 이메일만 배선.

---

## 110-B. AI 크롤러 로그 시각화 위젯 (UI/UX 고도화)

**신규 파일**
- `medimap-blog-v2/supabase/migrations/202607_crawler_hits_and_kakao_referrals.sql` — `crawler_hits` 테이블 스키마 (bot_name, path, referer, country, hit_at + 인덱스 3개).
- `medimap-blog/src/lib/crawler-detect.ts` — 15종 AI 봇 UA 감지 정규식 (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider, Meta-ExternalAgent, Amazonbot, Applebot-Extended, Diffbot 등).
- `medimap-blog/src/app/api/track/crawler/route.ts` — nodejs runtime, POST 로 hit 적재.
- `medimap-blog-v2/src/app/api/admin/crawler-stats/route.ts` — 30일 집계 (봇별 랭킹, 일별 timeline, 상위 페이지, WoW 델타).
- `medimap-blog-v2/src/components/admin/CrawlerLogWidget.tsx` — 위젯 (그라디언트 KPI 카드 + 30일 스파크라인 히트맵 + 봇 랭킹 진행바 + 상위 페이지 리스트).

**수정 파일**
- `medimap-blog/middleware.ts` — bot UA 감지 시 fire-and-forget 로 `/api/track/crawler` 호출 (300ms timeout, 응답 지연 방지).
- `medimap-blog/src/lib/db.ts` — `recordCrawlerHit()` 헬퍼 추가.

**필수 액션**
1. Supabase SQL Editor 에서 마이그레이션 실행:
   ```sql
   -- 파일: medimap-blog-v2/supabase/migrations/202607_crawler_hits_and_kakao_referrals.sql
   ```
2. 배포 후 GPTBot 등이 실제로 왔다갔는지 어드민 → 대시보드 → "AI Crawler Radar" 카드 확인.

**UX 특징 (디자인 밀도)**
- 그라디언트 배경 (`from-surface-base to-slate-50/40`) + shadow-soft
- 봇별 컬러 코딩 (OpenAI → emerald, Claude → purple, Perplexity → orange, Google → blue, CCBot → slate)
- 30일 스파크라인 히트맵 (peak 값 대비 opacity + height 이중 인코딩)
- Insight banner (WoW 델타 → 자동 해석)

---

## 110-C. UTM 카카오톡 유입 트래킹 대시보드

**신규 파일**
- `medimap-blog-v2/supabase/migrations/202607_crawler_hits_and_kakao_referrals.sql` (위와 같은 파일) — `kakao_referrals` 테이블 (event, page_path, cta_label, utm_medium, utm_campaign, tenant_id, ip_hash + 인덱스 3개).
- `medimap-blog/src/app/api/track/kakao/route.ts` — beacon endpoint. navigator.sendBeacon 지원.
- `medimap-blog-v2/src/app/api/admin/kakao-referrals/route.ts` — 30일 집계 (이벤트별 분포, 일별 timeline, 상위 페이지, UTM campaign 랭킹).
- `medimap-blog-v2/src/components/admin/KakaoFunnelWidget.tsx` — 위젯 (앰버 그라디언트 + 스파크라인 + 이벤트 분포 + campaign chip).

**수정 파일**
- `medimap-blog/src/components/TrackedLink.tsx` — channel=kakao 클릭 시 `/api/track/kakao` beacon 자동 발사. `kakaoMedium` (cta/floating/channel/inline), `tenantId` 옵션 파라미터 추가.
- `medimap-blog/src/lib/db.ts` — `recordKakaoReferral()` 헬퍼 추가.

**측정 대상 이벤트**
| event | 발화 위치 | utm_medium |
|---|---|---|
| `kakao_cta_click` | CTABlock 카카오톡 상담 버튼 | `cta` |
| `kakao_floating_click` | 하단 플로팅 카카오톡 버튼 | `floating` |
| `kakao_channel_click` | 채널 홈 링크 | `channel` |

**UX 특징**
- 카카오 브랜드 컬러 (앰버 `#F59E0B` + 옐로우 그라디언트)
- 30일 스파크라인 + WoW 델타 명시
- UTM campaign 태그 wall (chip 형태)

---

## 110-D. 월간 리포트 데이터 연동 감사 + 브랜드 정리

**감사 결과 — 지금 리포트에 잘 연동된 데이터**
- Q1 요약 (총 인용, 자사 점유율, 발행 콘텐츠)
- 키워드별 성과
- 경쟁사 Top 5
- 자사 발행 콘텐츠 list + 인용 여부
- 자사 인용 URL 리스트
- 액션 플랜 (weakKeywords + competitorTop 기반)

**갱신 완료 (수정 파일)**
- `medimap-blog-v2/src/app/api/admin/reports/email/route.ts` — MEDIMAP → WECIRCLE, medi-map.co.kr → wecircle.co.kr, subject prefix, 본문 리스트 4항목 갱신 (파트너별 인용 랭킹 언급 추가).
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/page.tsx` — 15개 이상의 "메디맵" 라벨/제목 → "위서클" (SED 일괄), 회사 라벨 갱신, footer 갱신.
- `medimap-blog-v2/src/app/admin/(portal)/reports/[tenantId]/_components/ReportTrendChart.tsx` — 차트 legend "메디맵 T1/share" → "위서클 T1/share".

**추후 통합 후보 (Round 112+)**
- 파트너 리더보드 요약 카드 (Round 109-A partner-leaderboard API 재사용)
- AI 크롤러 방문 요약 (Round 110-B crawler-stats API)
- 카카오톡 유입 요약 (Round 110-C kakao-referrals API)
- 이 세 개를 리포트 페이지 후반부에 client widget 으로 임베드 or 이메일 endpoint 확장

---

## 배포 순서

1. **DB 마이그레이션 (사용자 수동)**
   - Supabase SQL Editor 에서 `medimap-blog-v2/supabase/migrations/202607_crawler_hits_and_kakao_referrals.sql` 실행.

2. **git commit + push**
   ```bash
   cd C:\Users\user\Documents\Marketing
   git add .github/workflows/citation-alerts.yml \
           medimap-blog-v2/src/app/api/cron/citation-alerts \
           medimap-blog-v2/src/app/api/admin/crawler-stats \
           medimap-blog-v2/src/app/api/admin/kakao-referrals \
           medimap-blog-v2/src/app/api/admin/reports/email/route.ts \
           medimap-blog-v2/src/app/admin/\(portal\)/reports \
           medimap-blog-v2/src/components/admin/CrawlerLogWidget.tsx \
           medimap-blog-v2/src/components/admin/KakaoFunnelWidget.tsx \
           medimap-blog-v2/src/app/admin/\(portal\)/page.tsx \
           medimap-blog-v2/supabase/migrations/202607_crawler_hits_and_kakao_referrals.sql \
           medimap-blog/src/lib/crawler-detect.ts \
           medimap-blog/src/lib/db.ts \
           medimap-blog/src/components/TrackedLink.tsx \
           medimap-blog/src/app/api/track \
           medimap-blog/middleware.ts \
           .planning/ROUND110-CHANGELOG.md
   git commit -m "Round 110: 신규 인용 이메일 + 크롤러 로그 위젯 + Kakao UTM 트래킹 + 리포트 브랜드"
   git push origin main
   ```

3. **Vercel 재배포 자동 트리거** (medimap-blog + medimap-blog-v2 둘 다).

4. **검증 (배포 완료 후 ~2분)**
   - 어드민 → 대시보드 → "AI Crawler Radar" / "Kakao Funnel" 카드 렌더 확인 (초기엔 empty state).
   - GH Actions → citation-alerts workflow → Run workflow 로 수동 실행 → 24h 신규 인용 있으면 이메일 확인.
   - CTA 버튼 클릭 후 Supabase `kakao_referrals` 테이블에 row 쌓이는지 확인.
   - 며칠 후 GPTBot / ClaudeBot 방문 시 `crawler_hits` 테이블 누적 확인.
