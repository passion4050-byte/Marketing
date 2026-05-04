# medimap-blog (메디맵 테크 블로그)

AEO/GEO 자산용 Next.js 14 SSG 사이트. AI 검색엔진(Perplexity, ChatGPT, Gemini, Claude)이 cite할 수 있는 자사 통제 URL(`medimap-blog-phi.vercel.app/blog/{slug}`)을 발행한다.

## Stack

- Next.js 14 App Router (SSG, RSC)
- TypeScript + Tailwind CSS 3
- MDX (next-mdx-remote) — 콘텐츠는 `content/blog/*.mdx`
- Pretendard 한국어 폰트

## Run

```powershell
cd medimap-blog
npm install
cp .env.example .env.local
# .env.local 채우기
npm run dev      # http://localhost:3001
npm run build    # SSG 빌드 → .next/
```

## 배포 (Vercel)

두 가지 옵션:

1. **`blog.medimap.kr` 서브도메인 (권장 — DNS만)**
   - Vercel 프로젝트 생성 → root: `medimap-blog/`
   - `NEXT_PUBLIC_BASE_PATH=` (비워둠)
   - `NEXT_PUBLIC_SITE_URL=https://blog.medimap.kr`
   - DNS: `blog.medimap.kr` CNAME → Vercel

2. **`medimap.kr/blog` 서브패스 (권한 집중 — 메인 사이트 rewrite 필요)**
   - `NEXT_PUBLIC_BASE_PATH=/blog`
   - 메인 medimap.kr 사이트의 next.config / nginx에 rewrite 추가:
     ```
     /blog/* → https://<vercel-deployment>/blog/*
     ```

## 콘텐츠 추가

`content/blog/{slug}.mdx`에 frontmatter + 본문 작성. SaaS 측 export 파이프라인은 `scripts/export_to_mdx.py`(Phase 7-02)이 GeneratedContent → MDX commit을 자동화한다.

## AEO 체크리스트 (글 단위)

- [x] Article + FAQPage + MedicalWebPage JSON-LD
- [x] breadcrumb + canonical
- [x] OG/Twitter card
- [x] sitemap.xml + robots.txt
- [x] 의료법 린터 통과 (SaaS export 단계에서 검증)
- [x] CTA 블록 (카톡채널/플레이스/전화)
- [x] 자사 페이지 funnel 추적 가능 (UTM/단축링크)
