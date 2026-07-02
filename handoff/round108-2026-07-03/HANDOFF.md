# wecircle GEO/AEO SaaS — 핸드오프 Round 108 (2026-07-03)

> Round 108 시리즈 (a~h) 종합. 이미지/콘텐츠 파이프라인 완전 재구성 + 무신사 감도 + 위서클 리브랜딩 최종 + SEO 등록.
> 다음 세션 이어가기용.

---

## 0. 집/사무실에서 이어가기

```powershell
cd "C:\Users\user\Documents\Marketing"
git pull origin main
```
Claude 데스크탑앱 → 폴더 선택 → 첫 메시지:
**"handoff/round108-2026-07-03/HANDOFF.md 읽고 컨텍스트 파악 + Round 109 진행"**

---

## 1. 라이브 URL / 인프라

- **자사 콘텐츠**: https://wecircle.co.kr (Round 90 wecircle 도메인)
- 어드민: https://geo-v2-beta.vercel.app
- GitHub: https://github.com/passion4050-byte/Marketing (main)
- Supabase: `gifopyowyankfsfghhdi`
- Vercel 프로젝트: geo-v2 (admin) + medimap-blog (콘텐츠, wecircle.co.kr)

---

## 2. Round 108 시리즈 완료

### a. Nano Banana 이미지 파이프라인 (Python cron)
- OpenAI tier 2 접근 불가 → Gemini `gemini-2.5-flash-image` 로 전환
- `src/content/nano_banana_client.py` — 5 모델 fallback + ASCII slug + post-images 버킷
- workflow env: `IMAGE_PROVIDER=nano_banana`, `IMAGE_STRICT=true`

### b. body 폴리셔 (id 42 벤치마크)
- `src/content/body_polish.py` — entity 복구 + 마크다운 표 → HTML + 인라인 스타일 + Pretendard wrapper
- `blog_html.render_body()` 마지막에 자동 호출
- 사용자 정의 스타일 반영 (H2 굵음 + H3 미니멀 border-bottom)

### c. 무신사 매거진 감도 통합
- 이미지 프롬프트: `"cinematic 35mm film, 50mm lens, f/1.8 shallow depth, moody warm tone, muted earth palette"`
- Anti-text directive 강력화 (Nano Banana 한국어 오탈자 방지)
- backfill scripts + GH Actions workflow

### d. 메디맵 → 위서클 UI 완전 정리
- 30개 파일 sed 일괄 (`메디맵` → `위서클`, `MEDIMAP` → `WECIRCLE`)
- Header 로고, CTA, 콘텐츠 sub-title, 파트너 카드 전부

### e. 카카오톡 오픈챗 + 참고자료 제거 + 관련 콘텐츠
- 카카오톡 URL 통일: `https://open.kakao.com/o/spyAz9Bi`
- 파트너 상세 페이지 재구성: 참고 자료 제거 → 카카오톡 CTA + 관련 콘텐츠 카드
- 사용자 요구: wecircle.co.kr 내부 유도 (외부 URL 최소화)

### f. 자사 blog 페이지도 동일 정책
- 참고자료 제거, CTABlock 심플화 (카카오톡 하나만)

### g. 위치박스 근본 fix + 이메일
- `_location_block_html` 옵트인화 (`RENDER_LOCATION_BLOCK=true` 있을 때만)
- SQL 대청소: aside 42→0, 참고자료 41→0, medi-map URL 29→0, 메디맵 title 9→0
- tenants(12) 갱신 (주소, 홈페이지, contact.email)
- 이메일: `passion4050@gmail.com` 통일

### h. SEO 등록
- **GSC**: 93 페이지 발견, 홈페이지 색인 완료
- **네이버**: HTML meta 소유 확인, 사이트맵 등록 완료

---

## 3. DB 상태 (2026-07-03)

### 콘텐츠 발행 (66편 published)

| tenant | 발행 | body 폴리셔 | Nano Banana 이미지 |
|---|---|---|---|
| BGN 잠실 (4) | 5 | ✅ | ✅ |
| 밴스모자이너 (5) | 6 | ✅ | ✅ |
| 지우피부과 (6) | 7 | ✅ | ✅ |
| 바를정 (8) | 4 | ✅ | ✅ |
| 벨리셀 (9) | 5 | ✅ | ✅ |
| BGN 부산 (10) | 4 | ✅ | ✅ |
| 위서클 자사 (12) | 35 | ✅ | ✅ |
| **합계** | **66** | **66/66** | **66/66** |

### DB 정리 완료

| 이전 이슈 | 정리 후 |
|---|---|
| 아쓰트 `<aside class="location-info">` | 0건 (42→0) |
| `<h2>참고 자료</h2>` 섹션 | 0건 (41→0) |
| medi-map.co.kr URL | 0건 (29→0, wecircle.co.kr 로 치환) |
| title 안 "메디맵" | 0건 (9→0) |
| tenants(12) name | 위서클 |
| tenants(12) address | 서울특별시 서초구 사임당로 8길 13 |
| tenants(12) homepage | https://wecircle.co.kr |

### 이미지 재생성 상태 (nano_banana)
- 66/66 편 = 100% Nano Banana 로 재생성 완료
- 옛 흑인/백인 이미지: 0건
- 이미지 없음: 0건

---

## 4. SEO 등록 완료 (Round 108-h)

### Google Search Console
- **도메인 소유 확인**: 가비아 DNS TXT 레코드 `google-site-verification=Cc2G6lQIJFhvA-QVijyh7L08T_5MkaGVajWQumpfpVo`
- **사이트맵**: `sitemap.xml` 제출됨, 발견 페이지 **93개**
- **홈페이지 색인**: ✅ 완료

### 네이버 서치어드바이저
- **HTML meta 소유 확인**: `<meta name="naver-site-verification" content="de48a01a6a44a45a2540c6b0a658b0b2251ce08f" />` — `layout.tsx` 삽입
- **사이트맵 등록**: `https://wecircle.co.kr/sitemap.xml` (전체 URL 형식 필수)

---

## 5. 사용자 대기 액션

- [ ] GSC 주요 페이지 개별 색인 요청 (10개 정도)
- [ ] 네이버 웹페이지 수집 요청 (동일 URL 들, 하루 최대 50개)
- [ ] 며칠~2주 대기 → 실제 검색 노출 확인

---

## 6. 다음 라운드 후보 (Round 109+)

### 🟢 A. AI 검색 인용 측정 강화 (Round 109 추천)
- wecircle.co.kr 이 검색엔진에 등록 완료 → AI 크롤 대상
- 자동 측정 cron 이 이미 매일 KST 07:00 실행 중 (measure-ai-mentions)
- **다음**: `citation-paths` API + 대시보드 시각화 강화 — 어떤 콘텐츠가 어떤 AI 엔진에 어떤 키워드로 인용되는지 drill-down

### 🟠 B. 콘텐츠 자동 발행 확대
- 지금 66편. 카테고리별 편중 확인 후 auto-publish scheduler 로테이션 조정
- Round 104-b 경쟁사 인용 학습 인사이트 (id 8~12) applied=true → 다음 cron 부터 자동 주입 중

### 🟡 C. UTM 트래킹 대시보드
- Round 108-e 로 카카오톡 CTA 통일됨 (utm_source=blog|partner)
- **미완성**: 실제 유입 수 대시보드에 표시 (GA4 or Supabase shortlinks 활용)

### 🔵 D. 자사 CTA + 관련 콘텐츠 개선
- 지금 파트너만 관련 콘텐츠 카드 있음
- **미완성**: 자사 blog 도 카테고리별 관련 파트너 콘텐츠 카드 추가 → wecircle 내부 순환 극대화

### 🟣 E. A/B 자동 실행 + 결과 대시보드
- Round 95 A/B 인프라 있음
- **미완성**: 승자 자동 판별 + 학습 사이클 자동화

---

## 7. 함정 누적 (Round 108)

- **DP** OpenAI tier 2 이미지 모델 접근 불가 → Nano Banana 필수
- **DQ** Gemini API 이미지 모델 이름 자주 변경 → `ListModels API` 로 실측 확인 필수
- **DR** Supabase Storage object key ASCII 만 허용 (한글 → 400)
- **DS** 실제 버킷 이름 `post-images` (`blog-images` 아님)
- **DT** Nano Banana 는 텍스트 렌더링 좋아함 → 강한 ANTI_TEXT_DIRECTIVE 필수
- **DU** `_location_block_html` 이 body 저장 시점부터 aside 삽입 → 렌더 코드 자체 옵트인화 필수
- **DV** body_polish idempotent (`class="wecircle-body"` check)
- **DW** Nano Banana base64 → Buffer → Blob 캐스팅 필수 (TS strict)
- **DX** 네이버 서치어드바이저 사이트맵은 **전체 URL** 형식 필수
- **DY** Vercel medimap-blog 프로젝트 module cache 60s TTL — Redeploy or 대기

이전 함정 CK~DO 는 round81~105 handoff 참조.

---

## 8. 이번 세션 push 커밋 히스토리

- Round 108-a: Python cron → Nano Banana
- Round 108-b: body 폴리셔 + backfill script
- Round 108-c: 무신사 감도 프롬프트 + workflow
- Round 108-d: 메디맵 → 위서클 UI 정리
- Round 108-e: 카카오톡 오픈챗 + 참고자료 제거 + 관련 콘텐츠
- Round 108-f: 자사 blog 페이지도 동일
- Round 108-g: 위치박스 렌더 코드 옵트인 + 이메일 통일
- Round 108-h: 네이버 서치어드바이저 소유 확인 meta 추가

---

생성: 2026-07-03 — Round 108 시리즈 종합 마무리. 다음: Round 109 (AI 인용 측정 강화 추천).
