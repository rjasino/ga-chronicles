create function public.go_force_create_session(target_goty_year integer, target_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  created_session uuid;
  active_account_count integer;
  inserted_participant_count integer;
begin
  if auth.uid() is null or not public.has_role('admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if target_goty_year is null or target_goty_year not between 2000 and 2100 then
    raise exception 'INVALID_GOTY_YEAR';
  end if;
  if target_participant_ids is null
    or cardinality(target_participant_ids) not between 1 and 64 then
    raise exception 'INVALID_ROSTER';
  end if;

  select count(*) into active_account_count
  from public.accounts
  where id = any(target_participant_ids) and status = 'active';
  if active_account_count <> cardinality(target_participant_ids) then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  insert into public.go_force_sessions (goty_year, game_master_id, status)
  values (target_goty_year, auth.uid(), 'ready')
  returning id into created_session;

  insert into public.go_force_session_participants (
    session_id, account_id, display_name_snapshot, roster_order, active
  )
  select created_session,
         account.id,
         coalesce(nullif(trim(account.display_name), ''), account.username, 'Player'),
         requested.roster_order::integer,
         true
  from unnest(target_participant_ids) with ordinality as requested(account_id, roster_order)
  join public.accounts account on account.id = requested.account_id
  where account.status = 'active';

  get diagnostics inserted_participant_count = row_count;
  if inserted_participant_count <> cardinality(target_participant_ids) then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  return created_session;
end;
$$;
revoke all on function public.go_force_create_session(integer, uuid[]) from public;
grant execute on function public.go_force_create_session(integer, uuid[]) to authenticated;
