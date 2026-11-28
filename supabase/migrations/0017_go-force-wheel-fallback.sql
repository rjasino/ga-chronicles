-- Wheel of Names fallback draw support:
-- 1. Global default setting on go_force_page_settings
-- 2. Per-session toggle on go_force_sessions (initialized on create, toggleable in ready/live)
-- 3. Pre-randomized remaining games queue on go_force_rounds (server-only)

alter table public.go_force_page_settings
  add column if not exists wheel_fallback_enabled boolean not null default false;

alter table public.go_force_sessions
  add column if not exists wheel_fallback_enabled boolean not null default false;

alter table public.go_force_rounds
  add column if not exists fallback_queue uuid[] not null default '{}'::uuid[];

create or replace function public.go_force_create_session(target_goty_year integer, target_participant_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  created_session uuid;
  active_account_count integer;
  inserted_participant_count integer;
  default_fallback boolean;
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

  select coalesce(s.wheel_fallback_enabled, false)
  into default_fallback
  from public.go_force_page_settings s
  where s.id = true;

  insert into public.go_force_sessions (
    goty_year, game_master_id, status, wheel_fallback_enabled
  )
  values (
    target_goty_year, auth.uid(), 'ready', coalesce(default_fallback, false)
  )
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

create or replace function public.go_force_set_wheel_fallback(
  target_session uuid,
  fallback_enabled boolean
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  target public.go_force_sessions%rowtype;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into target
  from public.go_force_sessions
  where id = target_session
  for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if target.status not in ('ready', 'live') then
    raise exception 'SESSION_NOT_LIVE';
  end if;

  update public.go_force_sessions
  set wheel_fallback_enabled = coalesce(fallback_enabled, false),
      updated_at = now()
  where id = target_session;

  return coalesce(fallback_enabled, false);
end;
$$;

revoke all on function public.go_force_set_wheel_fallback(uuid, boolean) from public;
grant execute on function public.go_force_set_wheel_fallback(uuid, boolean) to authenticated;

create or replace function public.go_force_draw_fallback_selection(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target public.go_force_sessions%rowtype;
  active_round public.go_force_rounds%rowtype;
  remaining_ids uuid[];
  effective_queue uuid[];
  chosen_game_id uuid;
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

  if active_round.round_number = 1 then
    select coalesce(array_agg(sg.id order by sg.display_order, sg.id), '{}'::uuid[])
    into remaining_ids
    from public.go_force_session_games sg
    where sg.session_id = target_session
      and not exists (
        select 1
        from public.go_force_selections sel
        where sel.round_id = active_round.id
          and sel.session_game_id = sg.id
      );
  else
    select coalesce(array_agg(sg.id order by sg.display_order, sg.id), '{}'::uuid[])
    into remaining_ids
    from public.go_force_session_games sg
    where sg.session_id = target_session
      and exists (
        select 1
        from public.go_force_selections prior_selection
        join public.go_force_rounds prior_round on prior_round.id = prior_selection.round_id
        where prior_round.session_id = target_session
          and prior_round.round_number = active_round.round_number - 1
          and prior_selection.session_game_id = sg.id
          and prior_selection.advancement_outcome = 'advanced'
      )
      and not exists (
        select 1
        from public.go_force_selections sel
        where sel.round_id = active_round.id
          and sel.session_game_id = sg.id
      );
  end if;

  if coalesce(cardinality(remaining_ids), 0) = 0 then
    raise exception 'ROUND_EXHAUSTED';
  end if;

  -- Keep only queued games that are still eligible and un-drawn in this round.
  select coalesce(array_agg(q.game_id order by q.ord), '{}'::uuid[])
  into effective_queue
  from unnest(coalesce(active_round.fallback_queue, '{}'::uuid[])) with ordinality as q(game_id, ord)
  where q.game_id = any(remaining_ids);

  -- Lazily pre-randomize remaining games when the queue is empty.
  if coalesce(cardinality(effective_queue), 0) = 0 then
    select coalesce(array_agg(r.game_id order by random()), '{}'::uuid[])
    into effective_queue
    from unnest(remaining_ids) as r(game_id);
  end if;

  chosen_game_id := effective_queue[1];

  update public.go_force_rounds
  set fallback_queue = coalesce(effective_queue[2:], '{}'::uuid[])
  where id = active_round.id;

  select * into chosen_game
  from public.go_force_session_games sg
  where sg.id = chosen_game_id
    and sg.session_id = target_session;

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

revoke all on function public.go_force_draw_fallback_selection(uuid) from public;
grant execute on function public.go_force_draw_fallback_selection(uuid) to authenticated;
