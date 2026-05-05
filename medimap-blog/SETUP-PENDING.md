# medimap-blog 어드민 운영 시작 체크리스트

> 사용자 액션 항목 — 코드 푸시 (commits b3ca1de → 3cd65d8) 후 운영 시작에 필요한 외부 인프라 설정.
> 이 파일이 존재하는 한 어드민은 미설정 상태. 모든 항목 완료 후 이 파일 삭제 권장.

## 1. Supabase 마이그레이션 실행 (필수)

Supabase 콘솔 → SQL Editor → New query → 아래 파일 내용 복사·실행:

```
medimap-blog/db/migrations/001_medimap_inquiries.sql
```

검증: `SELECT * FROM medimap_inquiries LIMIT 1;` 가 0 row 반환하면 OK.

## 2. Vercel 환경변수 설정 (필수)

Vercel 프로젝트 (medimap-blog) → Settings → Environment Variables. Production / Preview / Development 모두 적용:

| 키 | 필수 | 값 예시 |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres.xxx:pwd@aws-0-region.pooler.supabase.com:6543/postgres` (Supabase pooler URL, 포트 6543) |
| `ADMIN_PASSWORD` | ✅ | 어드민 진입 비밀번호 (운영자만 알 것) |
| `ADMIN_SESSION_SECRET` | 권장 | `openssl rand -hex 32` 결과 같은 랜덤 64-hex |
| `IP_HASH_SALT` | 권장 | 랜덤 문자열 (예: `medimap-prod-2026-xxxx`) |

이미 비어 있는 placeholder 들도 함께 채우면 좋음:

| 키 | 영향 |
|---|---|
| `NEXT_PUBLIC_KAKAO_CHANNEL_URL` | Footer/CTA/About 의 카카오톡 버튼 |
| `NEXT_PUBLIC_PHONE` | Footer 전화번호 |
| `NEXT_PUBLIC_NAVER_PLACE_URL` | Footer 네이버 플레이스 |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID |

설정 후 **Redeploy** 필요 (다음 push 또는 Vercel UI 의 Redeploy 버튼).

## 3. Vercel Toolbar 비활성화 (필수)

플로팅 "문의하기" 버튼이 우하단에 들어갔는데, Vercel Toolbar (Comments) 가 켜져 있으면 두 개가 겹쳐 보일 수 있음.

Vercel 프로젝트 (medimap-blog) → Settings → General → "Comments" / "Toolbar" 토글 → **OFF**

(코드 측면에서는 Vercel Toolbar 를 import 하지 않음 — 대시보드 토글이 유일한 방법.)

## 4. 운영 검증

설정 + Redeploy 완료 후:

1. `https://medimap-blog-phi.vercel.app/admin/login` 접속 → 비밀번호 입력 → `/admin` 진입
2. `/admin/settings` 에서 모든 환경변수가 ✓ "설정됨" 으로 노출되는지 확인
3. Incognito 창에서 `/about` 의 "비즈니스 제휴 문의" 폼 제출 → "문의가 접수되었습니다" 토스트 확인
4. 어드민 대시보드 새로고침 → 카운트 +1, 최근 문의 표에 방금 제출한 건 노출
5. `/admin/inquiries/[id]` 에서 상태 변경 + 메모 저장 동작 확인
6. 우하단 "문의하기" 플로팅 버튼이 모든 공개 페이지에 노출, `/contact` 와 `/admin/*` 에서는 자동 숨김 확인

## 5. (선택) 운영 보강 — 다음 세션 후보

- 신규 문의 알림 (Slack webhook 또는 이메일 SMTP) — 어드민을 매번 새로고침 안 해도 되도록
- 검색 결과 CSV 내보내기 — 엑셀 처리 운영자 용
- 단축링크 발급 폼 — 현재 조회만 가능, 신규 발급 UI 추가
- 블로그 글 5편 → 7~8편 (안과 추가 주제)
- Phase 1~3 콘텐츠 파이프라인 (의료법 린터 + FAQ 생성 + JSON-LD) — `/gsd-execute-phase`

---

체크리스트 완료 시 이 파일 자체를 삭제하면 됩니다 — 다음 세션에서 Claude 가 SETUP-PENDING.md 의 부재로 운영 시작 완료를 인지합니다.
