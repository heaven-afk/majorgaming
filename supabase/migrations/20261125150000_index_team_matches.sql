-- Heaven Index team id -> MGL team id, as confirmed by an admin when linking. A null value means
-- "checked, no MGL team". Additive only: existing links keep their snapshots and settings.
alter table public.event_index_results
  add column if not exists team_matches jsonb not null default '{}'::jsonb
  check (jsonb_typeof(team_matches) = 'object');

notify pgrst, 'reload schema';
