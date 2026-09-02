-- Round 186 (2026-09-02) — 발행 row 마다 전체 재빌드를 쏘던 트리거에 디바운스.
--
-- ⚠ 이 함수/트리거는 Supabase 쪽에만 있었고 리포에 기록이 없었다(전수 grep 결과 0건).
--   그래서 "왜 배포가 이렇게 자주 도는가"를 코드만 봐서는 알 수 없었다.
--   앞으로 Supabase 함수·트리거를 바꾸면 반드시 이 폴더에 정본을 남길 것.
--
-- 문제: trg_fire_vercel_on_publish 는 FOR EACH ROW 이므로 발행 1편 = Vercel 배포 1회.
--   실측(2026-09-02 Vercel list_deployments): 13.2시간 동안 배포 20건.
--   커밋 하나에 9건이 몰린 구간도 있었다. Hobby 빌드 동시성은 1이라 긴급 수정이
--   큐에 밀린다 — Round 185 수정이 실제로 7분 넘게 QUEUED 로 대기했고,
--   그 사이 구 배포를 측정해 "안 고쳐졌다"고 오판했다.
--
-- 이 재빌드는 애초에 불필요하다. 공개 라우트가 전부 ISR 이다:
--   홈·/blog·/blog/[slug]·/with-partners = revalidate 60 (dynamicParams=true)
--   sitemap·rss·/all                     = revalidate 3600
--   → 새 글은 배포 없이도 60초 안에 노출된다. 이 트리거는 ISR 전환(Round 129) 이전의 유물.
--
-- 게다가 배포는 ISR 캐시를 통째로 무효화한다 = 전 페이지가 다시 콜드가 된다.
--   20분마다 재빌드하면 사이트가 영영 warm 해지지 않는다 —
--   Round 184~185 의 콜드 렌더 문제를 이 트리거가 증폭시키고 있었다.
--
-- 조치: 제거가 아니라 디바운스(30분). 되돌리기 쉽고 sitemap/rss 신선도용 재빌드
--   경로는 남긴다. 한동안 문제가 없으면 트리거 자체를 걷어내는 것이 다음 단계.
--
-- 🔴 published_at 자동 채움은 디바운스보다 **먼저** 일어나야 한다.
--    순서를 바꾸면 디바운스 창 안에 발행된 글의 published_at 이 NULL 로 남는다.
--
-- 검증(2026-09-02, BEGIN…ROLLBACK 트랜잭션 실측):
--   baseline net.http_request_queue        = 0
--   디바운스 창 안에서 published 행 INSERT  = 0  (배포 안 나감)
--   디바운스 만료 후 published 행 INSERT    = 1  (배포 나감)
--   디바운스 창 안에서도 published_at 채워짐 = 1
--   롤백 후 generated_contents 538행 그대로 · 테스트 행 0 · last_fired_at 원복
CREATE OR REPLACE FUNCTION public.fire_vercel_deploy_hook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  hook_url text;
  hook_enabled boolean;
  hook_last_fired timestamptz;
  debounce interval := interval '30 minutes';
BEGIN
  IF NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  -- 디바운스보다 먼저. 이 값은 배포 여부와 무관하게 항상 채워져야 한다.
  IF NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  SELECT url, enabled, last_fired_at
    INTO hook_url, hook_enabled, hook_last_fired
  FROM public.deploy_hooks WHERE id = 1;

  IF hook_enabled IS NOT TRUE OR hook_url IS NULL OR length(hook_url) = 0 THEN
    RETURN NEW;
  END IF;

  -- Round 186 — 디바운스. 배치 발행(1회 5~6편)이 배포 1건으로 접힌다.
  IF hook_last_fired IS NOT NULL AND now() - hook_last_fired < debounce THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := hook_url,
    body := jsonb_build_object(
      'reason', 'content_published',
      'content_id', NEW.id,
      'slug', NEW.slug,
      'keyword', NEW.keyword_text,
      'channel', NEW.channel,
      'at', NEW.published_at
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  UPDATE public.deploy_hooks SET last_fired_at = now() WHERE id = 1;

  RETURN NEW;
END;
$function$;
