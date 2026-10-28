-- MGL league schema. Design and reasoning: docs/DATA-MODEL.md.
--
-- Everything connects through entries: a team's registration for one event, with the tier it
-- was placed in, its manager and its roster. Standings rows and kill rows point at an entry,
-- so every team on a table was registered for that event, and each event keeps the name and
-- roster the team had at the time.
--
-- The public site only reads (row level security allows select to everyone). Writes come from
-- the admin dashboard: signed-in users listed in the admins table.

-- Types ---------------------------------------------------------------------------------------

create type public.event_status as enum ('upcoming', 'live', 'final');
create type public.event_kind as enum ('season', 'other');
create type public.event_format as enum ('tiers', 'single');
create type public.registration_state as enum ('closed', 'soon', 'open', 'full');
create type public.admin_role as enum ('owner', 'editor');

-- Helpers -------------------------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Admins --------------------------------------------------------------------------------------

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'editor',
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

-- Teams and people ------------------------------------------------------------------------------

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  tag text,
  clan text,
  logo_url text,
  -- Archived teams leave the Teams page and pickers; their past results stay.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Professional name, shown everywhere.
  name text not null,
  -- In-game name, when it differs.
  ign text,
  country text check (country ~ '^[A-Z]{2}$'),
  photo_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Other spellings of a team or player, so imports and pasted registrations find the right one.
create table public.aliases (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team', 'person')),
  target_id uuid not null,
  alias text not null,
  created_at timestamptz not null default now()
);
create unique index aliases_kind_alias on public.aliases (kind, lower(alias));

-- Events --------------------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  -- e.g. "MGL Season", "Mixed Event", "Carry1st".
  series text not null,
  -- 'season' events drive the active team list, the tiers and the Teams page.
  kind public.event_kind not null default 'other',
  number integer,
  status public.event_status not null default 'upcoming',
  format public.event_format not null default 'tiers',
  -- Order in lists when dates are missing: lower comes first (newest first).
  sort_order integer not null default 0,
  start_date date,
  end_date date,
  -- Registration, set per event in the admin.
  registration_state public.registration_state not null default 'closed',
  registration_opens date,
  registration_closes date,
  registration_url text,
  registration_note text,
  registration_tiers integer[],
  -- The event page: poster, a line for cards, the write-up and other facts.
  poster_url text,
  poster_alt text,
  poster_width integer,
  poster_height integer,
  summary text,
  description text[] not null default '{}',
  -- [{ "label": "Prize pool", "value": "$1,000" }, ...]
  details jsonb not null default '[]' check (jsonb_typeof(details) = 'array'),
  matches_played integer check (matches_played >= 0),
  matches_total integer check (matches_total >= 0),
  -- Players per kill table (the site's default is 20).
  kill_table_size integer check (kill_table_size > 0),
  -- Ranked seasons: how many squads per tier move up and down when results are final.
  promote integer check (promote >= 0),
  relegate integer check (relegate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (registration_closes is null or registration_opens is null or registration_closes >= registration_opens)
);

-- One standings table: one per tier, or a single "Overall".
create table public.event_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  tier integer check (tier > 0),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name),
  unique (id, event_id)
);

-- Registrations ---------------------------------------------------------------------------------

-- A team's registration for one event. Keeps the name and tag the team used at the time.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete restrict,
  tier integer check (tier > 0),
  manager_id uuid references public.people (id) on delete set null,
  team_name text not null,
  team_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_id),
  unique (id, event_id)
);

-- One player on a registration's roster. A roster is one list of any size.
create table public.entry_players (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  event_id uuid not null,
  person_id uuid not null references public.people (id) on delete restrict,
  sort integer not null default 0,
  role text check (role in ('IGL', 'Fragger', 'Support', 'Anchor')),
  captain boolean not null default false,
  ign_at_event text,
  created_at timestamptz not null default now(),
  foreign key (entry_id, event_id) references public.entries (id, event_id) on delete cascade,
  -- A person plays for one squad per event.
  unique (event_id, person_id)
);
create unique index entry_players_one_captain on public.entry_players (entry_id) where captain;

-- Results -------------------------------------------------------------------------------------

-- One row of a standings table, as the daily collation sheet gives it.
create table public.standings (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null,
  event_id uuid not null,
  entry_id uuid not null,
  placement integer not null default 0,
  kills integer not null default 0,
  -- Points added or taken off (negative), as the sheet says.
  bonus integer not null default 0,
  wins integer check (wins >= 0),
  matches integer check (matches >= 0),
  -- While live: places gained (+) or lost (-) since the last match day.
  move integer,
  -- The sheet's order, which breaks ties on points.
  sort integer not null default 0,
  updated_at timestamptz not null default now(),
  foreign key (table_id, event_id) references public.event_tables (id, event_id) on delete cascade,
  foreign key (entry_id, event_id) references public.entries (id, event_id) on delete cascade,
  unique (table_id, entry_id)
);

-- One player's kills across one event, with the squad they played for.
create table public.kill_rows (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  entry_id uuid not null,
  person_id uuid not null references public.people (id) on delete restrict,
  kills integer not null check (kills >= 0),
  matches integer check (matches >= 0),
  -- Events with separate kill tables, like the Mixed Event's "Men" and "Women".
  grp text,
  updated_at timestamptz not null default now(),
  foreign key (entry_id, event_id) references public.entries (id, event_id) on delete cascade,
  unique (event_id, person_id)
);

-- Site content --------------------------------------------------------------------------------

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  category text not null check (category in ('Announcement', 'Season recap', 'Feature', 'Update')),
  published_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  author_name text,
  author_role text,
  excerpt text,
  cover_url text,
  cover_alt text,
  cover_width integer,
  cover_height integer,
  -- Blocks: [{ "type": "p", "text": "..." }, { "type": "h", ... }, ...]
  body jsonb not null default '[]' check (jsonb_typeof(body) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  role text not null,
  grp text not null check (grp in ('Leadership', 'Operations', 'Media', 'Community')),
  country text check (country ~ '^[A-Z]{2}$'),
  photo_url text,
  -- { "x": "...", "instagram": "...", "discord": "..." }
  socials jsonb not null default '{}' check (jsonb_typeof(socials) = 'object'),
  sort integer not null default 0,
  -- The founder's featured profile: { "quote": "...", "bio": ["..."], "since": 2021 }
  spotlight jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Every uploaded image (Cloudinary), so the admin can pick one again instead of re-uploading.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  public_id text unique,
  kind text not null default 'other' check (kind in ('team', 'person', 'staff', 'story', 'event', 'avatar', 'other')),
  alt text,
  width integer,
  height integer,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Indexes for the foreign keys the pages and admin follow -------------------------------------

create index event_tables_event on public.event_tables (event_id);
create index entries_team on public.entries (team_id);
create index entries_manager on public.entries (manager_id);
create index entry_players_entry on public.entry_players (entry_id);
create index entry_players_person on public.entry_players (person_id);
create index standings_event on public.standings (event_id);
create index standings_entry on public.standings (entry_id, event_id);
create index kill_rows_entry on public.kill_rows (entry_id, event_id);
create index kill_rows_person on public.kill_rows (person_id);
create index media_created_by on public.media (created_by);

-- updated_at ----------------------------------------------------------------------------------

create trigger teams_touch before update on public.teams for each row execute function public.touch_updated_at();
create trigger people_touch before update on public.people for each row execute function public.touch_updated_at();
create trigger events_touch before update on public.events for each row execute function public.touch_updated_at();
create trigger entries_touch before update on public.entries for each row execute function public.touch_updated_at();
create trigger standings_touch before update on public.standings for each row execute function public.touch_updated_at();
create trigger kill_rows_touch before update on public.kill_rows for each row execute function public.touch_updated_at();
create trigger stories_touch before update on public.stories for each row execute function public.touch_updated_at();
create trigger staff_touch before update on public.staff for each row execute function public.touch_updated_at();

-- Row level security: everyone reads, admins write --------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['teams', 'people', 'events', 'event_tables', 'entries', 'entry_players', 'standings', 'kill_rows', 'staff', 'media'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Anyone can read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "Admins can insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format('create policy "Admins can update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format('create policy "Admins can delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

alter table public.stories enable row level security;
create policy "Anyone can read published stories" on public.stories for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
create policy "Admins can insert" on public.stories for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update" on public.stories for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete" on public.stories for delete to authenticated using ((select public.is_admin()));

alter table public.aliases enable row level security;
create policy "Admins manage aliases" on public.aliases for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.admins enable row level security;
create policy "Admins can see admins" on public.admins for select to authenticated using ((select public.is_admin()));

-- The site's read: everything the public pages show, in one call -------------------------------

create function public.league_snapshot() returns json
language sql stable security invoker set search_path = '' as $$
  select json_build_object(
    'teams', (
      select coalesce(json_agg(json_build_object('slug', t.slug, 'name', t.name, 'tag', t.tag, 'clan', t.clan, 'logo', t.logo_url) order by t.slug), '[]')
      from public.teams t
    ),
    'people', (
      select coalesce(json_agg(json_build_object('slug', p.slug, 'name', p.name, 'ign', p.ign, 'country', p.country, 'photo', p.photo_url) order by p.slug), '[]')
      from public.people p
    ),
    'events', (
      select coalesce(json_agg(json_build_object(
        'slug', e.slug, 'name', e.name, 'series', e.series, 'kind', e.kind, 'number', e.number, 'status', e.status,
        'startDate', e.start_date, 'endDate', e.end_date,
        'registration', e.registration_state, 'registrationOpens', e.registration_opens, 'registrationCloses', e.registration_closes,
        'poster', case when e.poster_url is null then null else json_build_object('src', e.poster_url, 'alt', coalesce(e.poster_alt, ''), 'width', e.poster_width, 'height', e.poster_height) end,
        'summary', e.summary, 'description', e.description, 'details', e.details,
        'matchesPlayed', e.matches_played, 'matchesTotal', e.matches_total, 'killTableSize', e.kill_table_size,
        'tables', (
          select coalesce(json_agg(json_build_object(
            'name', et.name, 'tier', et.tier,
            'rows', (
              select coalesce(json_agg(json_build_object(
                'team', tm.slug, 'placement', s.placement, 'kills', s.kills, 'bonus', s.bonus,
                'wins', s.wins, 'matches', s.matches, 'move', s.move
              ) order by s.sort), '[]')
              from public.standings s
              join public.entries en on en.id = s.entry_id
              join public.teams tm on tm.id = en.team_id
              where s.table_id = et.id
            )
          ) order by et.sort), '[]')
          from public.event_tables et where et.event_id = e.id
        )
      ) order by e.sort_order), '[]')
      from public.events e
    ),
    'entries', (
      select coalesce(json_agg(json_build_object(
        'event', ev.slug, 'team', tm.slug, 'tier', en.tier, 'manager', mg.slug,
        'lineup', (
          select coalesce(json_agg(json_build_object('player', pp.slug, 'role', ep.role, 'captain', ep.captain) order by ep.sort), '[]')
          from public.entry_players ep join public.people pp on pp.id = ep.person_id
          where ep.entry_id = en.id
        )
      ) order by ev.sort_order, en.created_at, tm.slug), '[]')
      from public.entries en
      join public.events ev on ev.id = en.event_id
      join public.teams tm on tm.id = en.team_id
      left join public.people mg on mg.id = en.manager_id
    ),
    'kills', (
      select coalesce(json_agg(json_build_object(
        'event', ev.slug, 'player', pp.slug, 'team', tm.slug, 'kills', k.kills, 'matches', k.matches, 'group', k.grp
      ) order by ev.sort_order, k.kills desc, pp.slug), '[]')
      from public.kill_rows k
      join public.events ev on ev.id = k.event_id
      join public.entries en on en.id = k.entry_id
      join public.teams tm on tm.id = en.team_id
      join public.people pp on pp.id = k.person_id
    )
  );
$$;

grant execute on function public.league_snapshot() to anon, authenticated;
