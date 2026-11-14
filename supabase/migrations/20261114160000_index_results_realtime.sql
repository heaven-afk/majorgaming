-- Only a public event slug and a revision are exposed to Realtime subscribers.
create table public.event_results_revisions (
  slug text primary key references public.events(slug) on update cascade on delete cascade,
  revision uuid not null
);
alter table public.event_results_revisions enable row level security;
revoke all on public.event_results_revisions from anon, authenticated;
grant select on public.event_results_revisions to anon, authenticated;
create policy "Visitors read public results revisions"
  on public.event_results_revisions for select to anon, authenticated using (true);
alter publication supabase_realtime add table public.event_results_revisions;

create function public.publish_index_results_revision()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.snapshot is not distinct from old.snapshot
     and new.enabled is not distinct from old.enabled
     and new.tournament_id is not distinct from old.tournament_id then
    return null;
  end if;
  insert into public.event_results_revisions (slug, revision)
    select slug, gen_random_uuid() from public.events where id = coalesce(new.event_id, old.event_id)
      and status = 'live'
  on conflict (slug) do update set revision = excluded.revision;
  return null;
end;
$$;
revoke execute on function public.publish_index_results_revision() from public, anon, authenticated;
create trigger publish_index_results_revision after insert or update or delete on public.event_index_results
for each row execute function public.publish_index_results_revision();

create table public.index_results_notifications (
  id uuid primary key,
  received_at timestamptz not null default now()
);
alter table public.index_results_notifications enable row level security;
revoke all on public.index_results_notifications from anon, authenticated;
grant insert, select, delete on public.index_results_notifications to service_role;
create index index_results_notifications_received on public.index_results_notifications(received_at);
