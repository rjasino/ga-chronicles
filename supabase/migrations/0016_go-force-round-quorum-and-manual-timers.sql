alter table public.go_force_page_settings
  add column round_voting_timed boolean not null default true,
  add column final_ballot_timed boolean not null default true,
  add column minimum_round_three_go_voters integer not null default 2
    constraint go_force_min_round_three_go_voters_range
    check (minimum_round_three_go_voters between 1 and 64);

create or replace function public.go_force_set_selection_voting_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  duration_seconds integer;
  timer_enabled boolean;
begin
  select coalesce(settings.round_voting_seconds, 10),
         coalesce(settings.round_voting_timed, true)
  into duration_seconds, timer_enabled
  from public.go_force_rounds r
  join public.go_force_sessions s on s.id = r.session_id
  left join public.go_force_page_settings settings on settings.id = true
  where r.id = new.round_id;

  if coalesce(timer_enabled, true) then
    new.voting_deadline_at := coalesce(
      new.voting_deadline_at,
      clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10))
    );
  else
    new.voting_deadline_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_set_selection_voting_deadline() from public;

create or replace function public.go_force_set_final_ballot_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  duration_seconds integer;
  timer_enabled boolean;
begin
  if new.status = 'final_ballot' and tg_op = 'INSERT' then
    select coalesce(final_ballot_seconds, 10), coalesce(final_ballot_timed, true)
    into duration_seconds, timer_enabled
    from public.go_force_page_settings
    where id = true;
    if coalesce(timer_enabled, true) then
      new.final_ballot_deadline_at :=
        clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10));
    else
      new.final_ballot_deadline_at := null;
    end if;
  elsif new.status = 'final_ballot' and old.status is distinct from new.status then
    select coalesce(final_ballot_seconds, 10), coalesce(final_ballot_timed, true)
    into duration_seconds, timer_enabled
    from public.go_force_page_settings
    where id = true;
    if coalesce(timer_enabled, true) then
      new.final_ballot_deadline_at :=
        clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10));
    else
      new.final_ballot_deadline_at := null;
    end if;
  elsif new.status <> 'final_ballot' then
    new.final_ballot_deadline_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_set_final_ballot_deadline() from public;

create or replace function public.go_force_close_selection(target_selection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selection_row public.go_force_selections%rowtype;
  round_row public.go_force_rounds%rowtype;
  session_row public.go_force_sessions%rowtype;
  session_id_value uuid;
  deadline_at timestamptz;
  closed_at_value timestamptz;
  eligibility_cutoff timestamptz;
  go_count integer;
  pool_size integer;
  selected_count integer;
  advanced_count integer;
  new_status text;
  new_round_number integer;
  next_go_limit integer;
  go_voter_count integer;
  required_go_voters integer;
begin
  select r.session_id, sel.voting_deadline_at into session_id_value, deadline_at
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;

  if session_id_value is null then raise exception 'SELECTION_NOT_FOUND'; end if;
  if auth.uid() is null or (
    not public.go_force_is_facilitator(session_id_value)
    and not (
      public.go_force_is_participant(session_id_value)
      and deadline_at is not null
      and clock_timestamp() >= deadline_at
    )
  ) then raise exception 'NOT_AUTHORIZED'; end if;

  select * into session_row
  from public.go_force_sessions
  where id = session_id_value
  for update;
  select * into selection_row
  from public.go_force_selections
  where id = target_selection
  for update;
  select * into round_row
  from public.go_force_rounds
  where id = selection_row.round_id
  for update;

  if selection_row.voting_closed_at is not null and round_row.status = 'complete' then
    select count(*) into go_count
    from public.go_force_game_votes
    where selection_id = target_selection and choice = 'go' and submitted_at is not null;
    return jsonb_build_object(
      'outcome', selection_row.advancement_outcome,
      'goVotes', go_count,
      'roundComplete', true,
      'round', round_row.round_number,
      'sessionStatus', session_row.status,
      'nextRound', null
    );
  end if;

  if selection_row.voting_closed_at is null then
    closed_at_value := clock_timestamp();
    eligibility_cutoff := least(
      closed_at_value,
      coalesce(selection_row.voting_deadline_at, closed_at_value)
    );

    insert into public.go_force_game_votes (selection_id, participant_account_id, choice, closed_at)
    select target_selection, p.account_id, 'abstain', closed_at_value
    from public.go_force_session_participants p
    where p.session_id = session_row.id
      and p.active
      and (
        p.created_at <= selection_row.selected_at
        or p.created_at < eligibility_cutoff
      )
      and not exists (
        select 1 from public.go_force_game_votes v
        where v.selection_id = target_selection
          and v.participant_account_id = p.account_id
      );

    update public.go_force_game_votes
    set closed_at = closed_at_value
    where selection_id = target_selection and closed_at is null;

    select count(*) into go_count
    from public.go_force_game_votes
    where selection_id = target_selection
      and choice = 'go'
      and submitted_at is not null;

    update public.go_force_selections
    set voting_closed_at = closed_at_value,
        advancement_outcome = case when go_count > 0 then 'advanced' else 'eliminated' end
    where id = target_selection
    returning * into selection_row;
  end if;

  select count(*) into go_count
  from public.go_force_game_votes
  where selection_id = target_selection
    and choice = 'go'
    and submitted_at is not null;

  select count(*) into pool_size
  from public.go_force_session_games sg
  where sg.session_id = session_row.id
    and (
      round_row.round_number = 1
      or exists (
        select 1 from public.go_force_selections prior_sel
        join public.go_force_rounds prior_round on prior_round.id = prior_sel.round_id
        where prior_round.session_id = session_row.id
          and prior_round.round_number = round_row.round_number - 1
          and prior_sel.session_game_id = sg.id
          and prior_sel.advancement_outcome = 'advanced'
      )
    );

  select count(*) into selected_count
  from public.go_force_selections
  where round_id = round_row.id;

  if selected_count < pool_size then
    return jsonb_build_object(
      'outcome', selection_row.advancement_outcome,
      'goVotes', go_count,
      'roundComplete', false,
      'round', round_row.round_number,
      'sessionStatus', session_row.status
    );
  end if;

  update public.go_force_rounds
  set status = 'complete', ended_at = clock_timestamp()
  where id = round_row.id;

  select count(*) into advanced_count
  from public.go_force_selections
  where round_id = round_row.id and advancement_outcome = 'advanced';

  new_status := session_row.status;
  if round_row.round_number < 3 then
    if advanced_count = 0 then
      new_status := 'stopped_no_finalists';
      update public.go_force_sessions
      set status = new_status, completed_at = clock_timestamp(), vote_completion_percentage = 0
      where id = session_row.id;
    else
      new_round_number := round_row.round_number + 1;
      next_go_limit := 4 - new_round_number;
      insert into public.go_force_rounds (session_id, round_number, status, go_limit, started_at)
      values (session_row.id, new_round_number, 'active', next_go_limit, clock_timestamp());
    end if;
  else
    if advanced_count = 0 then
      new_status := 'stopped_no_finalists';
      update public.go_force_sessions
      set status = new_status, completed_at = clock_timestamp(), vote_completion_percentage = 0
      where id = session_row.id;
    else
      select coalesce(minimum_round_three_go_voters, 2)
      into required_go_voters
      from public.go_force_page_settings
      where id = true;
      required_go_voters := coalesce(required_go_voters, 2);

      select count(distinct v.participant_account_id)
      into go_voter_count
      from public.go_force_game_votes v
      join public.go_force_selections sel on sel.id = v.selection_id
      where sel.round_id = round_row.id
        and v.choice = 'go'
        and v.submitted_at is not null;

      if go_voter_count < required_go_voters then
        new_status := 'incomplete_vote_threshold';
        update public.go_force_sessions
        set status = new_status, completed_at = clock_timestamp()
        where id = session_row.id;
      else
        new_status := 'final_ballot';
        update public.go_force_sessions set status = new_status where id = session_row.id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'outcome', selection_row.advancement_outcome,
    'goVotes', go_count,
    'roundComplete', true,
    'round', round_row.round_number,
    'sessionStatus', new_status,
    'nextRound', case
      when round_row.round_number < 3 and advanced_count > 0
      then round_row.round_number + 1
      else null
    end
  );
end;
$$;
revoke all on function public.go_force_close_selection(uuid) from public;
grant execute on function public.go_force_close_selection(uuid) to authenticated;

create or replace function public.go_force_close_final_ballot(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
  ballot_closed_at timestamptz;
  eligibility_cutoff timestamptz;
  expected_total integer;
  submitted_total integer;
  completion numeric(5, 2);
  round_three_go_complete boolean;
  round_three_go_count integer;
  required_go_voters integer;
  winner_ids uuid[];
  tally jsonb;
  new_status text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED'; end if;

  select * into session_row
  from public.go_force_sessions
  where id = target_session
  for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.go_force_is_facilitator(target_session)
     and not (
       public.go_force_is_participant(target_session)
       and session_row.final_ballot_deadline_at is not null
       and clock_timestamp() >= session_row.final_ballot_deadline_at
     ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if session_row.status <> 'final_ballot' then raise exception 'BALLOT_NOT_OPEN'; end if;

  ballot_closed_at := clock_timestamp();
  eligibility_cutoff := least(
    ballot_closed_at,
    coalesce(session_row.final_ballot_deadline_at, ballot_closed_at)
  );

  insert into public.go_force_final_ballot_votes (
    session_id, participant_account_id, finalist_game_id, remark, closed_at
  )
  select target_session, p.account_id, null, null, ballot_closed_at
  from public.go_force_session_participants p
  where p.session_id = target_session
    and p.active
    and p.created_at < eligibility_cutoff
    and not exists (
      select 1 from public.go_force_final_ballot_votes v
      where v.session_id = target_session
        and v.participant_account_id = p.account_id
    );

  update public.go_force_final_ballot_votes
  set closed_at = ballot_closed_at
  where session_id = target_session and closed_at is null;

  select count(*)::integer into expected_total
  from (
    select v.id
    from public.go_force_game_votes v
    join public.go_force_selections sel on sel.id = v.selection_id
    join public.go_force_rounds r on r.id = sel.round_id
    where r.session_id = target_session
    union all
    select v.id
    from public.go_force_final_ballot_votes v
    where v.session_id = target_session
  ) opportunities;

  select count(*)::integer into submitted_total
  from (
    select v.id
    from public.go_force_game_votes v
    join public.go_force_selections sel on sel.id = v.selection_id
    join public.go_force_rounds r on r.id = sel.round_id
    where r.session_id = target_session and v.submitted_at is not null
    union all
    select v.id
    from public.go_force_final_ballot_votes v
    where v.session_id = target_session and v.submitted_at is not null
  ) submitted;

  completion := case when expected_total = 0 then 0
    else round((submitted_total::numeric * 100) / expected_total, 2) end;

  select coalesce(minimum_round_three_go_voters, 2)
  into required_go_voters
  from public.go_force_page_settings
  where id = true;
  required_go_voters := coalesce(required_go_voters, 2);

  select count(distinct v.participant_account_id)
  into round_three_go_count
  from public.go_force_game_votes v
  join public.go_force_selections sel on sel.id = v.selection_id
  join public.go_force_rounds r on r.id = sel.round_id
  where r.session_id = target_session
    and r.round_number = 3
    and v.choice = 'go'
    and v.submitted_at is not null;
  round_three_go_complete := round_three_go_count >= required_go_voters;

  select coalesce(jsonb_object_agg(finalist_game_id, total), '{}'::jsonb) into tally
  from (
    select finalist_game_id, count(*)::integer as total
    from public.go_force_final_ballot_votes
    where session_id = target_session
      and submitted_at is not null
      and finalist_game_id is not null
    group by finalist_game_id
  ) counts;

  select coalesce(array_agg(finalist_game_id), '{}'::uuid[]) into winner_ids
  from (
    select finalist_game_id, count(*) as total
    from public.go_force_final_ballot_votes
    where session_id = target_session
      and submitted_at is not null
      and finalist_game_id is not null
    group by finalist_game_id
    having count(*) = (
      select max(inner_counts.total)
      from (
        select count(*) as total
        from public.go_force_final_ballot_votes
        where session_id = target_session
          and submitted_at is not null
          and finalist_game_id is not null
        group by finalist_game_id
      ) inner_counts
    )
  ) winners;

  if completion >= 80 and round_three_go_complete and cardinality(winner_ids) > 0 then
    new_status := 'complete';
    update public.go_force_sessions
    set status = new_status, completed_at = clock_timestamp(), vote_completion_percentage = completion
    where id = target_session;

    insert into public.go_force_results (session_id, winner_game_ids, final_vote_totals)
    values (target_session, winner_ids, tally)
    on conflict (session_id) do update
    set winner_game_ids = excluded.winner_game_ids,
        final_vote_totals = excluded.final_vote_totals;
  else
    new_status := 'incomplete_vote_threshold';
    update public.go_force_sessions
    set status = new_status, completed_at = clock_timestamp(), vote_completion_percentage = completion
    where id = target_session;
    winner_ids := '{}'::uuid[];
  end if;

  return jsonb_build_object(
    'status', new_status,
    'completion', completion,
    'submitted', submitted_total,
    'expected', expected_total,
    'roundThreeGoComplete', round_three_go_complete,
    'roundThreeGoVoters', round_three_go_count,
    'requiredRoundThreeGoVoters', required_go_voters,
    'winners', winner_ids,
    'tally', tally
  );
end;
$$;
revoke all on function public.go_force_close_final_ballot(uuid) from public;
grant execute on function public.go_force_close_final_ballot(uuid) to authenticated;

create function public.go_force_closed_selection_summaries(target_session uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  summaries jsonb;
begin
  if auth.uid() is null or (
    not public.go_force_can_access_session(target_session)
    and not public.go_force_public_results_ready(target_session)
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'selectionId', summary.selection_id,
        'outcome', summary.advancement_outcome,
        'goVotes', summary.go_votes,
        'noGoVotes', summary.no_go_votes,
        'abstainVotes', summary.abstain_votes
      )
      order by summary.round_number, summary.selection_order
    ),
    '[]'::jsonb
  )
  into summaries
  from (
    select sel.id as selection_id,
           sel.advancement_outcome,
           round_row.round_number,
           sel.selection_order,
           count(v.id) filter (where v.choice = 'go' and v.submitted_at is not null) as go_votes,
           count(v.id) filter (where v.choice = 'no-go' and v.submitted_at is not null)
             as no_go_votes,
           count(v.id) filter (where v.choice = 'abstain') as abstain_votes
    from public.go_force_selections sel
    join public.go_force_rounds round_row on round_row.id = sel.round_id
    left join public.go_force_game_votes v on v.selection_id = sel.id
    where round_row.session_id = target_session
      and sel.voting_closed_at is not null
    group by sel.id, sel.advancement_outcome, round_row.round_number, sel.selection_order
  ) summary;

  return summaries;
end;
$$;
revoke all on function public.go_force_closed_selection_summaries(uuid) from public;
grant execute on function public.go_force_closed_selection_summaries(uuid) to authenticated;
