-- Managing the admin list from the admin itself (Admins page), owners only.
--
-- Roles: an owner manages the admin list, site Settings and the Fantasy controls; an editor
-- manages content (events, teams, players, results, news, staff, media). Every rule here is
-- checked in the database, so it holds however the database is called.
--
-- The functions run as their owner (security definer) because the admin list needs each
-- admin's email from auth.users, which signed-in users can't read. Each one refuses anyone
-- who isn't an owner, and none can remove or demote the last owner, or change the caller's
-- own access (so nobody locks themselves out by mistake).

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()) and role = 'owner');
$$;

-- Every admin with their email, owners first.
create function public.admin_list()
returns table (user_id uuid, email text, role public.admin_role, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage admins.' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.role, a.created_at, u.last_sign_in_at
    from public.admins a
    join auth.users u on u.id = a.user_id
    order by a.role, a.created_at;
end;
$$;

-- Gives an existing account admin rights. Returns 'added', 'no_account' or 'already'.
create function public.admin_add(target_email text, new_role public.admin_role default 'editor') returns text
language plpgsql security definer set search_path = '' as $$
declare
  target uuid;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage admins.' using errcode = '42501';
  end if;
  select id into target from auth.users where lower(email) = lower(btrim(target_email)) limit 1;
  if target is null then
    return 'no_account';
  end if;
  if exists (select 1 from public.admins where user_id = target) then
    return 'already';
  end if;
  insert into public.admins (user_id, role) values (target, new_role);
  return 'added';
end;
$$;

-- Changes an admin's role. Returns 'updated', 'self', 'last_owner' or 'missing'.
create function public.admin_set_role(target uuid, new_role public.admin_role) returns text
language plpgsql security definer set search_path = '' as $$
declare
  held_role public.admin_role;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage admins.' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    return 'self';
  end if;
  -- Lock the owner rows so two owners demoting each other at once can't leave none.
  perform 1 from public.admins where role = 'owner' for update;
  select role into held_role from public.admins where user_id = target;
  if held_role is null then
    return 'missing';
  end if;
  if held_role = 'owner' and new_role <> 'owner' and (select count(*) from public.admins where role = 'owner') <= 1 then
    return 'last_owner';
  end if;
  update public.admins set role = new_role where user_id = target;
  return 'updated';
end;
$$;

-- Takes admin rights away (the account itself stays). Returns 'removed', 'self', 'last_owner' or 'missing'.
create function public.admin_remove(target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  held_role public.admin_role;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage admins.' using errcode = '42501';
  end if;
  if target = (select auth.uid()) then
    return 'self';
  end if;
  perform 1 from public.admins where role = 'owner' for update;
  select role into held_role from public.admins where user_id = target;
  if held_role is null then
    return 'missing';
  end if;
  if held_role = 'owner' and (select count(*) from public.admins where role = 'owner') <= 1 then
    return 'last_owner';
  end if;
  delete from public.admins where user_id = target;
  return 'removed';
end;
$$;

revoke execute on function public.is_owner(), public.admin_list(), public.admin_add(text, public.admin_role), public.admin_set_role(uuid, public.admin_role), public.admin_remove(uuid) from public, anon;
grant execute on function public.is_owner(), public.admin_list(), public.admin_add(text, public.admin_role), public.admin_set_role(uuid, public.admin_role), public.admin_remove(uuid) to authenticated;

-- Site settings become owner-only to change.
drop policy "Admins can insert" on public.site_settings;
drop policy "Admins can update" on public.site_settings;
create policy "Owners can insert" on public.site_settings for insert to authenticated with check ((select public.is_owner()));
create policy "Owners can update" on public.site_settings for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
