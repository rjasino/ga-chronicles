begin;
select plan(26);

select has_table('public', 'go_force_sessions', 'Go Force sessions table exists');
select has_table('public', 'go_force_game_votes', 'Go Force game votes table exists');
select has_table('public', 'go_force_final_ballot_votes', 'Go Force final ballot table exists');
select has_table('public', 'go_force_results', 'Go Force results table exists');
select has_function('public', 'go_force_start_session', array['uuid'], 'session start function exists');
select has_function('public', 'go_force_draw_selection', array['uuid'], 'roulette draw function exists');
select has_function('public', 'go_force_submit_game_vote', array['uuid', 'text'], 'game vote function exists');
select has_function('public', 'go_force_close_selection', array['uuid'], 'selection close function exists');
select has_function('public', 'go_force_submit_final_ballot', array['uuid', 'uuid', 'text'], 'final ballot function exists');
select has_function('public', 'go_force_close_final_ballot', array['uuid'], 'final ballot close function exists');

-- Deterministic session fixtures: reader and contributor are on the roster.
insert into public.go_force_sessions (id, goty_year, game_master_id, status, started_at)
values ('40000000-0000-4000-8000-000000000001', 2026, '10000000-0000-4000-8000-000000000004', 'live', now());
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1),
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Local Contributor', 2);
insert into public.go_force_session_games (id, session_id, title_snapshot, source_year, display_order)
select ('41000000-0000-4000-8000-00000000000' || n)::uuid,
       '40000000-0000-4000-8000-000000000001',
       'Fixture Game ' || n,
       2026,
       n
from generate_series(1, 5) as n;
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at)
values ('42000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 1, 'active', 3, now());
insert into public.go_force_selections (id, round_id, session_game_id, selection_order)
select ('43000000-0000-4000-8000-00000000000' || n)::uuid,
       '42000000-0000-4000-8000-000000000001',
       ('41000000-0000-4000-8000-00000000000' || n)::uuid,
       n
from generate_series(1, 5) as n;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is(
  (select count(*)::integer from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000001'),
  1,
  'roster players can read their session'
);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000001', 'go')->>'choice',
  'go',
  'roster player can submit a go vote through the function'
);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000002', 'go')->>'choice',
  'go',
  'second go vote is accepted'
);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000003', 'no-go')->>'choice',
  'no-go',
  'no-go votes do not spend the go allowance'
);
select is(
  public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000004', 'go')->>'choice',
  'go',
  'third go vote fills the round 1 allowance'
);
select throws_ok(
  $$select public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000005', 'go')$$,
  'P0001',
  'GO_LIMIT_REACHED',
  'a fourth go vote is rejected'
);
select throws_ok(
  $$select public.go_force_submit_game_vote('43000000-0000-4000-8000-000000000001', 'no-go')$$,
  'P0001',
  'VOTE_ALREADY_SUBMITTED',
  'a participant cannot vote twice on the same selection'
);
select throws_ok(
  $$insert into public.go_force_game_votes (selection_id, participant_account_id, choice, submitted_at)
    values ('43000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'go', now())$$,
  '42501',
  null,
  'players cannot bypass the vote function with a direct insert'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is(
  (select count(*)::integer from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000001'),
  0,
  'accounts outside the roster cannot read the session'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select lives_ok(
  $$insert into public.go_force_annual_games (goty_year, title, eligibility_state)
    values (2026, 'Admin Added Game', 'eligible')$$,
  'admins can add annual games'
);
select lives_ok(
  $$update public.go_force_page_settings set page_visible = true where id$$,
  'admins can change the public page visibility'
);

reset role;
set local role anon;
select throws_ok(
  $$insert into public.go_force_annual_games (goty_year, title, eligibility_state)
    values (2026, 'Anonymous Game', 'eligible')$$,
  '42501',
  null,
  'anonymous visitors cannot add annual games'
);
select is(
  (select count(*)::integer from public.go_force_page_settings where id),
  1,
  'anonymous visitors can read the public page setting'
);

reset role;
update public.go_force_sessions set status = 'complete' where id = '40000000-0000-4000-8000-000000000001';
insert into public.go_force_results (session_id, winner_game_ids, final_vote_totals, results_visible, published_at)
values (
  '40000000-0000-4000-8000-000000000001',
  array['41000000-0000-4000-8000-000000000001']::uuid[],
  '{"41000000-0000-4000-8000-000000000001": 1}'::jsonb,
  true,
  now()
);
set local role anon;
select is(
  (select count(*)::integer from public.go_force_results where session_id = '40000000-0000-4000-8000-000000000001'),
  1,
  'anonymous visitors can read published results'
);
select is(
  (select count(*)::integer from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000001'),
  1,
  'anonymous visitors can read a published session record'
);

reset role;
select is(
  (select count(*)::integer from pg_policies where schemaname = 'realtime' and policyname = 'go force session members join private channel'),
  1,
  'private Realtime channel policy exists'
);

select * from finish();
rollback;
