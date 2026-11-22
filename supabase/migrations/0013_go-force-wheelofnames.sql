-- The provider chooses a candidate; Postgres remains authoritative for whether
-- that candidate can be committed into the active round.

drop function if exists public.go_force_draw_selection(uuid);

create function public.go_force_commit_selection(target_session uuid, target_game uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target public.go_force_sessions%rowtype;
  active_round public.go_force_rounds%rowtype;
  chosen_game public.go_force_session_games%rowtype;
  next_order integer;
  new_selection uuid;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into target
  from public.go_force_sessions
  where id = target_session
  for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if target.status <> 'live' then raise exception 'SESSION_NOT_LIVE'; end if;

  select * into active_round
  from public.go_force_rounds
  where session_id = target_session and status = 'active'
  order by round_number desc
  limit 1
  for update;
  if not found then raise exception 'NO_ACTIVE_ROUND'; end if;

  if exists (
    select 1
    from public.go_force_selections sel
    where sel.round_id = active_round.id
      and sel.voting_closed_at is null
  ) then
    raise exception 'OPEN_BALLOT';
  end if;

  select * into chosen_game
  from public.go_force_session_games sg
  where sg.id = target_game
    and sg.session_id = target_session;
  if not found then raise exception 'GAME_NOT_ELIGIBLE'; end if;

  if active_round.round_number > 1 and not exists (
    select 1
    from public.go_force_selections prior_selection
    join public.go_force_rounds prior_round on prior_round.id = prior_selection.round_id
    where prior_round.session_id = target_session
      and prior_round.round_number = active_round.round_number - 1
      and prior_selection.session_game_id = chosen_game.id
      and prior_selection.advancement_outcome = 'advanced'
  ) then
    raise exception 'GAME_NOT_ELIGIBLE';
  end if;

  if exists (
    select 1
    from public.go_force_selections sel
    where sel.round_id = active_round.id
      and sel.session_game_id = chosen_game.id
  ) then
    raise exception 'GAME_ALREADY_SELECTED';
  end if;

  select coalesce(max(selection_order), 0) + 1
  into next_order
  from public.go_force_selections
  where round_id = active_round.id;

  insert into public.go_force_selections (round_id, session_game_id, selection_order)
  values (active_round.id, chosen_game.id, next_order)
  returning id into new_selection;

  return jsonb_build_object(
    'selectionId', new_selection,
    'gameId', chosen_game.id,
    'title', chosen_game.title_snapshot,
    'selectionOrder', next_order,
    'round', active_round.round_number
  );
end;
$$;

revoke all on function public.go_force_commit_selection(uuid, uuid) from public;
grant execute on function public.go_force_commit_selection(uuid, uuid) to authenticated;
