begin;
select plan(11);

create function pg_temp.test_latest_selection(target_session uuid)
returns uuid language sql as $$
  select sel.id
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where r.session_id = target_session
  order by r.round_number desc, sel.selection_order desc
  limit 1;
$$;

create function pg_temp.test_active_round(target_session uuid)
returns integer language sql as $$
  select round_number from public.go_force_rounds
  where session_id = target_session and status = 'active'
  order by round_number desc limit 1;
$$;

insert into public.go_force_annual_games (id, goty_year, title, eligibility_state, display_order)
select ('51000000-0000-4000-8000-00000000000' || n)::uuid,
       2030,
       'Flow Fixture ' || n,
       'eligible',
       n
from generate_series(1, 4) as n;

insert into public.go_force_sessions (id, goty_year, game_master_id, status)
values ('40000000-0000-4000-8000-000000000099', 2030, '10000000-0000-4000-8000-000000000004', 'ready');
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values ('40000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_start_session('40000000-0000-4000-8000-000000000099')->>'status',
  'live',
  'the game master can start a ready session'
);
select is(
  (select count(*)::integer from public.go_force_session_games where session_id = '40000000-0000-4000-8000-000000000099'),
  4,
  'starting freezes every eligible game into the session snapshot'
);
select is(pg_temp.test_active_round('40000000-0000-4000-8000-000000000099'), 1, 'round 1 is active');

-- Round 1: three go votes and one no-go.
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'no-go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select is(pg_temp.test_active_round('40000000-0000-4000-8000-000000000099'), 2, 'round 1 closes into round 2');
select is(
  (select count(*)::integer from public.go_force_selections sel join public.go_force_rounds r on r.id = sel.round_id
   where r.session_id = '40000000-0000-4000-8000-000000000099' and r.round_number = 1 and sel.advancement_outcome = 'advanced'),
  3,
  'only games with a go vote advance to round 2'
);

-- Round 2: two go votes and one no-go.
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'no-go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select is(pg_temp.test_active_round('40000000-0000-4000-8000-000000000099'), 3, 'round 2 closes into round 3');

-- Round 3: exactly one go vote.
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));
select public.go_force_draw_selection('40000000-0000-4000-8000-000000000099');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'), 'no-go');
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_close_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000099'));

select is(
  (select status from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000099'),
  'final_ballot',
  'a completed round 3 with every go spent opens the final ballot'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.go_force_submit_final_ballot(
    '40000000-0000-4000-8000-000000000099',
    (select sel.session_game_id from public.go_force_selections sel
     join public.go_force_rounds r on r.id = sel.round_id
     where r.session_id = '40000000-0000-4000-8000-000000000099' and r.round_number = 3
       and sel.advancement_outcome = 'advanced' limit 1),
    'A final remark'
  )$$,
  'a roster player can submit a final ballot'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is(
  public.go_force_close_final_ballot('40000000-0000-4000-8000-000000000099')->>'status',
  'complete',
  'closing the final ballot completes a fully submitted session'
);
select is(
  (select vote_completion_percentage from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000099'),
  100.00::numeric,
  'the completed session records 100 percent vote completion'
);
select is(
  (select cardinality(winner_game_ids) from public.go_force_results where session_id = '40000000-0000-4000-8000-000000000099'),
  1,
  'the final ballot records one GOTY winner'
);

select * from finish();
rollback;
