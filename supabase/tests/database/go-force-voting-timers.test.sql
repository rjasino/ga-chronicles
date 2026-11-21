begin;
select plan(15);

create function pg_temp.test_latest_selection(target_session uuid)
returns uuid language sql as $$
  select sel.id
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where r.session_id = target_session
  order by r.round_number desc, sel.selection_order desc
  limit 1;
$$;

insert into public.go_force_annual_games (
  id, goty_year, title, developer, publisher, genre, cover_art_url, eligibility_state, display_order
) values (
  '51000000-0000-4000-8000-000000000091',
  2031,
  'Timer Fixture Game',
  'Fixture Studio',
  'Fixture Publisher',
  'Action',
  'https://example.test/timer-cover.webp',
  'eligible',
  1
);

insert into public.go_force_sessions (id, goty_year, game_master_id, status)
values ('40000000-0000-4000-8000-000000000091', 2031, '10000000-0000-4000-8000-000000000004', 'ready');
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values ('40000000-0000-4000-8000-000000000091', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1);

select is((select round_voting_seconds from public.go_force_page_settings where id = true), 10, 'round vote timer defaults to ten seconds');
select is((select final_ballot_seconds from public.go_force_page_settings where id = true), 10, 'final ballot timer defaults to ten seconds');
update public.go_force_page_settings
set round_voting_seconds = 30, final_ballot_seconds = 45
where id = true;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select public.go_force_start_session('40000000-0000-4000-8000-000000000091');
select is(
  (select developer_snapshot || '|' || publisher_snapshot || '|' || genre_snapshot || '|' || cover_art_url_snapshot
   from public.go_force_session_games where session_id = '40000000-0000-4000-8000-000000000091'),
  'Fixture Studio|Fixture Publisher|Action|https://example.test/timer-cover.webp',
  'starting a session snapshots optional game details and cover art'
);
reset role;
update public.go_force_annual_games
set developer = 'Updated Studio', cover_art_url = 'https://example.test/updated-cover.webp'
where id = '51000000-0000-4000-8000-000000000091';
select is(
  (select developer_snapshot || '|' || cover_art_url_snapshot
   from public.go_force_session_games where session_id = '40000000-0000-4000-8000-000000000091'),
  'Fixture Studio|https://example.test/timer-cover.webp',
  'later annual-game edits do not change a started session snapshot'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);

select public.go_force_draw_selection('40000000-0000-4000-8000-000000000091');
select ok(
  (select voting_deadline_at between clock_timestamp() and clock_timestamp() + interval '30 seconds'
   from public.go_force_selections sel
   join public.go_force_rounds r on r.id = sel.round_id
   where r.session_id = '40000000-0000-4000-8000-000000000091'),
  'drawing a game starts its round-vote deadline'
);
select throws_ok(
  $$select public.go_force_expire_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000091'))$$,
  'P0001',
  'TIMER_NOT_EXPIRED',
  'a client countdown cannot close a vote before the database deadline'
);

reset role;
update public.go_force_selections
set voting_deadline_at = clock_timestamp() - interval '1 second'
where id = pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000091');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_submit_game_vote(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000091'), 'go')$$,
  'P0001',
  'VOTING_CLOSED',
  'the database rejects a game vote after its deadline'
);
select lives_ok(
  $$select public.go_force_expire_selection(pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000091'))$$,
  'a rostered participant can close an expired round vote'
);
select is(
  (select choice from public.go_force_game_votes
   where selection_id = pg_temp.test_latest_selection('40000000-0000-4000-8000-000000000091')),
  'abstain',
  'an expired missing round vote is recorded as an abstention'
);

reset role;
insert into public.go_force_sessions (
  id, goty_year, game_master_id, status
) values (
  '40000000-0000-4000-8000-000000000092',
  2032,
  '10000000-0000-4000-8000-000000000004',
  'final_ballot'
);
insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order)
values ('40000000-0000-4000-8000-000000000092', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1);
insert into public.go_force_session_games (
  id, session_id, annual_game_id, title_snapshot, source_year, display_order
) values (
  '60000000-0000-4000-8000-000000000092',
  '40000000-0000-4000-8000-000000000092',
  '51000000-0000-4000-8000-000000000091',
  'Timer Fixture Game',
  2032,
  1
);
insert into public.go_force_rounds (id, session_id, round_number, status, go_limit)
values
  ('70000000-0000-4000-8000-000000000091', '40000000-0000-4000-8000-000000000092', 1, 'complete', 3),
  ('70000000-0000-4000-8000-000000000092', '40000000-0000-4000-8000-000000000092', 2, 'complete', 2),
  ('70000000-0000-4000-8000-000000000093', '40000000-0000-4000-8000-000000000092', 3, 'complete', 1);
insert into public.go_force_selections (
  id, round_id, session_game_id, selection_order, voting_closed_at, advancement_outcome
) values (
  '80000000-0000-4000-8000-000000000092',
  '70000000-0000-4000-8000-000000000093',
  '60000000-0000-4000-8000-000000000092',
  1,
  clock_timestamp(),
  'advanced'
);

select ok(
  (select final_ballot_deadline_at between clock_timestamp() and clock_timestamp() + interval '45 seconds'
   from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000092'),
  'entering the final ballot starts its separate deadline'
);
update public.go_force_sessions
set final_ballot_deadline_at = null
where id = '40000000-0000-4000-8000-000000000092';
update public.go_force_sessions as session_row
set final_ballot_deadline_at = clock_timestamp() + make_interval(secs => settings.final_ballot_seconds)
from public.go_force_page_settings as settings
where settings.id = true
  and session_row.id = '40000000-0000-4000-8000-000000000092'
  and session_row.status = 'final_ballot'
  and session_row.final_ballot_deadline_at is null;
select ok(
  (select final_ballot_deadline_at between clock_timestamp() and clock_timestamp() + interval '45 seconds'
   from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000092'),
  'the migration-style final ballot deadline backfill reads the settings row'
);
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_expire_final_ballot('40000000-0000-4000-8000-000000000092')$$,
  'P0001',
  'TIMER_NOT_EXPIRED',
  'a final-ballot countdown cannot close before its database deadline'
);
reset role;
update public.go_force_sessions
set final_ballot_deadline_at = clock_timestamp() - interval '1 second'
where id = '40000000-0000-4000-8000-000000000092';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_submit_final_ballot(
    '40000000-0000-4000-8000-000000000092',
    '60000000-0000-4000-8000-000000000092',
    null
  )$$,
  'P0001',
  'BALLOT_NOT_OPEN',
  'the database rejects a final ballot after its deadline'
);
select lives_ok(
  $$select public.go_force_expire_final_ballot('40000000-0000-4000-8000-000000000092')$$,
  'a rostered participant can close an expired final ballot'
);
select is(
  (select status from public.go_force_sessions where id = '40000000-0000-4000-8000-000000000092'),
  'incomplete_vote_threshold',
  'timeout closure preserves the existing incomplete-session rules'
);

select * from finish();
rollback;
