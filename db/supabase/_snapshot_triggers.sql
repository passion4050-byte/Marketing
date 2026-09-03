-- =====================================================================
-- Supabase public 스키마 트리거/함수 정본 스냅샷
-- 프로젝트: blogkey (gifopyowyankfsfghhdi) · 추출 2026-09-02 (Round 187)
--
-- 왜 이 파일이 필요한가 (Round 186 의 교훈):
--   DB 트리거는 애플리케이션 리포에 **어떤 흔적도 남기지 않는다.**
--   Round 186 에서 "발행마다 Vercel 배포가 도는" 원인이 트리거였는데
--   리포 전체 grep 이 0건이라 코드 리뷰만으로는 존재조차 알 수 없었다.
--   랩업 때 "나머지 2개"로 봤지만 실제로 세어 보니 **트리거 9개**였다.
--
-- ⚠ 이 파일은 스냅샷이다. DB 를 덮어쓰는 용도가 아니라 "무엇이 자동으로 돌고
--   있는지"를 코드 리뷰에서 볼 수 있게 하는 것이 목적이다. 함수를 실제로 바꿀 땐
--   별도 마이그레이션(round1XX_*.sql)을 만들고 이 스냅샷도 같이 갱신할 것.
--
-- fire_vercel_deploy_hook 은 여기 없다 → round186_debounce_vercel_deploy_hook.sql
--
-- ---------------------------------------------------------------------
-- 🔴 이 중 "조용히 동작을 바꾸는" 것들 — 디버깅 때 먼저 의심할 것
--
-- 1. sync_business_model_keywords  (tenants.business_model 변경 시)
--    business_model 의 쉼표 목록을 파싱해 **키워드를 자동 생성한다**
--    (purpose='competitor_landscape', is_active=true). 목록에서 빠진 기존
--    competitor_landscape 키워드는 soft delete(is_active=false).
--    → 어드민에서 병원 진료과목만 고쳐도 keywords 테이블이 통째로 바뀐다.
--    → Round 182c 사고('라식' purpose=competitor_landscape 가 발행된 건)의
--      키워드 출처가 바로 이것이다.
--    → Round 183 수요 드레인이 COALESCE(k.purpose,'own')='own' 게이트를 두는
--      이유도 이것 — 여기서 만들어진 키워드는 발행 대상이 아니다.
--
-- 2. autofill_title_slug_on_insert  (generated_contents INSERT/UPDATE)
--    slug 가 비면 keyword_text || '-' || id, 공백만 '-' 로 치환.
--    **한글을 로마자화하지 않는다** → `통증재활-후기-473` 같은 한글 슬러그가
--    여기서 나온다 (Round 180e 비ASCII 슬러그 soft-404 계열 이슈의 출처).
--    title 이 비면 본문 첫 <h1> → keyword_text#id → untitled-id 순으로 채움.
--
-- 3. ensure_keyword_target_brand / sync_keywords_target_brand
--    target_brand 를 tenant.name 또는 partner_slug 로 자동 덮어쓴다.
--    partner_slug 를 바꾸면 **그 tenant 의 모든 키워드 target_brand 가 일괄 변경**.
--
-- 4. auto_create_content_settings  (tenants INSERT)
--    신규 tenant 마다 auto_content_settings 행을 enabled=false 로 자동 생성.
--    → 새 병원이 "발행이 안 된다"면 버그가 아니라 이 기본값이다.
--
-- 나머지(touch_updated_at · blogs_set_updated_at · medimap_inquiries_set_updated_at)
-- 는 updated_at 갱신만 하는 무해한 것들.
-- =====================================================================


-- ── generated_contents ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.autofill_title_slug_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog, public'
AS $function$
BEGIN
  IF NEW.title IS NULL OR length(trim(NEW.title)) = 0 THEN
    NEW.title := COALESCE(
      substring(NEW.body FROM '<h1[^>]*>([^<]+)</h1>'),
      NEW.keyword_text || ' #' || NEW.id::text,
      'untitled-' || NEW.id::text
    );
  END IF;
  IF NEW.channel = 'blog_html' AND (NEW.slug IS NULL OR length(trim(NEW.slug)) = 0) THEN
    NEW.slug := regexp_replace(NEW.keyword_text || '-' || NEW.id::text, '\s+', '-', 'g');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_autofill_title_slug
  BEFORE INSERT OR UPDATE ON public.generated_contents
  FOR EACH ROW EXECUTE FUNCTION autofill_title_slug_on_insert();


CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog, public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_touch_generated_contents
  BEFORE UPDATE ON public.generated_contents
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- trg_fire_vercel_on_publish → round186_debounce_vercel_deploy_hook.sql


-- ── keywords ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ensure_keyword_target_brand()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- INSERT 또는 UPDATE 시 target_brand 비어있으면 tenant.name 으로 자동 채움
  IF (NEW.target_brand IS NULL OR NEW.target_brand = '') THEN
    SELECT name INTO NEW.target_brand FROM tenants WHERE id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_keyword_target_brand_sync
  BEFORE INSERT OR UPDATE ON public.keywords
  FOR EACH ROW EXECUTE FUNCTION ensure_keyword_target_brand();


-- ── tenants ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_create_content_settings()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO auto_content_settings (tenant_id, enabled, daily_count, auto_publish, updated_at)
  VALUES (NEW.id, false, 1, false, NOW())
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_create_content_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION auto_create_content_settings();


-- 🔴 키워드를 자동 생성하는 트리거 — 위 주석 1번 참조
CREATE OR REPLACE FUNCTION public.sync_business_model_keywords()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  kw TEXT;
  blocked TEXT[] := ARRAY['partner', 'self', '미지정'];
  new_bm TEXT;
  new_keywords TEXT[];
BEGIN
  new_bm := COALESCE(NEW.business_model, '');

  -- UPDATE 시 business_model 안 바뀌면 skip
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.business_model, '') = new_bm THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 새 키워드 목록 미리 준비 (trim + blocked 제외 + 길이 검증)
  new_keywords := ARRAY[]::TEXT[];
  IF new_bm <> '' AND NOT (new_bm = ANY(blocked)) THEN
    FOREACH kw IN ARRAY string_to_array(new_bm, ',')
    LOOP
      kw := TRIM(kw);
      IF kw <> '' AND NOT (kw = ANY(blocked)) AND LENGTH(kw) >= 2 THEN
        new_keywords := array_append(new_keywords, kw);
      END IF;
    END LOOP;
  END IF;

  -- 기존 competitor_landscape 키워드 → soft delete (is_active=false)
  -- 단, 새 목록에 다시 등장하는 키워드는 그대로 두고 아래 INSERT...ON CONFLICT 가 재활성화
  UPDATE keywords
  SET is_active = false
  WHERE tenant_id = NEW.id
    AND purpose = 'competitor_landscape'
    AND text <> ALL(new_keywords);

  -- 새 키워드 INSERT or 재활성화
  FOREACH kw IN ARRAY new_keywords
  LOOP
    INSERT INTO keywords (tenant_id, text, category, target_brand, is_active, purpose)
    VALUES (
      NEW.id,
      kw,
      COALESCE(NEW.domain_category, '기타'),
      COALESCE(NEW.partner_slug, ''),
      true,
      'competitor_landscape'
    )
    ON CONFLICT (tenant_id, text, purpose)
    DO UPDATE SET is_active = true;
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_business_model_keywords
  AFTER INSERT OR UPDATE OF business_model ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION sync_business_model_keywords();


CREATE OR REPLACE FUNCTION public.sync_keywords_target_brand()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.partner_slug IS DISTINCT FROM OLD.partner_slug THEN
    UPDATE keywords
    SET target_brand = NEW.partner_slug
    WHERE tenant_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sync_target_brand
  AFTER UPDATE OF partner_slug ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION sync_keywords_target_brand();


-- ── updated_at 갱신 전용 (무해) ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.blogs_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog, public'
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END
$function$;

CREATE TRIGGER trg_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION blogs_set_updated_at();


CREATE OR REPLACE FUNCTION public.medimap_inquiries_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog, public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_medimap_inquiries_updated
  BEFORE UPDATE ON public.medimap_inquiries
  FOR EACH ROW EXECUTE FUNCTION medimap_inquiries_set_updated_at();


-- =====================================================================
-- pg_cron 잡 (Round 191, 2026-09-03 추출)
--
-- 🔴 트리거와 **정확히 같은 이유로** 여기 적는다: cron 잡도 리포 grep 에 0건이다.
--    "무엇이 자동으로 돌고 있는지" 를 코드 리뷰에서 보려면 트리거만으로는 부족하다.
--
--   확인 한 줄:  SELECT jobid, jobname, schedule, command, active FROM cron.job;
--
--  jobid | jobname          | schedule    | command
--  ------+------------------+-------------+-------------------------------------------------
--    1   | publish-watchdog | 0 2,9 * * * | SELECT public.fire_cron_endpoint('publish-watchdog')
--
--  · 정본: round191_cron_endpoints.sql
--  · 호출 대상 URL·시크릿은 명령문이 아니라 public.cron_endpoints 행에 있다
--  · 상태 점검:  SELECT * FROM public.cron_endpoint_health;
--                (last_status_code 200 = 정상, 401 = 시크릿 미주입/불일치)
-- =====================================================================
