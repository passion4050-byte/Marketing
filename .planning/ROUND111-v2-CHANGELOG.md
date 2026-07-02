# Round 111 v2 (2026-07-02) — /blog + /with-partners **재재작성** (editorial magazine)

## 사용자 피드백 (v1 실패)
> 디자인이 조금 AI스러워. 더 고감도. UIUX 도 더 직관적. 카테고리 쉽게 찾을수 있게. 고퀄리티 최고 전문가 디자이너 만든 것처럼.

## v1 자기 진단 (내가 저지른 AI slop)

taste-skill SKILL.md 재검토 결과, v1 은 다음 위반 발견:

| taste-skill 규칙 | v1 위반 |
|---|---|
| NO multi-color category gradient | 7개 카테고리마다 각각 다른 gradient (안과=파랑, 피부=로즈, 성형=보라…) → **AI slop 대표 사례** |
| NO oversized H1 | `text-[68px]` 대형 헤드라인 |
| NO excessive gradient text | `bg-clip-text bg-gradient-to-r from-brand via-accent to-brand-600` |
| NO 3-column card layout | 7-cat grid 를 3-col 그리드로 표시 |
| NO neon glow | tinted shadow 라 해도 진료과 컬러가 튐 |
| NO oversaturated accents | 채도 높은 팔레트 다수 |
| NO Sparkles pill / emoji-ish tag | "With Partners" pill 에 Sparkles 아이콘 남용 |

## v2 리다이렉션 원칙

### 팔레트 축소
- BG: `#FAFAF7` (warm off-white, 종이 톤)
- Ink: `stone-950` / `stone-900`
- Sub: `stone-500` / `stone-600`
- Divider: `stone-200/70` (hairline)
- Accent: **없음** — 오로지 ink black. 색으로 유혹하지 않고 typography 로 계층 만듦.

### Typography
- Numeral: `font-serif` (Pretendard 옆에 브라우저 serif fallback → 시적 대비)
- Body sans: 기존 Pretendard 유지
- Italic serif accent: "자산" 같은 키워드 강조에만 (한 페이지 1~2회)
- Tabular nums 로 숫자 정렬

### Layout
- **3-col grid 완전 폐기**
- **Numbered magazine index** (1~7 카테고리를 세로 리스트로 stack, hairline divider)
- 각 row = `[Numeral 88px] [Title+subtitle 1fr] [Cover preview 240px] [Count+arrow]`
- Cover preview 는 grayscale → hover 시 컬러로 전환 (품격)

### Interaction
- Hover: numeral 이 stone-400 → stone-900 로 변색 (조용한 반응)
- Cover scale 1.02, grayscale → color
- Arrow translate-y & translate-x 소량

## `/with-partners` 재재작성

**섹션 구조**
1. **Masthead**: `Partner Network · Issue 07` eyebrow + 대형 heading (좌측) + sub-copy + 미니 stats (우측)
2. **Directory** (numbered magazine index):
   - 07개 진료과를 세로 리스트로
   - 좌측 numeral (01~07, serif) + 카테고리 명 + subtitle + cover preview + count + arrow
   - divide-y hairline
3. **Editorial Partner CTA**: 
   - 좌측: "병원의 이야기를, AI 검색 시대의 *자산*으로." (italic serif accent)
   - 우측: minimal black CTA `카카오톡으로 상담 신청` + arrow + 응답시간 caption

**직관성 개선**
- 스크롤 시 7개 카테고리가 한눈에 세로로 보임 (3-col 그리드보다 스캔 빠름)
- Cover preview 로 카테고리 성격 즉시 파악
- 대형 count 로 콘텐츠 밀도 즉시 파악

## `/blog` 재재작성

**섹션 구조**
1. **Masthead** (magazine cover):
   - Eyebrow `Wecircle Insights · Vol. 26` + serif italic 부제 "병원 마케팅을 다시 쓰는 시간" + 오른쪽 오늘 날짜
   - **Featured story cover-forward**: 4:5 aspect 대형 커버 이미지 (grayscale hover→color) + 우측 큰 헤드라인 + description + meta bar (날짜 · 읽기시간 · Read arrow)
2. **Section rail** (subtle chip navigation):
   - 3개 카테고리를 chip 형태로 (`Sections` eyebrow + chip). hover 시 chip → 검정 fill
   - 우측: 총 stories 카운트
3. **Latest** (magazine TOC):
   - `01`~`12` 넘버링 리스트. numeral (serif) + overline (카테고리 영문) + 제목 + description 1줄 + 오른쪽 날짜/읽기시간 + arrow
   - divide-y hairline
   - 하단 "전체 아카이브 보기" arrow link

**직관성 개선**
- Featured 가 1픽 카드로 즉시 눈 잡음 (magazine 표지)
- Sections chip 이 한 줄에 다 보임 (스크롤 없이 카테고리 인식)
- TOC 스타일 리스트 = 스캔 최적화 (3-col 카드 배열보다 정보 밀도↑)

## 폐기 요소 (v1 에서 지운 것)
- `partner-visual.ts` — 색상 팔레트 → 참조 안 하지만 파일은 유지 (미래 detail 페이지에서 필요 시 재활용)
- 카테고리별 gradient 아이콘 박스
- `bg-clip-text` gradient text
- 대형 stat card w/ backdrop-blur
- Sparkles pill / 이모지 은유 아이콘

## 준수 확인 (taste-skill checklist)
- [x] 3-col 카드 그리드 없음 — 세로 numbered list
- [x] Multi-color category identity 없음 — 단일 ink 팔레트
- [x] Gradient text 없음
- [x] Oversized H1 없음 — moderate `text-[52px]` cap
- [x] Neon glow 없음 — 모든 shadow 제거, hairline divider 만 사용
- [x] Emoji/sparkles 없음
- [x] Off-white bg + Zinc/Stone 팔레트
- [x] Cover preview grayscale → color hover (감도)
- [x] tabular-nums 로 숫자 정렬
- [x] 카테고리별 count 대형 노출 (직관성)

## Screenshot 검증
- https://wecircle.co.kr/with-partners → 세로 리스트, warm off-white, numbered 01~07, grayscale cover preview
- https://wecircle.co.kr/blog → 좌측 대형 4:5 커버 이미지, 우측 헤드라인, section chip 3개, Latest TOC 리스트

## 남은 개선 (Round 112+)
- Serif 폰트 정식 도입 (현재는 브라우저 fallback `font-serif`) → `Playfair Display` or `Cormorant` local host
- Featured 자동 선정 로직 개선 (현재는 `featured: true` or 최신)
- 카테고리 내부 (`/blog/category/[slug]`, `/with-partners/[category]`) 도 동일 톤으로
