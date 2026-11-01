-- Computed column so the admin people search can OR a username match with an
-- email match in a single PostgREST filter (embedded columns cannot appear in a
-- root-level or()). Security invoker: only roles that can read the private
-- lookup table (service_role) get a value, and execution is limited to it.
create function public.search_email(account public.accounts)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select lookup.email from public.account_auth_lookup lookup where lookup.account_id = account.id
$$;

revoke all on function public.search_email(public.accounts) from public, anon, authenticated;
grant execute on function public.search_email(public.accounts) to service_role;
