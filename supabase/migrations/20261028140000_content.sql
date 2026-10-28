-- News and staff for the public site, in one call, in the record shapes of src/data/types.ts
-- (StoryRecord) and src/data/staff.ts (StaffRecord). Published stories only; archived staff hidden.

create function public.site_content() returns json
language sql stable security invoker set search_path = '' as $$
  select json_build_object(
    'stories', (
      select coalesce(json_agg(json_build_object(
        'slug', s.slug, 'title', s.title, 'category', s.category, 'date', s.published_on,
        'author', json_build_object('name', coalesce(s.author_name, 'MGL'), 'role', coalesce(s.author_role, '')),
        'excerpt', coalesce(s.excerpt, ''),
        'cover', json_build_object('src', s.cover_url, 'width', s.cover_width, 'height', s.cover_height, 'alt', coalesce(s.cover_alt, '')),
        'body', s.body
      ) order by s.published_on desc, s.slug), '[]')
      from public.stories s
      where s.status = 'published' and s.published_on is not null and s.cover_url is not null
    ),
    'staff', (
      select coalesce(json_agg(json_build_object(
        'slug', m.slug, 'name', m.name, 'role', m.role, 'group', m.grp, 'country', m.country,
        'photo', m.photo_url, 'socials', m.socials, 'order', m.sort, 'spotlight', m.spotlight
      ) order by m.grp, m.sort, m.slug), '[]')
      from public.staff m
      where m.archived_at is null
    )
  );
$$;

grant execute on function public.site_content() to anon, authenticated;
