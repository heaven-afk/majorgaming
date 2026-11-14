alter table public.event_index_results
  add column id uuid not null default gen_random_uuid(),
  add column table_id uuid;

alter table public.event_index_results
  drop constraint event_index_results_pkey,
  add primary key (id),
  add constraint event_index_results_event_table_key unique (event_id, table_id),
  add constraint event_index_results_table_scope
    foreign key (table_id, event_id) references public.event_tables (id, event_id) on delete cascade;

create unique index event_index_results_legacy_event
  on public.event_index_results (event_id) where table_id is null;

-- A previous link can be assigned automatically when there is exactly one table.
update public.event_index_results as link
set table_id = candidate.id
from public.event_tables as candidate
where candidate.event_id = link.event_id
  and (select count(*) from public.event_tables where event_id = link.event_id) = 1;

create function public.claim_index_table_refresh(target_link uuid, source text)
returns table (attempt_at timestamptz)
language sql security invoker set search_path = ''
as $$
  update public.event_index_results as link
  set attempt_at = clock_timestamp()
  from public.events as event
  where link.id = target_link and event.id = link.event_id
    and link.tournament_id = source and link.enabled and event.status = 'live'
    and (link.snapshot ->> 'completed') is distinct from 'true'
    and (link.attempt_at is null or link.attempt_at < now() - interval '1 minute')
  returning link.attempt_at;
$$;
revoke all on function public.claim_index_table_refresh(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_index_table_refresh(uuid,text) to service_role;
