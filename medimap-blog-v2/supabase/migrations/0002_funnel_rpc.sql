-- =============================================================
-- 0002 — Funnel RPC + 집계 뷰
-- =============================================================

-- 클릭 카운터 증가 (race-safe)
create or replace function increment_click(p_slug text) returns void as $$
begin
  update short_links set click_count = click_count + 1 where slug = p_slug;
end;
$$ language plpgsql security definer;

-- 문의 attribution → publications.inquiries_attributed 증가
create or replace function increment_inquiry_attribution(p_short_link_id uuid) returns void as $$
begin
  update publications p
  set inquiries_attributed = inquiries_attributed + 1
  from short_links sl
  where sl.id = p_short_link_id
    and sl.publication_id = p.id;
end;
$$ language plpgsql security definer;

-- Funnel 일일 집계 뷰 — 어드민 화면용
create or replace view v_funnel_daily as
select
  tenant_id,
  date_trunc('day', occurred_at at time zone 'Asia/Seoul')::date as day_kst,
  count(*) filter (where kind = 'impression') as impressions,
  count(*) filter (where kind = 'click') as clicks,
  count(*) filter (where kind = 'inquiry_submit') as inquiries,
  count(*) filter (where kind = 'inquiry_qualified') as qualified,
  count(*) filter (where kind = 'inquiry_won') as won
from funnel_events
group by 1, 2;

-- Publication별 ROI 뷰
create or replace view v_publication_roi as
select
  p.id as publication_id,
  p.tenant_id,
  p.channel,
  p.url,
  p.title,
  p.published_at,
  p.pageviews_7d,
  p.inquiries_attributed,
  coalesce(sum(sl.click_count), 0) as total_clicks,
  case when coalesce(sum(sl.click_count), 0) = 0 then 0
       else round((p.inquiries_attributed::numeric / sum(sl.click_count)) * 100, 2)
  end as click_to_inquiry_pct
from publications p
left join short_links sl on sl.publication_id = p.id
group by p.id;
