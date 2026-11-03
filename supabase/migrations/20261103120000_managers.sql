-- Fantasy managers: one row per MGL account that plays MGL Fantasy. The login itself is Supabase
-- Auth (email and password, stored only there); this row holds the display name every fantasy
-- screen and leaderboard shows. Fantasy Core knows a manager only by their user id and this name.
-- Managers are not admins: admin rights still come only from `public.admins`.

create table public.managers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Fantasy Core's rule: 3 to 20 letters, numbers, spaces, underscores or hyphens, trimmed.
  display_name text not null check (display_name ~ '^[A-Za-z0-9 _-]{3,20}$' and display_name = btrim(display_name)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique however it's capitalised, as Fantasy Core checks it.
create unique index managers_display_name_key on public.managers (lower(display_name));

create trigger managers_touch before update on public.managers for each row execute function public.touch_updated_at();

alter table public.managers enable row level security;
create policy "Managers read their own row" on public.managers for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Managers create their own row" on public.managers for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Managers rename themselves" on public.managers for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sign-up asks whether a name is free before the account exists, without exposing the list.
create function public.display_name_taken(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.managers where lower(display_name) = lower(btrim(name)));
$$;

revoke execute on function public.display_name_taken(text) from public;
grant execute on function public.display_name_taken(text) to anon, authenticated;
