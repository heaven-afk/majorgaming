-- Run ONLY in Heaven Index Supabase SQL Editor, after MGL's endpoint is deployed.
-- Keep the existing mgl_results_webhook_secret and MGL_RESULTS_WEBHOOK_SECRET.
-- This changes the URL only; it does not send notifications or alter scores.
begin;
do $$
declare
  endpoint_id uuid;
  endpoint_count integer;
  current_url text;
  new_url constant text := 'https://www.majorgamingleague.com/api/index-results/webhook';
begin
  select count(*) into endpoint_count
  from vault.secrets where name = 'mgl_results_webhook_url';
  if endpoint_count <> 1 then
    raise exception 'Expected exactly one existing mgl_results_webhook_url Vault entry';
  end if;

  select id, decrypted_secret into endpoint_id, current_url
  from vault.decrypted_secrets where name = 'mgl_results_webhook_url';

  if current_url = new_url then
    raise notice 'MGL webhook already uses the custom domain';
  elsif current_url = 'https://mglwebsite.vercel.app/api/index-results/webhook' then
    perform vault.update_secret(endpoint_id, new_url);
  else
    raise exception 'Unexpected existing webhook destination; review it in Vault before changing it';
  end if;
end;
$$;
commit;
