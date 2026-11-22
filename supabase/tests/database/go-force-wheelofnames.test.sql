begin;
select plan(17);

select has_function(
  'public',
  'go_force_commit_selection',
  array['uuid', 'uuid'],
  'the candidate-specific selection function exists'
);
select hasnt_function(
  'public',
  'go_force_draw_selection',
  array['uuid'],
  'the random-selection function is removed'
);

insert into public.go_force_annual_games (
  id, goty_year, title, eligibility_state, display_order
) values
  ('51000000-0000-4000-8000-000000000091', 2036, 'Wheel Annual Game 1', 'eligible', 1),
  ('51000000-0000-4000-8000-000000000092', 2036, 'Wheel Annual Game 2', 'eligible', 2),
  ('51000000-0000-4000-8000-000000000093', 2036, 'Wheel Annual Game 3', 'eligible', 3);

insert into public.go_force_sessions (id, goty_year, game_master_id, status)
values ('40000000-0000-4000-8000-000000000093', 2036, '10000000-0000-4000-8000-000000000002', 'live');
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values ('40000000-0000-4000-8000-000000000093', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1);
insert into public.go_force_session_games (
  id, session_id, annual_game_id, title_snapshot, source_year, display_order
) values
  ('60000000-0000-4000-8000-000000000091', '40000000-0000-4000-8000-000000000093', '51000000-0000-4000-8000-000000000091', 'Wheel Annual Game 1', 2036, 1),
  ('60000000-0000-4000-8000-000000000092', '40000000-0000-4000-8000-000000000093', '51000000-0000-4000-8000-000000000092', 'Wheel Annual Game 2', 2036, 2),
  ('60000000-0000-4000-8000-000000000093', '40000000-0000-4000-8000-000000000093', '51000000-0000-4000-8000-000000000093', 'Wheel Annual Game 3', 2036, 3);
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at)
values ('70000000-0000-4000-8000-000000000091', '40000000-0000-4000-8000-000000000093', 1, 'active', 3, now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000091'
  )->>'title',
  'Wheel Annual Game 1',
  'the committed winner maps to the session game snapshot title'
);
select is(
  (select selection_order from public.go_force_selections
   where round_id = '70000000-0000-4000-8000-000000000091'
     and session_game_id = '60000000-0000-4000-8000-000000000091'),
  1,
  'the first committed selection gets a positive order'
);
select is(
  (select count(*)::integer from public.go_force_selections
   where round_id = '70000000-0000-4000-8000-000000000091'
     and voting_closed_at is null),
  1,
  'the committed selection opens exactly one ballot'
);
select throws_ok(
  $$select public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000092'
  )$$,
  'P0001',
  'OPEN_BALLOT',
  'another winner cannot be committed while the current ballot is open'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000092'
  )$$,
  'P0001',
  'NOT_AUTHORIZED',
  'a rostered non-facilitator cannot commit a draw'
);

reset role;
update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'advanced'
where round_id = '70000000-0000-4000-8000-000000000091'
  and session_game_id = '60000000-0000-4000-8000-000000000091';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000092'
  )->>'title',
  'Wheel Annual Game 2',
  'the facilitator can commit the next eligible game after the prior ballot closes'
);
select is(
  (select selection_order from public.go_force_selections
   where round_id = '70000000-0000-4000-8000-000000000091'
     and session_game_id = '60000000-0000-4000-8000-000000000092'),
  2,
  'selection orders increase within a round'
);

reset role;
update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'eliminated'
where round_id = '70000000-0000-4000-8000-000000000091'
  and session_game_id = '60000000-0000-4000-8000-000000000092';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000091'
  )$$,
  'P0001',
  'GAME_ALREADY_SELECTED',
  'a game cannot be selected twice in the same round'
);
select is(
  (select eligibility_state from public.go_force_annual_games
   where id = '51000000-0000-4000-8000-000000000091'),
  'eligible',
  'selecting a game leaves its annual eligibility unchanged'
);
select is(
  (select count(*)::integer from public.go_force_annual_games
   where id = '51000000-0000-4000-8000-000000000091'),
  1,
  'the annual source game is not deleted by a selection'
);
select is(
  (select title_snapshot from public.go_force_session_games
   where id = '60000000-0000-4000-8000-000000000091'),
  'Wheel Annual Game 1',
  'the selected session snapshot remains unchanged'
);

reset role;
update public.go_force_rounds
set status = 'complete', ended_at = now()
where id = '70000000-0000-4000-8000-000000000091';
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at)
values ('70000000-0000-4000-8000-000000000092', '40000000-0000-4000-8000-000000000093', 2, 'active', 2, now());
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000091'
  )->>'title',
  'Wheel Annual Game 1',
  'an advanced session game can be selected again in a later round'
);
select is(
  (select selection_order from public.go_force_selections
   where round_id = '70000000-0000-4000-8000-000000000092'
     and session_game_id = '60000000-0000-4000-8000-000000000091'),
  1,
  'selection order starts independently in the next round'
);

reset role;
update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'advanced'
where round_id = '70000000-0000-4000-8000-000000000092'
  and session_game_id = '60000000-0000-4000-8000-000000000091';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000092'
  )$$,
  'P0001',
  'GAME_NOT_ELIGIBLE',
  'a game that did not advance is not eligible in the next round'
);
select throws_ok(
  $$select public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000093',
    '60000000-0000-4000-8000-000000000091'
  )$$,
  'P0001',
  'GAME_ALREADY_SELECTED',
  'a later-round game also cannot be selected twice in that round'
);

select * from finish();
rollback;
