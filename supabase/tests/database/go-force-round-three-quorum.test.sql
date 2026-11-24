begin;
select plan(10);

create function pg_temp.prepare_round_three_quorum_case(
  target_session uuid,
  target_year integer,
  target_game uuid,
  target_round_two uuid,
  target_round_three uuid,
  target_selection_two uuid,
  target_selection_three uuid,
  go_players uuid[]
)
returns void language plpgsql as $$
begin
  insert into public.go_force_sessions (id, goty_year, game_master_id, status)
  values (target_session, target_year, '10000000-0000-4000-8000-000000000004', 'live');

  insert into public.go_force_session_participants (
    session_id, account_id, display_name_snapshot, roster_order
  )
  select target_session, participant.account_id, 'Player', participant.roster_order::integer
  from unnest(array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid
  ]) with ordinality as participant(account_id, roster_order);

  insert into public.go_force_session_games (
    id, session_id, title_snapshot, source_year, display_order
  ) values (target_game, target_session, 'Quorum Test Game', target_year, 1);

  insert into public.go_force_rounds (
    id, session_id, round_number, status, go_limit, started_at, ended_at
  ) values
    (target_round_two, target_session, 2, 'complete', 2, now() - interval '2 minutes', now() - interval '1 minute'),
    (target_round_three, target_session, 3, 'active', 1, now(), null);

  insert into public.go_force_selections (
    id, round_id, session_game_id, selection_order, voting_closed_at, advancement_outcome
  ) values
    (target_selection_two, target_round_two, target_game, 1, now() - interval '1 minute', 'advanced'),
    (target_selection_three, target_round_three, target_game, 1, now(), 'advanced');

  insert into public.go_force_game_votes (
    selection_id, participant_account_id, choice, submitted_at, closed_at
  )
  select target_selection_three,
         participant.account_id,
         case when participant.account_id = any(go_players) then 'go' else 'abstain' end,
         case when participant.account_id = any(go_players) then now() else null end,
         now()
  from public.go_force_session_participants participant
  where participant.session_id = target_session;
end;
$$;

select is(
  (select minimum_round_three_go_voters from public.go_force_page_settings where id = true),
  2,
  'the default Round 3 Go-voter quorum is two'
);
update public.go_force_page_settings set minimum_round_three_go_voters = 3 where id = true;
select is(
  (select minimum_round_three_go_voters from public.go_force_page_settings where id = true),
  3,
  'the Round 3 Go-voter quorum is configurable'
);
update public.go_force_page_settings set minimum_round_three_go_voters = 2 where id = true;

select pg_temp.prepare_round_three_quorum_case(
  '40000000-0000-4000-8000-000000000101',
  2098,
  '60000000-0000-4000-8000-000000000101',
  '70000000-0000-4000-8000-000000000101',
  '70000000-0000-4000-8000-000000000102',
  '80000000-0000-4000-8000-000000000101',
  '80000000-0000-4000-8000-000000000102',
  array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  ]
);
select pg_temp.prepare_round_three_quorum_case(
  '40000000-0000-4000-8000-000000000102',
  2099,
  '60000000-0000-4000-8000-000000000102',
  '70000000-0000-4000-8000-000000000103',
  '70000000-0000-4000-8000-000000000104',
  '80000000-0000-4000-8000-000000000103',
  '80000000-0000-4000-8000-000000000104',
  array['10000000-0000-4000-8000-000000000001'::uuid]
);
select pg_temp.prepare_round_three_quorum_case(
  '40000000-0000-4000-8000-000000000103',
  2100,
  '60000000-0000-4000-8000-000000000103',
  '70000000-0000-4000-8000-000000000105',
  '70000000-0000-4000-8000-000000000106',
  '80000000-0000-4000-8000-000000000105',
  '80000000-0000-4000-8000-000000000106',
  array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid
  ]
);
select pg_temp.prepare_round_three_quorum_case(
  '40000000-0000-4000-8000-000000000104',
  2097,
  '60000000-0000-4000-8000-000000000104',
  '70000000-0000-4000-8000-000000000107',
  '70000000-0000-4000-8000-000000000108',
  '80000000-0000-4000-8000-000000000107',
  '80000000-0000-4000-8000-000000000108',
  array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000002'::uuid,
    '10000000-0000-4000-8000-000000000005'::uuid
  ]
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_close_selection('80000000-0000-4000-8000-000000000102')->>'sessionStatus',
  'final_ballot',
  'Round 3 advances when the default two-player quorum is met'
);
reset role;
insert into public.go_force_final_ballot_votes (
  session_id, participant_account_id, finalist_game_id, submitted_at
) values
  ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000101', now()),
  ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000101', now()),
  ('40000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000101', now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_close_final_ballot('40000000-0000-4000-8000-000000000101')->>'status',
  'complete',
  'final-ballot closure accepts the configured Round 3 quorum while preserving its completion threshold'
);
select is(
  (select vote_completion_percentage from public.go_force_sessions
   where id = '40000000-0000-4000-8000-000000000101'),
  83.33::numeric,
  'the existing final-ballot completion percentage remains in effect'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_close_selection('80000000-0000-4000-8000-000000000104')->>'sessionStatus',
  'incomplete_vote_threshold',
  'Round 3 does not advance below the default quorum'
);
reset role;
update public.go_force_page_settings set minimum_round_three_go_voters = 3 where id = true;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_close_selection('80000000-0000-4000-8000-000000000106')->>'sessionStatus',
  'incomplete_vote_threshold',
  'Round 3 does not advance when it is below a configured quorum of three'
);
select is(
  public.go_force_close_selection('80000000-0000-4000-8000-000000000108')->>'sessionStatus',
  'final_ballot',
  'Round 3 advances when the configured quorum of three is met'
);

reset role;
select throws_ok(
  $$update public.go_force_page_settings
    set minimum_round_three_go_voters = 0 where id = true$$,
  '23514',
  null,
  'the configured Round 3 Go-voter quorum cannot be below one'
);
select throws_ok(
  $$update public.go_force_page_settings
    set minimum_round_three_go_voters = 65 where id = true$$,
  '23514',
  null,
  'the configured Round 3 Go-voter quorum cannot exceed the roster limit'
);

select * from finish();
rollback;
