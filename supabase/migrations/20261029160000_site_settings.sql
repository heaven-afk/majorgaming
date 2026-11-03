-- Site settings edited in the admin's Settings page: the Discord invite, social links and the
-- few numbers Home shows about the community. One row; anything left out of `data` falls back to
-- the defaults in `src/content/settings.ts`.

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index site_settings_updated_by on public.site_settings (updated_by);

create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;
create policy "Anyone can read" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins can insert" on public.site_settings for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update" on public.site_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.site_settings (id) values (1) on conflict do nothing;
