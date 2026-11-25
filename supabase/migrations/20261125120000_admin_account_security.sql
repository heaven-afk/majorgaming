begin;

-- An email alone is insufficient to select an account for a privilege grant.
revoke execute on function public.admin_add(text, public.admin_role)
  from public, anon, authenticated;

create function public.admin_add_account(
  target uuid, target_email text, new_role public.admin_role
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  confirmed_at timestamptz;
begin
  if not public.is_owner() then
    raise exception 'Only owners can manage admins.' using errcode = '42501';
  end if;

  select email_confirmed_at into confirmed_at
  from auth.users
  where id = target and lower(email) = lower(btrim(target_email))
  for share;

  if not found then return 'no_account'; end if;
  if confirmed_at is null then return 'unconfirmed'; end if;

  insert into public.admins (user_id, role) values (target, new_role)
    on conflict (user_id) do nothing;
  if not found then return 'already'; end if;
  return 'added';
end;
$$;

revoke execute on function public.admin_add_account(uuid, text, public.admin_role)
  from public, anon;
grant execute on function public.admin_add_account(uuid, text, public.admin_role)
  to authenticated;

commit;
