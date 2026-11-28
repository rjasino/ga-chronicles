begin;
select plan(16);

select has_function(
  'public',
  'go_force_set_wheel_fallback',
  array['uuid', 'boolean'],
  'go_force_set_wheel_fallback function exists'
);
select has_function(
  'public',
  'go_force_draw_fallback_selection',
  array['uuid'],
  'go_force_draw_fallback_selection function exists'
);
select has_table(
  'public',
  'go_force_round_fallback_queues',
  'fallback queue storage table exists'
);
select ok(
  not has_table_privilege('anon', 'public.go_force_round_fallback_queues', 'select'),
  'anonymous clients cannot read fallback queues'
);
select ok(
  not has_table_privilege('authenticated', 'public.go_force_round_fallback_queues', 'select'),
  'authenticated clients cannot read fallback queues'
);

insert into public.go_force_annual_games (
  id, goty_year, title, eligibility_state, display_order
) values
  ('51000000-0000-4000-8000-000000000191', 2037, 'Fallback Game 1', 'eligible', 1),
  ('51000000-0000-4000-8000-000000000192', 2037, 'Fallback Game 2', 'eligible', 2),
  ('51000000-0000-4000-8000-000000000193', 2037, 'Fallback Game 3', 'eligible', 3);

insert into public.go_force_sessions (id, goty_year, game_master_id, status, wheel_fallback_enabled)
values ('40000000-0000-4000-8000-000000000193', 2037, '10000000-0000-4000-8000-000000000002', 'ready', false);
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values ('40000000-0000-4000-8000-000000000193', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1);
insert into public.go_force_session_games (
  id, session_id, annual_game_id, title_snapshot, source_year, display_order
) values
  ('60000000-0000-4000-8000-000000000191', '40000000-0000-4000-8000-000000000193', '51000000-0000-4000-8000-000000000191', 'Fallback Game 1', 2037, 1),
  ('60000000-0000-4000-8000-000000000192', '40000000-0000-4000-8000-000000000193', '51000000-0000-4000-8000-000000000192', 'Fallback Game 2', 2037, 2),
  ('60000000-0000-4000-8000-000000000193', '40000000-0000-4000-8000-000000000193', '51000000-0000-4000-8000-000000000193', 'Fallback Game 3', 2037, 3);

-- Non-facilitator cannot toggle fallback mode
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_set_wheel_fallback('40000000-0000-4000-8000-000000000193', true)$$,
  'P0001',
  'NOT_AUTHORIZED',
  'non-facilitator cannot toggle wheel fallback'
);

-- Facilitator can toggle fallback mode before session starts (ready)
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.go_force_set_wheel_fallback('40000000-0000-4000-8000-000000000193', true),
  true,
  'facilitator can enable wheel fallback while session is ready'
);

-- Move session to live and create active round 1
reset role;
update public.go_force_sessions
set status = 'live', started_at = now()
where id = '40000000-0000-4000-8000-000000000193';
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at)
values ('70000000-0000-4000-8000-000000000191', '40000000-0000-4000-8000-000000000193', 1, 'active', 3, now());

-- Facilitator can toggle fallback mode mid-game (live)
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  public.go_force_set_wheel_fallback('40000000-0000-4000-8000-000000000193', false),
  false,
  'facilitator can disable wheel fallback while session is live'
);

-- Draw 1 game via Wheel of Names commit first
select is(
  public.go_force_commit_selection(
    '40000000-0000-4000-8000-000000000193',
    '60000000-0000-4000-8000-000000000191'
  )->>'title',
  'Fallback Game 1',
  'Wheel of Names selection commits first game'
);

-- Cannot draw fallback while ballot is open
select throws_ok(
  $$select public.go_force_draw_fallback_selection('40000000-0000-4000-8000-000000000193')$$,
  'P0001',
  'OPEN_BALLOT',
  'fallback draw is blocked while a ballot is open'
);

-- Close first ballot, then draw remaining 2 games via fallback
reset role;
update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'advanced'
where round_id = '70000000-0000-4000-8000-000000000191'
  and session_game_id = '60000000-0000-4000-8000-000000000191';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (public.go_force_draw_fallback_selection('40000000-0000-4000-8000-000000000193')->>'selectionOrder')::integer,
  2,
  'first fallback draw gets selectionOrder 2'
);

reset role;
select is(
  cardinality((
    select remaining_game_ids
    from public.go_force_round_fallback_queues
    where round_id = '70000000-0000-4000-8000-000000000191'
  )),
  1,
  'fallback_queue has 1 remaining game after popping 1 of 2 remaining'
);

update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'eliminated'
where round_id = '70000000-0000-4000-8000-000000000191'
  and selection_order = 2;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is(
  (public.go_force_draw_fallback_selection('40000000-0000-4000-8000-000000000193')->>'selectionOrder')::integer,
  3,
  'second fallback draw gets selectionOrder 3'
);

reset role;
select is(
  (select count(distinct session_game_id)::integer from public.go_force_selections where round_id = '70000000-0000-4000-8000-000000000191'),
  3,
  'all 3 games were drawn without duplicates'
);

update public.go_force_selections
set voting_closed_at = now(), advancement_outcome = 'eliminated'
where round_id = '70000000-0000-4000-8000-000000000191'
  and selection_order = 3;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.go_force_draw_fallback_selection('40000000-0000-4000-8000-000000000193')$$,
  'P0001',
  'ROUND_EXHAUSTED',
  'fallback draw raises ROUND_EXHAUSTED when no remaining games exist'
);

-- Non-facilitator cannot draw fallback
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_draw_fallback_selection('40000000-0000-4000-8000-000000000193')$$,
  'P0001',
  'NOT_AUTHORIZED',
  'non-facilitator cannot trigger fallback draw'
);

select * from finish();
rollback;
