-- Separate imported snapshots from manual standings and kill sheets.
create table public.event_index_results (
  event_id uuid primary key references public.events(id) on delete cascade,
  tournament_id text not null check (tournament_id ~ '^[A-Za-z0-9_-]{1,200}$'),
  enabled boolean not null default true,
  snapshot jsonb,
  synced_at timestamptz,
  attempt_at timestamptz
);

alter table public.event_index_results enable row level security;
revoke all on public.event_index_results from anon, authenticated;
grant select on public.event_index_results to authenticated;
grant all on public.event_index_results to service_role;
create policy "Admins read Index links" on public.event_index_results
  for select to authenticated using ((select public.is_admin()));

-- Only one worker refreshes an event per minute. Updates and failures keep the saved table.
create function public.claim_event_index_refresh(target uuid, source text)
returns table (attempt_at timestamptz)
language sql security invoker set search_path = ''
as $$
  update public.event_index_results as link
  set attempt_at = clock_timestamp()
  from public.events as event
  where link.event_id = target and event.id = target
    and link.tournament_id = source and link.enabled and event.status = 'live'
    and (link.snapshot ->> 'completed') is distinct from 'true'
    and (link.attempt_at is null or link.attempt_at < now() - interval '1 minute')
  returning link.attempt_at;
$$;
revoke all on function public.claim_event_index_refresh(uuid,text) from public, anon, authenticated;
grant execute on function public.claim_event_index_refresh(uuid,text) to service_role;
