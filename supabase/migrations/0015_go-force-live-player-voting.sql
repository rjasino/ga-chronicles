-- Allow authorized late joins while preserving vote eligibility, privacy, and
-- completion accounting for the Go Force session.

create function public.go_force_add_session_participant(target_session uuid, target_account uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
  account_row public.accounts%rowtype;
  next_roster_order integer;
  roster_count integer;
  display_name_value text;
  joined_at_value timestamptz;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into session_row
  from public.go_force_sessions
  where id = target_session
  for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if session_row.status not in ('live', 'final_ballot') then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;
  if session_row.status = 'final_ballot'
     and session_row.final_ballot_deadline_at is not null
     and clock_timestamp() >= session_row.final_ballot_deadline_at then
    raise exception 'BALLOT_CLOSED';
  end if;

  select * into account_row
  from public.accounts
  where id = target_account and status = 'active'
  for share;
  if not found then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  if exists (
    select 1 from public.go_force_session_participants
    where session_id = target_session and account_id = target_account
  ) then
    raise exception 'ALREADY_PARTICIPANT';
  end if;

  select count(*) into roster_count
  from public.go_force_session_participants
  where session_id = target_session;
  if roster_count >= 64 then
    raise exception 'ROSTER_FULL';
  end if;

  select coalesce(max(roster_order), 0) + 1 into next_roster_order
  from public.go_force_session_participants
  where session_id = target_session;

  display_name_value := left(
    coalesce(nullif(trim(account_row.display_name), ''), account_row.username, 'Player'),
    80
  );
  joined_at_value := clock_timestamp();

  insert into public.go_force_session_participants (
    session_id,
    account_id,
    display_name_snapshot,
    roster_order,
    active,
    created_at
  ) values (
    target_session,
    target_account,
    display_name_value,
    next_roster_order,
    true,
    joined_at_value
  );

  return jsonb_build_object(
    'sessionId', target_session,
    'participantAccountId', target_account,
    'displayName', display_name_value,
    'rosterOrder', next_roster_order,
    'createdAt', joined_at_value
  );
end;
$$;
revoke all on function public.go_force_add_session_participant(uuid, uuid) from public;
grant execute on function public.go_force_add_session_participant(uuid, uuid) to authenticated;

create function public.go_force_active_account_options(target_session uuid)
returns table(id uuid, username text, display_name text)
language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select s.* into session_row
  from public.go_force_sessions s
  where s.id = target_session;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if session_row.status not in ('live', 'final_ballot') then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;
  if session_row.status = 'final_ballot'
     and session_row.final_ballot_deadline_at is not null
     and clock_timestamp() >= session_row.final_ballot_deadline_at then
    raise exception 'BALLOT_CLOSED';
  end if;

  return query
  select account.id, account.username, account.display_name
  from public.accounts account
  where account.status = 'active'
    and not exists (
      select 1
      from public.go_force_session_participants participant
      where participant.session_id = target_session
        and participant.account_id = account.id
    )
    and (select count(*) from public.go_force_session_participants
         where session_id = target_session) < 64
  order by lower(coalesce(nullif(trim(account.display_name), ''), account.username)), account.id;
end;
$$;
revoke all on function public.go_force_active_account_options(uuid) from public;
grant execute on function public.go_force_active_account_options(uuid) to authenticated;

-- Serialize ballot closure with participant additions and materialize an
-- abstention only for participants who had time to submit a vote.
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
  missing_go integer;
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
      select count(*) into missing_go
      from public.go_force_session_participants p
      where p.session_id = session_row.id
        and p.active
        and exists (
          select 1
          from public.go_force_game_votes opportunity
          join public.go_force_selections opportunity_selection
            on opportunity_selection.id = opportunity.selection_id
          where opportunity_selection.round_id = round_row.id
            and opportunity.participant_account_id = p.account_id
        )
        and not exists (
          select 1
          from public.go_force_game_votes v
          join public.go_force_selections sel on sel.id = v.selection_id
          where sel.round_id = round_row.id
            and v.participant_account_id = p.account_id
            and v.choice = 'go'
            and v.submitted_at is not null
        );

      if missing_go > 0 then
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

  select not exists (
    select 1
    from public.go_force_session_participants p
    where p.session_id = target_session
      and p.active
      and exists (
        select 1
        from public.go_force_game_votes opportunity
        join public.go_force_selections opportunity_selection
          on opportunity_selection.id = opportunity.selection_id
        join public.go_force_rounds opportunity_round
          on opportunity_round.id = opportunity_selection.round_id
        where opportunity_round.session_id = target_session
          and opportunity_round.round_number = 3
          and opportunity.participant_account_id = p.account_id
      )
      and not exists (
        select 1
        from public.go_force_game_votes v
        join public.go_force_selections sel on sel.id = v.selection_id
        join public.go_force_rounds r on r.id = sel.round_id
        where r.session_id = target_session
          and r.round_number = 3
          and v.participant_account_id = p.account_id
          and v.choice = 'go'
          and v.submitted_at is not null
      )
  ) into round_three_go_complete;

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
    'winners', winner_ids,
    'tally', tally
  );
end;
$$;
revoke all on function public.go_force_close_final_ballot(uuid) from public;
grant execute on function public.go_force_close_final_ballot(uuid) to authenticated;

-- Keep raw vote choices private while a ballot is open. A facilitator receives
-- aggregate progress through the scoped functions below.
drop policy if exists "participants read own game votes" on public.go_force_game_votes;
create policy "participants read own game votes" on public.go_force_game_votes for select to anon, authenticated
using (
  participant_account_id = auth.uid()
  or (
    public.go_force_is_facilitator(public.go_force_session_for_selection(selection_id))
    and exists (
      select 1 from public.go_force_selections sel
      where sel.id = selection_id and sel.voting_closed_at is not null
    )
  )
  or public.go_force_selection_is_public(selection_id)
);

drop policy if exists "participants read own final ballot" on public.go_force_final_ballot_votes;
create policy "participants read own final ballot" on public.go_force_final_ballot_votes for select to anon, authenticated
using (
  participant_account_id = auth.uid()
  or (
    public.go_force_is_facilitator(session_id)
    and exists (
      select 1 from public.go_force_sessions s
      where s.id = session_id and s.status <> 'final_ballot'
    )
  )
  or public.go_force_public_results_ready(session_id)
);

create function public.go_force_selection_progress(target_selection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_id_value uuid;
  selected_at timestamptz;
  deadline_at timestamptz;
  closed_at timestamptz;
  eligible_cutoff timestamptz;
  eligible_count integer;
  submitted_count integer;
begin
  select r.session_id, sel.selected_at, sel.voting_deadline_at, sel.voting_closed_at
  into session_id_value, selected_at, deadline_at, closed_at
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;
  if session_id_value is null then raise exception 'SELECTION_NOT_FOUND'; end if;
  if auth.uid() is null or not public.go_force_is_facilitator(session_id_value) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if closed_at is not null then raise exception 'VOTING_CLOSED'; end if;

  eligible_cutoff := coalesce(deadline_at, clock_timestamp());
  select count(*)::integer into eligible_count
  from public.go_force_session_participants p
  where p.session_id = session_id_value
    and p.active
    and (p.created_at <= selected_at or p.created_at < eligible_cutoff);

  select count(*)::integer into submitted_count
  from public.go_force_game_votes v
  where v.selection_id = target_selection and v.submitted_at is not null;

  return jsonb_build_object('eligible', eligible_count, 'submitted', submitted_count);
end;
$$;
revoke all on function public.go_force_selection_progress(uuid) from public;
grant execute on function public.go_force_selection_progress(uuid) to authenticated;

create function public.go_force_closed_selection_summary(target_selection uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  session_id_value uuid;
  selection_closed_at timestamptz;
  selection_outcome text;
  go_count integer;
  no_go_count integer;
  abstain_count integer;
begin
  select r.session_id, sel.voting_closed_at, sel.advancement_outcome
  into session_id_value, selection_closed_at, selection_outcome
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;
  if session_id_value is null then raise exception 'SELECTION_NOT_FOUND'; end if;
  if auth.uid() is null or (
    not public.go_force_can_access_session(session_id_value)
    and not public.go_force_public_results_ready(session_id_value)
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if selection_closed_at is null then raise exception 'BALLOT_NOT_CLOSED'; end if;

  select (count(*) filter (where choice = 'go' and submitted_at is not null))::integer,
         (count(*) filter (where choice = 'no-go' and submitted_at is not null))::integer,
         (count(*) filter (where choice = 'abstain'))::integer
  into go_count, no_go_count, abstain_count
  from public.go_force_game_votes
  where selection_id = target_selection;

  return jsonb_build_object(
    'outcome', selection_outcome,
    'goVotes', coalesce(go_count, 0),
    'noGoVotes', coalesce(no_go_count, 0),
    'abstainVotes', coalesce(abstain_count, 0)
  );
end;
$$;
revoke all on function public.go_force_closed_selection_summary(uuid) from public;
grant execute on function public.go_force_closed_selection_summary(uuid) to authenticated;

create function public.go_force_final_ballot_progress(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
  eligible_cutoff timestamptz;
  eligible_count integer;
  submitted_count integer;
begin
  select * into session_row
  from public.go_force_sessions
  where id = target_session;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if session_row.status <> 'final_ballot' then raise exception 'BALLOT_NOT_OPEN'; end if;

  eligible_cutoff := coalesce(session_row.final_ballot_deadline_at, clock_timestamp());
  select count(*)::integer into eligible_count
  from public.go_force_session_participants p
  where p.session_id = target_session
    and p.active
    and p.created_at < eligible_cutoff;

  select count(*)::integer into submitted_count
  from public.go_force_final_ballot_votes v
  where v.session_id = target_session and v.submitted_at is not null;

  return jsonb_build_object('eligible', eligible_count, 'submitted', submitted_count);
end;
$$;
revoke all on function public.go_force_final_ballot_progress(uuid) from public;
grant execute on function public.go_force_final_ballot_progress(uuid) to authenticated;
