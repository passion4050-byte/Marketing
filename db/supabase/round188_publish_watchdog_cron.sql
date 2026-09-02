-- Round 188 (2026-09-02) — 발행 스케줄 감시자를 Supabase pg_cron 으로 돌린다.
--
-- ## 왜 pg_cron 인가 (🔴 이게 이 라운드의 핵심)
-- Round 187 실측: GitHub Actions 발행 cron 이 예정대로 돌지 않는다.
--   지연 29분 ~ 6시간 30분, 스케줄 9회 중 성공 6회 = 유효 가동률 약 65%.
--   2026-09-02 05:00 UTC 슬롯은 2시간 40분째 미발사 + 큐에도 없었다.
--
-- **감시자를 GitHub Actions 에 두면 순환이다** — 발행이 안 돈 날은 감시자도 안 돈다.
-- 그래서 감시 대상과 **다른 스케줄러**를 써야 한다. 이 프로젝트에서 이미 쓸 수 있는
-- 관리형 스케줄러는 Supabase pg_cron 뿐이다(pg_net 은 이미 설치돼 있고, Round 186
-- 배포 훅이 같은 경로를 쓴다).
--   - Vercel Cron 은 Hobby 플랜이라 하루 1회 제약이 있어 대안으로 부적합
--   - 별도 외부 스케줄러는 새 인프라 + 새 비용
--
-- ## 무엇을 호출하나
-- geo-v2 의 `/api/cron/publish-watchdog` (medimap-blog-v2). 인증은 기존
-- citation-alerts 와 동일한 `cronSecret` 쿼리 파라미터.
-- 이상이 없으면 이메일을 보내지 않으므로 스팸이 되지 않는다.
--
-- ## 스케줄 근거
--   02:00 UTC (11:00 KST) — 전날 22:00~23:00 UTC 슬롯이 돌았는지 확인
--   09:00 UTC (18:00 KST) — 당일 05:00~06:00 UTC 슬롯이 돌았는지 확인
-- 하루 2회면 장애 시 최대 2통 — 알림 피로 없이 반나절 안에 잡힌다.
--
-- ## ⚠ 적용 전 준비
-- 1) Supabase 대시보드에서 아래 값을 확인/설정해 둘 것:
--    - geo-v2 의 `CRON_SECRET` (Vercel 환경변수와 동일해야 함)
--    - geo-v2 의 `RESEND_API_KEY` (없으면 감지는 되지만 메일이 안 나간다)
-- 2) 아래 `<<WATCHDOG_URL>>` 을 실제 URL + cronSecret 으로 치환한 뒤 실행할 것.
--    시크릿을 이 파일에 커밋하지 말 것 — 리포는 public 이다.
--
-- ## 되돌리기
--   SELECT cron.unschedule('publish-watchdog');

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 재적용 안전: 이미 있으면 지우고 다시 건다.
DO $$
BEGIN
  PERFORM cron.unschedule('publish-watchdog');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- 없으면 무시
END $$;

SELECT cron.schedule(
  'publish-watchdog',
  '0 2,9 * * *',
  $CRON$
  SELECT net.http_post(
    url := '<<WATCHDOG_URL>>',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'pg_cron')
  );
  $CRON$
);

-- 확인:
--   SELECT jobid, jobname, schedule, active FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
