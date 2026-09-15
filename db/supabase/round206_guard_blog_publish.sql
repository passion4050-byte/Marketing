-- Round 206 (2026-09-15) — generated_contents 최후 방어선 2종.
--
-- ① 의료법 린터를 안 거친 blog_html 은 저장도 발행도 못 한다.
--    실측: 2026-08-15 이후 compliance_report 가 비어 있는 발행 글 34편이 **전부 BGN 잠실(tenant 4)**.
--    08-17 부터 3~4일마다 밤에 5편씩 들어왔고 llm_call_logs 는 0건 — 파이썬 파이프라인 밖에서
--    SQL 로 직접 넣은 글이다(09-14 13:25Z 삽입 직전 postgres 로그에 시행착오 SQL 에러, REST 기록 없음).
--    파이프라인은 insert 시점에 항상 compliance_report 를 채운다(src/content/generator.py GeneratedContent(...)).
--    CLAUDE.md "Compliance 강제 — 우회 경로 만들지 말 것" 을 DB 에서 강제한다. 코드 밖 경로는 코드로 못 막는다.
--
-- ② 같은 병원·같은 언어·같은 키워드의 blog_html 은 1편만 published.
--    실측: 발행 667편 중 387편이 같은 키워드의 추가 글, 제목까지 같은 묶음 24개(최대 4편).
--    스케줄러가 생성 전에 거르고(src/collector/scheduler.py R206), 이 트리거는 그걸 우회한 경로
--    (어드민 승인·수동 SQL·A/B 두 번째 arm)를 막는다.
--    ⚠ 기존 중복 글은 건드리지 않는다 — 이미 published 인 행의 다른 컬럼 UPDATE 는 통과.
--
-- 이름을 trg_00_ 으로 시작하는 이유: 같은 이벤트의 트리거는 이름순으로 실행된다.
--   trg_fire_vercel_on_publish 보다 먼저 돌아야 거절된 글이 배포 훅을 쏘지 않는다.

CREATE OR REPLACE FUNCTION public.guard_blog_publish()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  _becomes_published boolean;
  _dup_id integer;
BEGIN
  IF NEW.channel IS DISTINCT FROM 'blog_html' THEN
    RETURN NEW;
  END IF;

  -- ① 린터 우회 차단 — 새로 들어오는 행, 또는 발행으로 바뀌는 순간
  _becomes_published := NEW.status = 'published'
    AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published');

  IF NEW.compliance_report IS NULL AND (TG_OP = 'INSERT' OR _becomes_published) THEN
    RAISE EXCEPTION 'R206 guard: compliance_report 없는 blog_html 은 저장·발행할 수 없습니다 (의료법 린터 우회 차단). tenant_id=%, keyword=%',
      NEW.tenant_id, NEW.keyword_text
      USING ERRCODE = 'check_violation';
  END IF;

  -- ② 키워드 중복 발행 차단
  IF _becomes_published AND NEW.keyword_text IS NOT NULL THEN
    -- 동시 발행 두 건이 서로를 못 보고 둘 다 통과하는 경합 방지
    PERFORM pg_advisory_xact_lock(
      hashtext('guard_blog_publish:' || NEW.tenant_id || ':' || COALESCE(NEW.lang, 'ko') || ':' || NEW.keyword_text)
    );
    SELECT g.id INTO _dup_id
      FROM public.generated_contents g
     WHERE g.tenant_id = NEW.tenant_id
       AND g.channel = 'blog_html'
       AND g.status = 'published'
       AND COALESCE(g.lang, 'ko') = COALESCE(NEW.lang, 'ko')
       AND g.keyword_text = NEW.keyword_text
       AND g.id IS DISTINCT FROM NEW.id
     LIMIT 1;
    IF _dup_id IS NOT NULL THEN
      RAISE EXCEPTION 'R206 guard: 같은 키워드의 발행 글이 이미 있습니다 (content_id=%). tenant_id=%, lang=%, keyword=%',
        _dup_id, NEW.tenant_id, COALESCE(NEW.lang, 'ko'), NEW.keyword_text
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_guard_blog_publish ON public.generated_contents;
CREATE TRIGGER trg_00_guard_blog_publish
  BEFORE INSERT OR UPDATE OF status, keyword_text, lang, channel ON public.generated_contents
  FOR EACH ROW EXECUTE FUNCTION public.guard_blog_publish();

-- 검증(적용 직후 실행, 전부 서브트랜잭션 롤백이라 데이터 무변경):
--   db/supabase/round206_guard_blog_publish_verify.sql
