-- Teams own their current tier, manager and roster (owner, 2026-10-29), edited any time with no
-- season involved. A season keeps its own copy: when a team is locked into an event its roster is
-- copied onto the registration, kept in step while the event is upcoming or live, and frozen
-- once it is final. A tier in the league can hold any number of teams; only an event caps it.

alter table public.teams
  add column tier integer check (tier > 0),
  add column manager text check (manager is null or length(btrim(manager)) between 1 and 80);

-- The current roster. A player is on one team at a time.
create table public.team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  person_id uuid not null unique references public.people (id) on delete restrict,
  sort integer not null default 0,
  role text check (role in ('IGL', 'Fragger', 'Support', 'Anchor')),
  captain boolean not null default false,
  created_at timestamptz not null default now()
);
create index team_players_team on public.team_players (team_id, sort);
create unique index team_players_one_captain on public.team_players (team_id) where captain;

alter table public.team_players enable row level security;
create policy "Anyone can read" on public.team_players for select to anon, authenticated using (true);
create policy "Admins can insert" on public.team_players for insert to authenticated with check ((select public.is_admin()));
create policy "Admins can update" on public.team_players for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins can delete" on public.team_players for delete to authenticated using ((select public.is_admin()));

-- Starting point, from what is on record. The current tier is the team's tier in the newest
-- ranked season that has registrations, if they played it.
update public.teams t set tier = en.tier
from public.entries en
where en.team_id = t.id
  and en.event_id = (
    select e.id from public.events e
    where e.kind = 'season' and exists (select 1 from public.entries x where x.event_id = e.id)
    order by e.sort_order limit 1
  );

-- Manager and roster: from each team's newest registration (ranked seasons first).
with pick as (
  select distinct on (en.team_id) en.id, en.team_id, en.manager
  from public.entries en join public.events ev on ev.id = en.event_id
  order by en.team_id, (ev.kind = 'season') desc, ev.sort_order
)
update public.teams t set manager = p.manager from pick p where p.team_id = t.id and p.manager is not null;

-- A player who shows on more than one team's newest roster goes to the team they played for most recently.
with pick as (
  select distinct on (en.team_id) en.id, en.team_id
  from public.entries en join public.events ev on ev.id = en.event_id
  order by en.team_id, (ev.kind = 'season') desc, ev.sort_order
)
insert into public.team_players (team_id, person_id, sort, role, captain)
select team_id, person_id, sort, role, captain from (
  select distinct on (ep.person_id) p.team_id, ep.person_id, ep.sort, ep.role, ep.captain
  from pick p
  join public.entry_players ep on ep.entry_id = p.id
  join public.events ev on ev.id = ep.event_id
  order by ep.person_id, ev.sort_order
) x;

create or replace function public.league_snapshot() returns json
language sql stable security invoker set search_path = '' as $$
  select json_build_object(
    'teams', (
      select coalesce(json_agg(json_build_object(
        'slug', t.slug, 'name', t.name, 'tag', t.tag, 'clan', t.clan, 'logo', t.logo_url,
        'tier', t.tier, 'manager', t.manager, 'archived', t.archived_at is not null,
        'roster', (
          select coalesce(json_agg(json_build_object('player', pp.slug, 'role', tp.role, 'captain', tp.captain) order by tp.sort), '[]')
          from public.team_players tp join public.people pp on pp.id = tp.person_id
          where tp.team_id = t.id
        )
      ) order by t.slug), '[]')
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
        'registrationUrl', e.registration_url, 'registrationNote', e.registration_note,
        'poster', case when e.poster_url is null then null else json_build_object('src', e.poster_url, 'alt', coalesce(e.poster_alt, ''), 'width', e.poster_width, 'height', e.poster_height) end,
        'summary', e.summary, 'description', e.description, 'details', e.details,
        'matchesPlayed', e.matches_played, 'matchesTotal', e.matches_total, 'killTableSize', e.kill_table_size,
        'tables', (
          select coalesce(json_agg(json_build_object(
            'name', et.name, 'tier', et.tier,
            'rows', (
              select coalesce(json_agg(json_build_object(
                'team', tm.slug, 'teamName', en.team_name, 'teamTag', en.team_tag, 'placement', s.placement, 'kills', s.kills, 'bonus', s.bonus,
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
        'event', ev.slug, 'team', tm.slug, 'teamName', en.team_name, 'teamTag', en.team_tag, 'tier', en.tier, 'manager', en.manager,
        'lineup', (
          select coalesce(json_agg(json_build_object('player', pp.slug, 'role', ep.role, 'captain', ep.captain) order by ep.sort), '[]')
          from public.entry_players ep join public.people pp on pp.id = ep.person_id
          where ep.entry_id = en.id
        )
      ) order by ev.sort_order, en.created_at, tm.slug), '[]')
      from public.entries en
      join public.events ev on ev.id = en.event_id
      join public.teams tm on tm.id = en.team_id
    ),
    'kills', (
      select coalesce(json_agg(json_build_object(
        'event', ev.slug, 'player', pp.slug, 'ign', k.ign, 'team', tm.slug, 'teamName', en.team_name, 'teamTag', en.team_tag, 'kills', k.kills, 'matches', k.matches, 'group', k.grp
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
