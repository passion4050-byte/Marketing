# Round 146-B — "skin clinic in korea" 상위 5사 해부 + Magazine B 디자인 반영 (2026-08-15)

사용자 지시: 구글 "skin clinic in korea" 상위노출 5사를 심층 분석해 wecircle.co.kr
홈페이지·콘텐츠에 테크니컬 요소 반영 + Magazine B(en.magazine-b.com) 디자인 고도화.
국내/해외 둘 다 적용. 자동루프에도 반영.

## A. 상위 5사 실측 요약 (Firecrawl 전수 수집)

대상: renovoskinclinickorea.com / seoulorthopedics.com(top-10 리스티클) /
enlienjang.com / gangnamobgyn.com(best-7) / gangnamwomenshealth.com(best-skin-clinics)

**구조 발견**: 2·4·5번은 (주)파인더패턴 제작 위성 네트워크(푸터 크레딧 실측) —
"본진 도메인 + 타 병원 도메인 위 리스티클 허브 + 시술별 영문 EMD 마이크로사이트" 3층.
링크 네트워크는 모방 금지(스팸 리스크). 모방 가치는 **문서 구조와 블록 포맷**.

**핵심 반전**: 5사 전원 JSON-LD 0개 (3중 도구 교차 실측). 이 SERP 에서 구글이
보상한 건 스키마가 아니라 문서 구조 — 넘버 리스티클 + 고정필드 클리닉 블록 +
본문 Q&A 8~11개 + 개체명 밀도 + 답변형 첫 문단. **FAQPage 100% 는 우리만의
차별 우위이므로 유지**, 승부처는 본문 구조.

공통 승리 패턴 (3사 이상 공유):
1. `N) 이름 — Location / Best for / Services 실명 / Visitor tip` 고정필드 블록
2. title `[Best|Top]+숫자+키워드+지역+for Foreigners` — **연도 사용 0곳**
3. meta description: 질문 재진술 + 숫자 답변 + 동네명 3~4 + 시술명 3~4 나열
4. 본문형 FAQ (스키마 없이 헤딩 Q&A, 최대 11문항)
5. WhatsApp 딥링크(wa.link) 블록마다 반복
6. 지역 접미사 영문 슬러그 `-in-seoul`/`-gangnam` (서비스 페이지 전수)
7. 슬러그 고정 + 본문 숫자 증축(top-10 슬러그 → Top 15 타이틀)으로 신선도 갱신
8. 여행자 실용 정보(세션 수·다운타임·체류 팁) 내장
9. E-E-A-T 표면 장치(저자·날짜·출처) 전멸 — 개체명 밀도가 대체. **무주공산 차별 기회**
10. 첫 문단: 질문 → 볼드 개체명 즉답 → 시술 나열 (5번 사이트 완성형)

## B. 이번 라운드 반영 완료 (Round 146-B 커밋)

| # | 반영 | 파일 | 적용 범위 |
|---|---|---|---|
| 1 | 첫 문단 볼드 개체명 즉답 추가 | src/content/generator.py `_ANSWER_FIRST_DIRECTIVE` | 국내+해외 |
| 2 | `_SERP_PROVEN_DIRECTIVE` 신설 — 고정필드 블록·FAQ 8+·증상별 가이드·개체명 밀도·최상급 금지 | generator.py | 국내+해외 |
| 3 | 해외 아키타입 개정 — 연도 폐지→타이틀 공식, FAQ 4+→8+, Traveler practicality 섹션, 메신저 언어분기(EN WhatsApp/JA LINE/ZH WeChat), meta 동네·시술 나열 | generator.py `_OVERSEAS_ARCHETYPE_DIRECTIVE` | 해외 |
| 4 | 해외 신규 슬러그 `-in-korea` 접미사 (기존 발행분 불변 — URL 유지=랭킹 유지) | src/collector/scheduler.py `_make_slug(lang)` | 해외 |
| 5 | Magazine B 1단계 — prose/db-html 에디토리얼(잉크 링크·좌룰 세리프 블록쿼트·무채 마커·헤비룰 표·무프레임 이미지), reading-progress·card-accent 단색화, overline-label/section-rule/img-editorial 프리미티브, paper/rule 토큰 | medimap-blog globals.css + tailwind.config.ts | KR+해외 (design-only, 마크업 무접촉) |

자동루프 반영: #1~3 디렉티브는 daily_auto_content_job → generator 경로에 자동 주입
(국내/해외 모두). 학습 루프(learned_insights)와 별개의 "실측 베이스라인" 층.

## C. Magazine B 디자인 — 남은 2·3단계 (다음 라운드)

실측: Beausite 그로테스크 2웨이트 단일 패밀리, 흑백+콘텐츠 컬러, 12컬럼,
이슈 넘버링, 1px 헤어라인. wecircle 은 KR 홈·CTABlock·/en/clinics 가 이미 90% —
문제는 이중 토큰(SaaS brand vs stone 하드코딩)과 본문 prose 의 SaaS 블루 톤(→1단계로 해소).

- **2단계 (마크업)**: ArticleCard 오픈 레이아웃(박스→이미지4:5+overline+제목),
  OverseasShell CTA `rounded-full`→각형, /blog·/with-partners 넘버 디렉토리
  (/en/clinics 패턴 미러), h2 28px→24px 검수, SectionRule 부품 적용, 푸터 pill 각형화.
- **3단계**: stone 하드코딩→토큰 전수 치환, 글 상세 No./Issue 메타바, h2 CSS counter,
  JA/ZH Noto 폰트스택, img-editorial 채도 필터 A/B.
- **원칙**: 포인트 유채색 = CTA 채널 컬러(WhatsApp 그린/LINE 그린/카카오 옐로)만.
  #1B68FF 는 인터랙션(hover·포커스) 전용, 면 사용 금지. 민트는 공개 사이트 퇴역.
  TrackedLink·ShortLink·JsonLd·hreflang·GA4 무접촉.

## D. SEO 남은 스펙 (다음 라운드)

- 고정필드 파트너 블록 **렌더 컴포넌트화** (현재는 프롬프트 디렉티브만 — 수동 3편을 전 편 자동화)
- 저자·검수·업데이트일 표기 (경쟁 0/5 무주공산, 의료법상 실명·자격 실보유분만)
- 리스티클 갱신 정책 운영화: 슬러그 고정 + 항목 수 증축 재발행 (frontmatter updated)
- KR 한글 슬러그는 국내 SERP 무방 — 전환 불필요 (해외만 영문 접미사)
