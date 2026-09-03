-- Round 191 (2026-09-03) — pg_cron 이 호출할 엔드포인트를 DB 행으로 둔다.
-- ✅ 적용 완료 (2026-09-03, 마이그레이션 round191_cron_endpoints + round191_cron_endpoint_health).
-- ✅ 가동 완료 (2026-09-03 07:19 UTC) — 시크릿 주입 후 last_status_code=200 실측. 남은 숙제 없음.
--    이 파일은 정본/재적용용. 시크릿을 담지 않으므로 그대로 커밋해도 된다.
--
-- ## 왜 (🔴 이게 핵심)
-- Round 188 감시자는 코드도 배포도 끝나 있었는데 **한 달 가까이 등록되지 못했다.**
-- 이유는 로직이 아니라 배선이었다: `cron.schedule` 명령문 안에 URL+시크릿을 박아야 해서
--   (1) 정본 SQL 을 리포에 커밋할 수 없고 (public 리포다)
--   (2) `cron.job.command` 에 시크릿이 평문으로 남는다
-- → "사용자가 손으로 치환해서 실행" 이라는 숙제가 되었고, 그대로 방치됐다.
--
-- 해결: `deploy_hooks` 와 **같은 패턴**을 쓴다. URL/시크릿은 테이블 행에 두고
-- cron 은 함수만 부른다. 그러면 SQL 은 시크릿 없이 재적용 가능하고,
-- 값 채우기는 UPDATE 한 줄이 된다.
--
-- ## 시크릿은 헤더로 보낸다
-- 감시자 라우트는 `?cronSecret=` 쿼리와 `x-cron-secret` 헤더를 둘 다 받는다.
-- 쿼리는 프록시/액세스 로그에 남으므로 **헤더만 쓴다**(Round 190 계열 규칙).
--
-- ## 되돌리기
--   SELECT cron.unschedule('publish-watchdog');

CREATE TABLE IF NOT EXISTS public.cron_endpoints (
  id            text PRIMARY KEY,
  url           text,
  secret        text,
  enabled       boolean NOT NULL DEFAULT false,
  last_fired_at timestamptz,
  last_request_id bigint,
  note          text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- deploy_hooks 와 동일한 보호: RLS 켜고 **정책을 만들지 않는다** → anon/authenticated 전면 차단.
-- (service_role 은 RLS 를 우회하므로 서버 코드는 그대로 읽는다.)
ALTER TABLE public.cron_endpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_endpoints FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fire_cron_endpoint(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_url     text;
  v_secret  text;
  v_enabled boolean;
  v_headers jsonb;
  v_req_id  bigint;
BEGIN
  SELECT url, secret, enabled INTO v_url, v_secret, v_enabled
  FROM public.cron_endpoints WHERE id = p_id;

  -- 미설정이면 조용히 no-op. 배선을 먼저 깔고 값은 나중에 채울 수 있게 한다.
  IF v_enabled IS NOT TRUE OR v_url IS NULL OR length(v_url) = 0 THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_secret IS NOT NULL AND length(v_secret) > 0 THEN
    v_headers := v_headers || jsonb_build_object('x-cron-secret', v_secret);
  END IF;

  -- pg_net 은 비동기 — request id 를 남겨야 나중에 성공 여부를 알 수 있다.
  SELECT net.http_post(
    url     := v_url,
    headers := v_headers,
    body    := jsonb_build_object('source', 'pg_cron', 'endpoint', p_id, 'at', now())
  ) INTO v_req_id;

  UPDATE public.cron_endpoints
     SET last_fired_at = now(), last_request_id = v_req_id, updated_at = now()
   WHERE id = p_id;
END;
$function$;

-- SECURITY DEFINER 이므로 호출 권한을 좁힌다.
REVOKE EXECUTE ON FUNCTION public.fire_cron_endpoint(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fire_cron_endpoint(text) FROM anon, authenticated;

-- 점검 한 줄:  SELECT * FROM public.cron_endpoint_health;
--   ⚠ url·secret 값은 노출하지 않는다. 설정 여부(boolean)만 보여준다 (Round 190 규칙).
CREATE OR REPLACE VIEW public.cron_endpoint_health AS
SELECT e.id,
       e.enabled,
       (e.secret IS NOT NULL AND length(e.secret) > 0) AS secret_set,
       e.last_fired_at,
       r.status_code AS last_status_code,
       left(r.content, 200) AS last_response,
       r.error_msg AS last_error
FROM public.cron_endpoints e
LEFT JOIN net._http_response r ON r.id = e.last_request_id;

REVOKE ALL ON public.cron_endpoint_health FROM anon, authenticated;

INSERT INTO public.cron_endpoints (id, url, secret, enabled, note)
VALUES (
  'publish-watchdog',
  'https://geo.wecircle.co.kr/api/cron/publish-watchdog',
  NULL,
  true,
  'Round 188 발행 감시자. secret 에 geo-v2 의 CRON_SECRET 을 넣으면 가동.'
)
ON CONFLICT (id) DO NOTHING;

-- 스케줄. 02:00 UTC(11:00 KST) · 09:00 UTC(18:00 KST) — 하루 2회.
--   02:00 → 전날 22:00~23:00 UTC 슬롯이 돌았는지
--   09:00 → 당일 05:00~06:00 UTC 슬롯이 돌았는지
-- 이상이 없으면 메일을 보내지 않으므로 스팸이 되지 않는다.
DO $$
BEGIN
  PERFORM cron.unschedule('publish-watchdog');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'publish-watchdog',
  '0 2,9 * * *',
  $CRON$ SELECT public.fire_cron_endpoint('publish-watchdog') $CRON$
);

-- ────────────────────────────────────────────────────────────────
-- ✅ 시크릿 주입 완료 — 감시자 가동 중. 재구축/타 프로젝트 이식 시에만 아래 한 줄이 필요하다.
--
--   UPDATE public.cron_endpoints
--      SET secret = '<geo-v2 의 CRON_SECRET>', updated_at = now()
--    WHERE id = 'publish-watchdog';
--
-- 확인:
--   SELECT public.fire_cron_endpoint('publish-watchdog');   -- RETURNS void → 결과 셀이 비는 게 정상
--   SELECT * FROM public.cron_endpoint_health;              -- 성패는 여기서만 읽는다
--
-- 🔴 fire_cron_endpoint 의 빈 결과를 실패로 읽지 말 것. void 함수이고, pg_net 은 비동기라
--    발사 시점에는 응답이 존재하지도 않는다. 판정은 항상 cron_endpoint_health 로 한다.
--
-- 실측 이력 (2026-09-03):
--   03:11 UTC 시크릿 주입 전 — secret_set=false, last_status_code=401 {"ok":false,"error":"unauthorized"}
--     → DB → pg_net → geo.wecircle.co.kr 경로가 끝까지 살아 있음이 증명됨 (404·타임아웃이 아니었다)
--   07:19 UTC 시크릿 주입 후 — secret_set=true, last_status_code=200
--     {"ok":true,"alerted":false,"reason":"healthy","hours_since_last":18,"active_tenants":13,
--      "thresholds":{"stale_hours":26,"tenant_stale_days":10}}
--   cron.job jobid=1 'publish-watchdog' '0 2,9 * * *' active=true
