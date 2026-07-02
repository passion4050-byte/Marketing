# Round 111 v5 (2026-07-02) — 모바일 최적화 + Header CTA URL 변경

## 사용자 요청
1. "위서클 바로가기" 헤더 버튼 → medi-map.co.kr 대신 **카카오 오픈챗 (위서클 카톡상담)** 연결
2. 모바일 스샷 기반 가독성/가시성/UIUX/디자인 고도화

## 완료

### 1. Header CTA URL/라벨 변경
- `Header.tsx`:
  - URL: `siteConfig.contact.medimapMain` → `siteConfig.contact.kakao` (오픈챗 링크)
  - Label: `위서클 바로가기` → `카카오톡 상담` (목적에 맞게)
  - Desktop primary CTA + mobile drawer 하단 CTA 모두 적용

### 2. Hero H1 사이즈 모바일 하향 (전 페이지)
스샷 관찰 — 좁은 폰 뷰포트에서 헤드라인이 너무 커서 부자연스러운 wrap 발생. 3단계 breakpoint 로 재설계:

| 페이지 | Before | After |
|---|---|---|
| Home | `text-[40px] md:text-[54px] xl:text-[62px]` | `text-[32px] sm:text-[38px] md:text-[54px] xl:text-[62px]` |
| About/Guide/Contact | `text-[38px] md:text-[52px] xl:text-[58px]` | `text-[30px] sm:text-[38px] md:text-[52px] xl:text-[58px]` |
| Blog featured H1 | `text-[36px] md:text-[52px]` | `text-[26px] sm:text-[32px] md:text-[42px] xl:text-[52px]` |
| With-Partners | `text-[38px] md:text-[52px]` | `text-[30px] sm:text-[38px] md:text-[52px]` |
| Category/Partner | `text-[42px] md:text-[60px]` | `text-[32px] sm:text-[38px] md:text-[52px] xl:text-[60px]` |
| Privacy/Terms/404 | `text-[36px] md:text-[52px]` | `text-[28px] sm:text-[34px] md:text-[52px]` |

Leading 도 동일 조정: 모바일 `leading-[1.1~1.15]` (조밀), 데스크톱 `leading-[1.05~1.08]`.

### 3. Featured cover aspect 모바일 하향
- Home: `aspect-[4/5]` → `aspect-[16/11] sm:aspect-[3/2] md:aspect-[4/5]`
- Blog: 동일 패턴
- **이유**: 모바일 세로 폰에서 4:5 이미지가 뷰포트 세로의 상당 부분을 차지해 스크롤이 느려짐. 16:11 로 가로 낙낙히 만들어 hero 카드가 컴팩트하게 fit.

### 4. Home 하단 CTA quote 중복 제거
- Before: `"병원의 이야기를, AI 가 인용하는 자산으로."` — Footer quote 와 완전히 동일해서 지루한 반복
- After: `"30분 상담부터. D+7 안에 첫 콘텐츠."` — 실행 지향적 문장. Footer manifesto quote 와 명확히 다른 톤.

### 5. Container padding 모바일 좁힘
- `max-w-[1280px] px-6 lg:px-10` → `max-w-[1280px] px-5 sm:px-6 lg:px-10`
- SED 로 10 파일 일괄 적용 (`home, about, guide, contact, blog, blog/category, with-partners, category, partner, not-found`)
- **효과**: 폰 좁은 폭에서 좌우 여백 4px 씩 회수 → 본문 밀도 상승, 넘버링·이미지가 화면 폭 더 잘 사용

### 6. Contact 페이지 라벨 겹침 완화
- `Company / Publisher` (2개 라벨 병치) → 모바일에서 `Publisher` 라벨 숨김 (`hidden sm:inline`), 문구도 `Publisher` → `사업자 정보` 로 자연스럽게

### 7. Home CTA 모바일 spacing
- `mt-10 gap-4` → `mt-8 gap-3 md:mt-10 md:gap-4` (모바일 여백 축소)
- 본문 `mt-8` → `mt-6 md:mt-8` 통일

## 파일 변경 요약
- `Header.tsx`
- `page.tsx` (Home), `about/page.tsx`, `guide/page.tsx`, `contact/page.tsx`
- `blog/page.tsx`, `blog/category/[slug]/page.tsx`
- `with-partners/page.tsx`, `with-partners/[category]/page.tsx`, `with-partners/[category]/[partner]/page.tsx`
- `privacy/page.tsx`, `terms/page.tsx`, `not-found.tsx`

## Push

```bash
cd C:\Users\user\Documents\Marketing
git add -A
git commit -m "Round 111 v5: 모바일 최적화 (hero 사이즈/aspect/padding) + Header CTA 카카오 오픈챗 연결"
git push origin main
```

## 배포 후 검증 (모바일 스샷 부탁)
1. 헤더 우상단 검정 버튼: `카카오톡 상담` 라벨 + 클릭 시 `open.kakao.com/o/spyAz9Bi` 로 이동
2. Home hero: H1 이 폰 화면 폭에 자연스럽게 fit (부자연 wrap 없음)
3. Featured cover: 모바일에서 세로 폭 컴팩트, 데스크톱에선 여전히 4:5 magazine cover
4. Home 하단 CTA: `"30분 상담부터. D+7 안에 첫 콘텐츠."` (Footer quote 와 다름)
5. Contact: Company 라벨 옆 `사업자 정보` (모바일에선 hidden)

## 남은 개선 (Round 112+)
- Admin (`geo-v2-beta`) 대시보드 톤 통일
- globals.css legacy class 정리 (`pill-label` / `container-content` / `card-*`) — admin/client 정리 완료 후 안전
- Blog MDX prose 스타일 stone 팔레트 미세 튜닝
- Featured cover 미로드 시 fallback 이미지 (현재 gradient placeholder)
