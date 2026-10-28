-- Undo for results uploads: before an upload replaces a standings table or a tier's kill rows,
-- the rows it replaces are kept here, so the admin can put them back.

create table public.results_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- The standings table replaced, or null for kill rows.
  table_id uuid references public.event_tables (id) on delete cascade,
  kind text not null check (kind in ('standings', 'kills')),
  -- Kill rows: the tier the upload replaced (null for the whole event).
  tier integer,
  -- The rows as they were before the upload, in the standings / kill_rows column names.
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  -- What the upload wrote, for the history list.
  summary text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index results_history_event on public.results_history (event_id, kind, created_at desc);
create index results_history_table on public.results_history (table_id);
create index results_history_created_by on public.results_history (created_by);

alter table public.results_history enable row level security;
create policy "Admins manage results history" on public.results_history for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
