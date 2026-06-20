# 핸드오프 — 2026-06-20 (Round 58~62 완료)

> 오늘 (집 → 출근 PC 이어가기) 작업 컨텍스트 + 내일 사무실 가이드.

---

## 0. 오늘 commit list (이걸 push 했어야 함)

| Hash | 라운드 | 내용 |
|---|---|---|
| (push 끝) | R57 | recharts dynamic + SEO/perf + 핸드오프 가이드 |
| 0da6c65 | R52 | competitors 인사이트 박스 + 모바일 카드 |
| 6d96d90 | R52 fix | T5 동종업계 경쟁사 라벨 동적 |
| fe8cd7c | R53 | tenants.report_send_day + 일별 cron + reports 재디자인 |
| a1fea95 | R54 | calendar live URL + saas-tracking 리네이밍 |
| 84dd25f | R55 | reports 카드 → table dense list |
| daf7cb8 | R56 | reports 3 group cards + 진료항목 필터 + saas KPI anchor |
| 4e0cd4e/badb1db | R57 | recharts dynamic + handoff |
| 0da6c65~ | R58~ | Anthropic 연동, JSON 파싱 fix, max_tokens 8192 |
| ae96697 | R59~60 | **(CRITICAL)** Next.js fetch cache fix (supabase global.fetch) + UIUX overhaul + blog_category mapping + image_picker raw Pollinations fallback + SKILL update |
| f9a166f | R60 fix | cover_image_url mapping in dbRowToPostMeta |
| (집 막 push) | R60 fix 2 + 61 + 62 | Korean image prompt + body figure inject + HTML entity decode + applied_insights infra |
| 3fda5d0 | R62 후속 | Google Search Console verification meta tag |
| 7db85cf | R62 fix | NextResponse.json signature (3-arg → 2-arg) |

**현재 시점 가장 최신 commit**: `7db85cf` (push 끝, Vercel 두 빌드 다 Ready)

**Vercel 상태**:
- `medimap-blog` (`medimap-blog-phi.vercel.app`): 🟢 Ready
- `geo-v2` (`geo-v2-beta.vercel.app`): 🟢 Ready

---

## 1. 사무실 PC 시작 절차

### A. PowerShell 첫 명령
```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main
```

→ 집에서 push 한 모든 변경 사항 받음. `7db85cf` 까지 동기화.

### B. Claude 데스크탑앱
1. 폴더 선택: `C:\Users\user\Documents\Marketing`
2. 첫 메시지: **"handoff/round62-2026-06-20/HANDOFF.md 읽고 오늘 작업 컨텍스트 파악해줘"**

→ Claude 가 이 파일 읽고 어제까지 작업 + 내일 우선순위 다 파악합니다.

---

## 2. 자동으로 진행될 일 (사용자 액션 없음)

### 매일 KST 08:00 + 14:00
- GitHub Actions `auto-publish` cron 자동 실행
- Anthropic Sonnet 4.6 으로 자사 1편 + 파트너 1편 발행
- 새 로직 (Round 58~61) 적용됨:
  - HTML entity 자동 decode
  - 한국 특화 cover 이미지
  - 본문에 figure 자동 삽입
  - blog_category 자동 분류 (hospital/content/ai)
  - Storage 실패해도 raw Pollinations URL fallback

### 매일 KST 18:00
- GitHub Actions `send-monthly-reports` cron 자동 실행
- today_day == tenant.report_send_day 인 tenant 만 이메일 발송
- 현재 등록 클라이언트 7명 (자사 1 + 6 클라이언트)

---

## 3. 사용자 액션 우선순위 (사무실 도착 후)

### 🟢 즉시 (5~30분)

#### A. cron 실행 결과 확인
1. https://github.com/passion4050-byte/Marketing/actions
2. 좌측 → `Auto-publish content (cron)` → 최근 run 클릭
3. ✅ 녹색 = 정상. drafts >= 1, errors=0 확인
4. ❌ 빨간 → 로그 캡처. Claude 에게 보여주기

#### B. 검수 대기 처리
1. https://geo-v2-beta.vercel.app/admin/content-queue
2. 검수 대기 list 확인 (2~4편 예상)
3. 새 라운드 적용 후 첫 글이라 quality 검증:
   - title 자연스러운지 (entity 없는지)
   - cover 이미지 한국 의료진인지 (서양인 아닌지)
   - body 안 figure 정상 표시되는지
   - 본문 내용 의료법 위반 없는지
4. 합격 글 → **발행 승인**, 양식 옛 글 → **거부**

#### C. Google Search Console 확인
1. https://search.google.com/search-console
2. 좌측 메뉴 → **Sitemaps** → `/sitemap.xml` 상태 확인
   - ✅ "성공" 으로 자동 전환되어 있을 가능성 높음 (24시간 안 자동 재시도)
3. 좌측 메뉴 → **색인 생성 → 페이지** → 인덱싱 카운트 확인
   - 어제 우선 요청한 #87, #89 가 "색인됨" 으로 나타나면 성공
4. #132 새로 요청 가능 (어제 할당량 초과)
   - URL 검사: `https://medimap-blog-phi.vercel.app/blog/medical-geo-customer-access-132`
   - "색인 생성 요청" 클릭

### 🟡 우선순위 중간 (1시간)

#### D. 클라이언트 이메일 등록 (영업 가치 큼)
미등록 5곳 — `/admin/tenants` 편집 → 이메일 칸 채우기:
- 밴스모자이너의원
- BGN 밝은눈안과 잠실
- 밝은눈안과 부산
- 바를정 한방의원
- 벨리셀 피부과
- 지우피부과 (필요 시)

→ 등록 후 매월 자동 ROI 보고서 발송 시작.

#### E. 발송일 분산
같은 tenant 편집 modal 에서 "월간 보고서 발송일" select:
- 메디맵: 1일 (그대로)
- BGN 잠실: 5일
- BGN 부산: 10일
- 밴스모자이너: 15일
- 바를정: 20일
- 벨리셀: 25일

→ Resend 한도 (월 3000건) 부담 분산.

#### F. Anthropic API key 보안
- POC 진행 중인 key 가 채팅 로그에 노출됨
- https://console.anthropic.com → Settings → API Keys → revoke → 새 key 발급
- GitHub Secrets + Vercel 환경변수에 새 key 교체

### 🔵 우선순위 낮음 (시간 있을 때)

#### G. saas-tracking 모니터링 시작
- https://geo-v2-beta.vercel.app/admin/saas-tracking
- 매주 월요일 아침에 메디맵 점유율 추이 확인
- 0% → 1% 도달 시점 = SaaS 가치 입증 시작

#### H. 다음 큰 작업 (Round 63+)
- Round 62 후속: learned-insights UI 마무리 (tenant dropdown + 적용 chip)
- 본 사이트 마이그레이션: vercel.app → medi-map.co.kr/blog
- 백링크 전략: 의료 매체 기고

---

## 4. 어제 발견한 주요 함정 (Claude 가 다시 만나면 즉시 인식해야 함)

| 코드 | 함정 | 정답 |
|---|---|---|
| **BX (CRITICAL)** | Next.js 13+ fetch auto-cache 가 Supabase 까지 캐시 (stale) | `createClient` 에 `global.fetch` override + `cache: 'no-store'` |
| BY | Anthropic 한국어 max_tokens 영어 대비 2배 | 8192 + stop_reason 감지 |
| BZ | Storage upload 실패 시 cover NULL | raw URL fallback |
| CA | DB 컬럼 → PostMeta 매핑 코드 누락 | 매핑 코드 점검 |
| CB | `NextResponse.json(body, init1, init2)` 안됨 | 단일 init 안에 status + headers |
| BR | `export const dynamic` + `import dynamic` 충돌 | `nextDynamic` alias |
| BX2 | LLM 응답 `'` → `&#x27;` HTML entity | `html.unescape()` 재귀 적용 |
| BS | 서양 의료진 출력 (한국 prompt 무력) | `no western faces` + `east asian features` 강제 |

상세는 SKILL.md 의 "Round 58~62" 섹션 참조 (3개월간 함정 BR~CB 누적).

---

## 5. 라이브 URL 정리

| 사이트 | URL | 용도 |
|---|---|---|
| medimap-blog | https://medimap-blog-phi.vercel.app | 자사 블로그 (SSG, AEO 자산) |
| admin v2 | https://geo-v2-beta.vercel.app | 운영자 콘솔 |
| GitHub | https://github.com/passion4050-byte/Marketing | private repo |
| Search Console | https://search.google.com/search-console | SEO 모니터링 |

---

## 6. 빠른 컨텍스트 복원 시퀀스

새 세션에서 Claude 에게 한 번에 던질 명령:

> "오늘 사무실 도착. 다음 순서로 정리해줘:
> 1. handoff/round62-2026-06-20/HANDOFF.md 읽기
> 2. SKILL.md 의 Round 58~62 섹션 훑기
> 3. `git log --oneline -20` 결과 받아서 어제 push 안 된 변경 확인
> 4. 우선순위 — 사용자 액션 A·B·C 안내"

→ Claude 가 5분 안에 어제 컨텍스트 다 복원합니다.

---

## 7. 정신 건강 우선

오늘 푸쉬 누적 + 디버깅 13시간+ 의 큰 작업이었음.

**사무실에서 다음 한 가지 원칙 권장**:
- **콘텐츠 검수 1라운드 (15분)** + **Google 인덱싱 확인 (5분)** = 20분만 처리
- 새 코드 작업은 충분히 휴식 + 컨디션 좋을 때
- 어제 13 라운드 + 9 fix 누적 = 함정 발견 비용보다 fix 검증 비용이 더 들었음. 라운드당 1~2개 함정 발견 시 즉시 종료 + 다음 날 분리 권장

---

오늘 진짜 마지막. 푹 쉬세요. 🛏️

내일 사무실 도착해서 이 파일 + Claude 데스크탑앱 으로 자연스럽게 이어집니다.
