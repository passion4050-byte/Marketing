-- Round 192 (2026-09-08) — pg_net 응답을 TTL 안에 수확해 영속 보관한다.
-- ✅ 적용 완료 (2026-09-08, 마이그레이션 round192_cron_endpoint_harvest
--    + round192_fix_on_conflict_predicate). 실측 last_status_code=200.
--
-- ## 왜 (🔴 이게 핵심)
-- Round 191b 가 만든 `cron_endpoint_health` 는 `LEFT JOIN net._http_response` 였다.
-- 그런데 **`pg_net.ttl = 6 hours`** 이고, 감시자 발사 주기는 `0 2,9 * * *` = **7시간**이다.
--   → 다음 발사 시점엔 직전 응답이 이미 삭제돼 있다. **구조적으로 100% 놓친다.**
--
-- 2026-09-08 01:11 UTC 실측:
--     last_fired_at    = 2026-09-07 09:00:00Z   ← 쐈다는 사실은 남음
--     last_status_code = null                    ← 됐는지는 아무도 모름
--     net._http_response 총 행수 = 1
--
-- Round 191b 는 07:19 에 주입하고 07:19 에 확인해서 200 을 봤다 — TTL 6시간 안이라
-- 우연히 보였을 뿐이다. **한 번의 성공 관측이 지속 가능한 판정 수단을 증명하지 않는다.**
-- 그 결과 Round 187/191b 의 "쐈다는 것만 알고 됐는지는 아무도 모른다" 가 그대로 재발했다.
--
-- 그리고 `null` 은 실패(401 등)와 구분되지 않는다 — 진짜 장애를 놓치거나 정상을 장애로 오판한다.
--
-- ## 어떻게
-- 응답을 **TTL 안에 수확해 우리 테이블로 옮긴다**. 조인하지 않는다.
--   1. `cron_endpoints` 영속 스냅샷 컬럼 — TTL 과 무관하게 마지막 결과가 남는다
--   2. `cron_endpoint_runs` 이력 — 발사마다 1행. 이게 있어야 "됐다/안 됐다" 를 넘어
--      **가동률**이 나온다 (Round 191 §2 "배치는 소요시간·성공 분포를 봐야 한다" 와 같은 결)
--   3. `harvest_cron_endpoint_responses()` — `*/15 * * * *`. 발사 때만 수확하면
--      발사 주기(7h) > TTL(6h) 이라 놓치므로 **독립 주기**여야 한다
--
-- ## 되돌리기
--   SELECT cron.unschedule('cron-endpoint-harvest');

ALTER TABLE public.cron_endpoints
  ADD COLUMN IF NOT EXISTS last_status_code int,
  ADD COLUMN IF NOT EXISTS last_response    text,
  ADD COLUMN IF NOT EXISTS last_error       text,
  ADD COLUMN IF NOT EXISTS last_checked_at  timestamptz;

CREATE TABLE IF NOT EXISTS public.cron_endpoint_runs (
  id          bigserial PRIMARY KEY,
  endpoint_id text        NOT NULL REFERENCES public.cron_endpoints(id) ON DELETE CASCADE,
  request_id  bigint,
  fired_at    timestamptz NOT NULL DEFAULT now(),
  status_code int,
  response    text,
  error_msg   text,
  checked_at  timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS cron_endpoint_runs_request_id_key
  ON public.cron_endpoint_runs (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cron_endpoint_runs_pending_idx
  ON public.cron_endpoint_runs (fired_at) WHERE checked_at IS NULL;
CREATE INDEX IF NOT EXISTS cron_endpoint_runs_endpoint_fired_idx
  ON public.cron_endpoint_runs (endpoint_id, fired_at DESC);

-- cron_endpoints 와 동일한 보호: RLS 켜고 정책 0개 → anon/authenticated 전면 차단.
ALTER TABLE public.cron_endpoint_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cron_endpoint_runs FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.cron_endpoint_runs_id_seq FROM anon, authenticated;

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

  IF v_enabled IS NOT TRUE OR v_url IS NULL OR length(v_url) = 0 THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_secret IS NOT NULL AND length(v_secret) > 0 THEN
    v_headers := v_headers || jsonb_build_object('x-cron-secret', v_secret);
  END IF;

  SELECT net.http_post(
    url     := v_url,
    headers := v_headers,
    body    := jsonb_build_object('source', 'pg_cron', 'endpoint', p_id, 'at', now())
  ) INTO v_req_id;

  UPDATE public.cron_endpoints
     SET last_fired_at = now(), last_request_id = v_req_id, updated_at = now()
   WHERE id = p_id;

  -- 발사를 먼저 남긴다. 응답이 영영 안 와도 "쐈다" 는 증거가 된다.
  -- ⚠ 부분 유니크 인덱스(WHERE request_id IS NOT NULL)라 ON CONFLICT 에 **같은 술어**를
  --   붙여야 매칭된다. 안 붙이면 42P10 "no unique or exclusion constraint matching".
  INSERT INTO public.cron_endpoint_runs (endpoint_id, request_id, fired_at)
  VALUES (p_id, v_req_id, now())
  ON CONFLICT (request_id) WHERE request_id IS NOT NULL DO NOTHING;

  -- 직전 발사분을 같이 수확 (다음 harvest 주기를 기다리지 않아도 되게).
  PERFORM public.harvest_cron_endpoint_responses();
END;
$function$;

CREATE OR REPLACE FUNCTION public.harvest_cron_endpoint_responses()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $function$
DECLARE
  v_harvested int := 0;
BEGIN
  -- 1) TTL(6h) 안에 살아 있는 응답을 이력 행에 확정 적재.
  WITH picked AS (
    SELECT r.id AS run_id, h.status_code, left(h.content, 1000) AS content, h.error_msg
    FROM public.cron_endpoint_runs r
    JOIN net._http_response h ON h.id = r.request_id
    WHERE r.checked_at IS NULL
  ), upd AS (
    UPDATE public.cron_endpoint_runs r
       SET status_code = p.status_code,
           response    = p.content,
           error_msg   = p.error_msg,
           checked_at  = now()
      FROM picked p
     WHERE r.id = p.run_id
    RETURNING 1
  )
  SELECT count(*) INTO v_harvested FROM upd;

  -- 2) TTL 을 넘겨 응답이 사라진 행은 영원히 pending 으로 두지 않고 확정 표기한다.
  --    안 하면 "판정 불가" 가 조용히 쌓여 가동률 계산이 거짓말을 한다. (2h 여유, ttl=6h)
  UPDATE public.cron_endpoint_runs
     SET error_msg  = coalesce(error_msg, 'response expired before harvest (pg_net.ttl)'),
         checked_at = now()
   WHERE checked_at IS NULL
     AND fired_at < now() - interval '8 hours';

  -- 3) 엔드포인트 행의 스냅샷을 최신 확정 이력으로 갱신. TTL 과 무관하게 남는다.
  UPDATE public.cron_endpoints e
     SET last_status_code = r.status_code,
         last_response    = r.response,
         last_error       = r.error_msg,
         last_checked_at  = r.checked_at
    FROM (
      SELECT DISTINCT ON (endpoint_id) endpoint_id, status_code, response, error_msg, checked_at
      FROM public.cron_endpoint_runs
      WHERE checked_at IS NOT NULL
      ORDER BY endpoint_id, fired_at DESC
    ) r
   WHERE e.id = r.endpoint_id
     AND (e.last_checked_at IS NULL OR e.last_checked_at < r.checked_at);

  -- 4) 보관 정리. 안 하면 조용히 자란다 — 특히 cron.job_run_details 는
  --    harvest 가 15분마다 도는 순간부터 하루 96행씩 늘어난다.
  DELETE FROM public.cron_endpoint_runs WHERE fired_at < now() - interval '90 days';
  BEGIN
    DELETE FROM cron.job_run_details WHERE end_time < now() - interval '30 days';
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- 권한이 없어도 수확 자체는 계속되어야 한다.
  END;

  RETURN v_harvested;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fire_cron_endpoint(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.harvest_cron_endpoint_responses() FROM PUBLIC, anon, authenticated;

-- 뷰 재작성 — 이제 net._http_response 를 조인하지 않는다.
--   harvest_pending : 쐈는데 아직 수확 전 (15분 이상 true 면 pg_net worker 를 의심)
--   runs_7d / ok_7d : 가동률. "지금 200" 만으로는 간헐 실패를 못 잡는다.
DROP VIEW IF EXISTS public.cron_endpoint_health;
CREATE VIEW public.cron_endpoint_health AS
SELECT e.id,
       e.enabled,
       (e.secret IS NOT NULL AND length(e.secret) > 0) AS secret_set,
       e.last_fired_at,
       e.last_status_code,
       left(e.last_response, 200) AS last_response,
       e.last_error,
       e.last_checked_at,
       (e.last_request_id IS NOT NULL
        AND (e.last_checked_at IS NULL OR e.last_checked_at < e.last_fired_at)) AS harvest_pending,
       (SELECT count(*) FROM public.cron_endpoint_runs r
         WHERE r.endpoint_id = e.id AND r.fired_at > now() - interval '7 days') AS runs_7d,
       (SELECT count(*) FROM public.cron_endpoint_runs r
         WHERE r.endpoint_id = e.id AND r.fired_at > now() - interval '7 days'
           AND r.status_code BETWEEN 200 AND 299) AS ok_7d
FROM public.cron_endpoints e;

REVOKE ALL ON public.cron_endpoint_health FROM anon, authenticated;

-- 수확 잡. 발사 주기(7h)가 TTL(6h)보다 길어서 **발사와 독립된 주기**여야 한다.
DO $$
BEGIN
  PERFORM cron.unschedule('cron-endpoint-harvest');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cron-endpoint-harvest',
  '*/15 * * * *',
  $CRON$ SELECT public.harvest_cron_endpoint_responses() $CRON$
);

-- ────────────────────────────────────────────────────────────────
-- 실측 (2026-09-08 01:16 UTC):
--   SELECT public.fire_cron_endpoint('publish-watchdog');  -- void → 빈 셀이 정상
--   SELECT public.harvest_cron_endpoint_responses();       -- 1
--   SELECT * FROM public.cron_endpoint_health;
--     last_status_code=200  harvest_pending=false  runs_7d=1  ok_7d=1
--     last_response={"ok":true,"alerted":true,"starving_count":1,
--                    "starving":[{"name":"포레나의원","days_since":11}], ...}
--
-- 🔴 그 200 응답 안에 **아무도 못 보고 있던 진짜 알람**이 들어 있었다.
--    뷰가 null 을 돌려주는 동안 감시자는 계속 이걸 감지하고 있었다.
--    판정 수단이 고장나면 감시자가 옳아도 소용이 없다.
--
-- 점검 한 줄:  SELECT * FROM public.cron_endpoint_health;
--   last_status_code 200 + harvest_pending false + ok_7d/runs_7d 비율을 같이 본다.
