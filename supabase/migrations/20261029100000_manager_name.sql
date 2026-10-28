-- Managers aren't players: a squad's manager is now just a name typed on its registration, not a
-- link to a person. No registration had a manager yet, so nothing is carried over.
-- The site's read also gains each event's registration link and note, for the register buttons.

alter table public.entries add column manager text check (manager is null or length(btrim(manager)) between 1 and 80);
drop index if exists public.entries_manager;
alter table public.entries drop column manager_id;

create or replace function public.league_snapshot() returns json
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
        'registrationUrl', e.registration_url, 'registrationNote', e.registration_note,
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
        'event', ev.slug, 'team', tm.slug, 'tier', en.tier, 'manager', en.manager,
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
