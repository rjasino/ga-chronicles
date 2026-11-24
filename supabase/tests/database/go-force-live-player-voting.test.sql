begin;
select plan(35);

create temporary table final_close_result (payload jsonb);
grant insert, select on pg_temp.final_close_result to authenticated;

select has_function(
  'public',
  'go_force_add_session_participant',
  array['uuid', 'uuid'],
  'late participant add function exists'
);
select has_function(
  'public',
  'go_force_active_account_options',
  array['uuid'],
  'facilitator account-option lookup exists'
);
select has_function(
  'public',
  'go_force_selection_progress',
  array['uuid'],
  'open game-ballot progress aggregate exists'
);
select has_function(
  'public',
  'go_force_closed_selection_summary',
  array['uuid'],
  'closed game-ballot summary aggregate exists'
);
select has_function(
  'public',
  'go_force_final_ballot_progress',
  array['uuid'],
  'open final-ballot progress aggregate exists'
);

-- Live session: two existing participants, one prior closed game, one open
-- game, and a third game still available in round 1.
insert into public.go_force_sessions (id, goty_year, game_master_id, status, started_at)
values ('40000000-0000-4000-8000-000000000101', 2090, '10000000-0000-4000-8000-000000000003', 'live', now());
insert into public.go_force_session_participants (
  session_id, account_id, display_name_snapshot, roster_order, created_at
) values
  ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1, now() - interval '1 hour'),
  ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002', 'Local Contributor', 2, now() - interval '1 hour');
insert into public.go_force_session_games (id, session_id, title_snapshot, source_year, display_order)
values
  ('41000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000101', 'History Game', 2090, 1),
  ('41000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000101', 'Current Game', 2090, 2),
  ('41000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000101', 'Remaining Game', 2090, 3);
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at)
values ('42000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000101', 1, 'active', 3, now());
insert into public.go_force_selections (id, round_id, session_game_id, selection_order, voting_deadline_at)
values (
  '43000000-0000-4000-8000-000000000101',
  '42000000-0000-4000-8000-000000000101',
  '41000000-0000-4000-8000-000000000101',
  1,
  clock_timestamp() + interval '1 hour'
);
insert into public.go_force_sessions (id, goty_year, game_master_id, status)
values ('40000000-0000-4000-8000-000000000103', 2091, '10000000-0000-4000-8000-000000000003', 'ready');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.go_force_close_selection('43000000-0000-4000-8000-000000000101')$$,
  'the facilitator can close a ballot before the round is complete'
);
select is(
  (select count(*)::integer
   from public.go_force_active_account_options('40000000-0000-4000-8000-000000000101')
   where id = '10000000-0000-4000-8000-000000000005'),
  1,
  'the game master can list an active account that is not already rostered'
);
select lives_ok(
  $$select public.go_force_add_session_participant(
      '40000000-0000-4000-8000-000000000101',
      '10000000-0000-4000-8000-000000000005'
    )$$,
  'the game master can add an active account during a live session'
);
select is(
  (select count(*)::integer
   from public.go_force_active_account_options('40000000-0000-4000-8000-000000000101')
   where id = '10000000-0000-4000-8000-000000000005'),
  0,
  'account options omit a player after they are added'
);
select is(
  (select roster_order from public.go_force_session_participants
   where session_id = '40000000-0000-4000-8000-000000000101'
     and account_id = '10000000-0000-4000-8000-000000000005'),
  3,
  'a late participant receives the next roster order'
);
select ok(
  (select participant.created_at > selection.voting_closed_at
   from public.go_force_session_participants participant
   join public.go_force_selections selection
     on selection.id = '43000000-0000-4000-8000-000000000101'
   where participant.session_id = '40000000-0000-4000-8000-000000000101'
     and participant.account_id = '10000000-0000-4000-8000-000000000005'),
  'the late participant join time is after the earlier ballot closed'
);
select is(
  (select count(*)::integer from public.go_force_game_votes
   where selection_id = '43000000-0000-4000-8000-000000000101'
     and participant_account_id = '10000000-0000-4000-8000-000000000005'),
  0,
  'a late participant receives no retroactive vote or abstention row'
);
select throws_ok(
  $$select public.go_force_add_session_participant(
      '40000000-0000-4000-8000-000000000101',
      '10000000-0000-4000-8000-000000000005'
    )$$,
  'P0001',
  'ALREADY_PARTICIPANT',
  'a duplicate participant addition is rejected'
);
select throws_ok(
  $$select public.go_force_add_session_participant(
      '40000000-0000-4000-8000-000000000103',
      '10000000-0000-4000-8000-000000000002'
    )$$,
  'P0001',
  'SESSION_NOT_ACTIVE',
  'a participant cannot be added to a ready session'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.go_force_add_session_participant(
      '40000000-0000-4000-8000-000000000101',
      '10000000-0000-4000-8000-000000000004'
    )$$,
  'P0001',
  'NOT_AUTHORIZED',
  'a regular participant cannot change the session roster'
);

reset role;
insert into public.go_force_selections (id, round_id, session_game_id, selection_order, voting_deadline_at)
values (
  '43000000-0000-4000-8000-000000000102',
  '42000000-0000-4000-8000-000000000101',
  '41000000-0000-4000-8000-000000000102',
  2,
  clock_timestamp() + interval '1 hour'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000102', 'go')->>'choice',
  'go',
  'an existing participant can vote on the current selection'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (select count(*)::integer from public.go_force_game_votes
   where selection_id = '43000000-0000-4000-8000-000000000102'),
  0,
  'a player cannot read another participant choice while voting is open'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  public.go_force_selection_progress('43000000-0000-4000-8000-000000000102')->>'submitted',
  '1',
  'the facilitator can read open-ballot progress without vote choices'
);
select is(
  public.go_force_selection_progress('43000000-0000-4000-8000-000000000102')->>'eligible',
  '3',
  'the open-ballot progress count includes the late participant'
);
select is(
  (select count(*)::integer from public.go_force_game_votes
   where selection_id = '43000000-0000-4000-8000-000000000102'),
  0,
  'the facilitator query cannot read individual choices while voting is open'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000102', 'no-go')->>'choice',
  'no-go',
  'a participant added before the deadline can vote on the open selection'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  public.go_force_close_selection('43000000-0000-4000-8000-000000000102')->>'outcome',
  'advanced',
  'the closed selection retains the existing advancement rule'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (select choice from public.go_force_game_votes
   where selection_id = '43000000-0000-4000-8000-000000000102'
     and participant_account_id = '10000000-0000-4000-8000-000000000002'),
  'abstain',
  'a participant who joined before closure receives an abstention when they do not vote'
);
select is(
  public.go_force_closed_selection_summary('43000000-0000-4000-8000-000000000102')->>'goVotes',
  '1',
  'a player can read the closed game aggregate without peer vote rows'
);
select is(
  public.go_force_closed_selection_summary('43000000-0000-4000-8000-000000000102')->>'noGoVotes',
  '1',
  'the closed game aggregate reports no-go votes'
);
select is(
  public.go_force_closed_selection_summary('43000000-0000-4000-8000-000000000102')->>'abstainVotes',
  '1',
  'the closed game aggregate reports eligible abstentions'
);

reset role;

-- A late entrant on the final ballot has no Round 3 opportunity. Expected
-- completion is based on materialized eligible ballot rows, not roster size
-- multiplied by all historical selections.
insert into public.go_force_sessions (id, goty_year, game_master_id, status)
values ('40000000-0000-4000-8000-000000000102', 2092, '10000000-0000-4000-8000-000000000003', 'final_ballot');
insert into public.go_force_session_participants (
  session_id, account_id, display_name_snapshot, roster_order, created_at
) values
  ('40000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1, now() - interval '1 hour'),
  ('40000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000002', 'Local Contributor', 2, now() - interval '1 hour');
insert into public.go_force_session_games (id, session_id, title_snapshot, source_year, display_order)
values
  ('51000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000102', 'Round 1 Game A', 2092, 1),
  ('51000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000102', 'Round 1 Game B', 2092, 2),
  ('51000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000102', 'Round 2 Game', 2092, 3),
  ('51000000-0000-4000-8000-000000000104', '40000000-0000-4000-8000-000000000102', 'Round 3 Finalist', 2092, 4);
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at, ended_at)
values
  ('52000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000102', 1, 'complete', 3, now() - interval '4 hours', now() - interval '3 hours'),
  ('52000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000102', 2, 'complete', 2, now() - interval '3 hours', now() - interval '2 hours'),
  ('52000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000102', 3, 'complete', 1, now() - interval '2 hours', now() - interval '1 hour');
insert into public.go_force_selections (
  id, round_id, session_game_id, selection_order, voting_closed_at, advancement_outcome
) values
  ('53000000-0000-4000-8000-000000000101', '52000000-0000-4000-8000-000000000101', '51000000-0000-4000-8000-000000000101', 1, now() - interval '3 hours', 'eliminated'),
  ('53000000-0000-4000-8000-000000000102', '52000000-0000-4000-8000-000000000101', '51000000-0000-4000-8000-000000000102', 2, now() - interval '3 hours', 'eliminated'),
  ('53000000-0000-4000-8000-000000000103', '52000000-0000-4000-8000-000000000102', '51000000-0000-4000-8000-000000000103', 1, now() - interval '2 hours', 'eliminated'),
  ('53000000-0000-4000-8000-000000000104', '52000000-0000-4000-8000-000000000103', '51000000-0000-4000-8000-000000000104', 1, now() - interval '1 hour', 'advanced');
insert into public.go_force_game_votes (
  selection_id, participant_account_id, choice, submitted_at, closed_at
)
select selection.id,
       participant.account_id,
       case when selection.id = '53000000-0000-4000-8000-000000000104' then 'go' else 'no-go' end,
       now() - interval '1 hour',
       selection.voting_closed_at
from public.go_force_selections selection
join public.go_force_rounds round_row on round_row.id = selection.round_id
cross join public.go_force_session_participants participant
where round_row.session_id = '40000000-0000-4000-8000-000000000102'
  and participant.session_id = '40000000-0000-4000-8000-000000000102';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select lives_ok(
  $$select public.go_force_add_session_participant(
      '40000000-0000-4000-8000-000000000102',
      '10000000-0000-4000-8000-000000000005'
    )$$,
  'the game master can add a participant during the final ballot'
);
select is(
  public.go_force_final_ballot_progress('40000000-0000-4000-8000-000000000102')->>'eligible',
  '3',
  'final-ballot progress includes participants added before closure'
);
select is(
  public.go_force_final_ballot_progress('40000000-0000-4000-8000-000000000102')->>'submitted',
  '0',
  'final-ballot progress contains counts rather than vote choices'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.go_force_submit_final_ballot(
      '40000000-0000-4000-8000-000000000102',
      '51000000-0000-4000-8000-000000000104',
      null
    )$$,
  'the first existing participant can vote on the final ballot'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$select public.go_force_submit_final_ballot(
      '40000000-0000-4000-8000-000000000102',
      '51000000-0000-4000-8000-000000000104',
      null
    )$$,
  'the second existing participant can vote on the final ballot'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
select lives_ok(
  $$select public.go_force_submit_final_ballot(
      '40000000-0000-4000-8000-000000000102',
      '51000000-0000-4000-8000-000000000104',
      null
    )$$,
  'the late final-ballot participant can vote without a Round 3 game vote'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
insert into pg_temp.final_close_result
select public.go_force_close_final_ballot('40000000-0000-4000-8000-000000000102');
select is(
  (select payload->>'status' from pg_temp.final_close_result),
  'complete',
  'late final-ballot participation preserves session completion'
);
select is(
  (select payload->>'expected' from pg_temp.final_close_result),
  '11',
  'completion expects only eight eligible game votes and three final ballots'
);
select is(
  (select vote_completion_percentage from public.go_force_sessions
   where id = '40000000-0000-4000-8000-000000000102'),
  100.00::numeric,
  'join-aware vote completion reaches one hundred percent'
);

select * from finish();
rollback;
