-- Round 198 (2026-09-08) — 측정 엔진 감시자 등록.
-- ✅ 적용 완료 (2026-09-08). cron.job jobid=3 'measure-watchdog' '30 1,8 * * *'.
--
-- ## 왜
-- Round 197 실측에서 **엔진이 조용히 빠져 있던 것**을 두 건 찾았다:
--   - Perplexity: `responses` 에 행이 0건. **넉 달간 한 번도 측정된 적이 없다.**
--     `_build_engines()` 가 `PERPLEXITY_API_KEY` 유무로 켜는데 시크릿이 없어 조용히 skip.
--   - Claude: 2026-09-03부터 전량 실패(크레딧 소진). 그런데 배치 로그 헤더에는
--     `✓ Claude engine 활성` 이 찍히므로 정상처럼 보인다. 5일간 아무도 몰랐다.
--
-- 🔴 **엔진이 빠져도 배치는 "성공" 으로 끝난다** — 남은 엔진으로 계속 돌기 때문이다.
--    그래서 워크플로 상태만 봐서는 알 수 없고, 그 사이 Mention Share 는 조용히 기운다.
--    발행에는 Round 188 감시자가 있었는데 측정에는 없었다.
--
-- ## 🔴 사용자 숙제를 0으로 (Round 191b 교훈)
-- Round 188 은 "시크릿을 손으로 넣어라" 라는 숙제를 남겼고 한 달간 방치됐다.
-- 여기서는 **기존 publish-watchdog 행의 secret 을 그대로 복사**한다. 같은 앱의
-- 같은 CRON_SECRET 이므로 값을 알 필요도, 커밋할 이유도 없다. 숙제 0.
--
-- ## 되돌리기
--   SELECT cron.unschedule('measure-watchdog');
--   DELETE FROM public.cron_endpoints WHERE id = 'measure-watchdog';

INSERT INTO public.cron_endpoints (id, url, secret, enabled, note)
SELECT 'measure-watchdog',
       'https://geo.wecircle.co.kr/api/cron/measure-watchdog',
       e.secret,     -- publish-watchdog 과 동일한 CRON_SECRET 재사용
       true,
       'Round 198 측정 엔진 감시자. secret 은 publish-watchdog 에서 복사(사용자 숙제 0).'
FROM public.cron_endpoints e
WHERE e.id = 'publish-watchdog'
ON CONFLICT (id) DO NOTHING;

-- 01:30 / 08:30 UTC = 10:30 / 17:30 KST.
-- publish-watchdog(02:00·09:00)보다 30분 앞. 같은 시각에 몰면 pg_net 큐가 겹치고,
-- 메일이 두 통 동시에 와서 어느 쪽 문제인지 헷갈린다.
DO $$
BEGIN
  PERFORM cron.unschedule('measure-watchdog');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'measure-watchdog',
  '30 1,8 * * *',
  $CRON$ SELECT public.fire_cron_endpoint('measure-watchdog') $CRON$
);

-- ────────────────────────────────────────────────────────────────
-- 실측 (2026-09-08 배선 직후, 라우트 **배포 전**):
--   SELECT * FROM public.cron_endpoint_health WHERE id='measure-watchdog';
--     enabled=true  secret_set=true  last_status_code=404  harvest_pending=false
--
--   🔴 404 는 이 시점에 **정상 결과**다 — DB → pg_net → geo.wecircle.co.kr 까지
--      도달했고 라우트만 아직 없다는 뜻이다(타임아웃이었다면 네트워크, 401이었다면 시크릿).
--      `git push` 후 Vercel 배포가 끝나면 다음 발사에서 200 이 된다.
--
-- 판정: 언제나 cron_endpoint_health 로 한다. fire_cron_endpoint 는 RETURNS void 이고
--       pg_net 은 비동기라 발사 시점엔 응답이 존재하지 않는다 (Round 191b·192).
--
-- 감시자가 보는 것 (라우트: medimap-blog-v2/src/app/api/cron/measure-watchdog/route.ts):
--   missing  — 기대 엔진인데 호출 기록이 아예 없음        → API 키 시크릿 미등록
--   down     — 최근 성공이 30h 이전 · 또는 24h 성공 0 + 실패 다수 → 크레딧·키 만료
--   degraded — 24h 실패율 50% 이상 (최소 10콜)
--   🔴 `responses` 가 아니라 `llm_call_logs` 를 본다. responses 에는 **성공만** 남아서
--      "요즘 조용하네" 와 "죽었다" 를 구분할 수 없다. llm_call_logs 는 status·error_msg 를
--      남기므로 실패하고 있다는 사실 자체를 관측할 수 있다.
