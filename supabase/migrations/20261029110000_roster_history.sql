-- Roster history: every time a squad's registration is saved, the roster, tier and manager it
-- had before are kept here, so a team page can show who joined and left, and when.

create table public.roster_history (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  tier integer,
  manager text,
  -- The roster as it was: [{ person_id, name, role, captain }], in order.
  players jsonb not null check (jsonb_typeof(players) = 'array'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index roster_history_entry on public.roster_history (entry_id, created_at desc);
create index roster_history_event on public.roster_history (event_id);
create index roster_history_created_by on public.roster_history (created_by);

alter table public.roster_history enable row level security;
create policy "Admins manage roster history" on public.roster_history for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
