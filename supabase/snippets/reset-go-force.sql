begin;

-- Remove ballots first: finalist_game_id restricts deleting session game snapshots.
delete from public.go_force_final_ballot_votes;

-- Deleting sessions cascades to their participants, game snapshots,
-- rounds, selections, game votes, and results.
delete from public.go_force_sessions;

-- Remove the annual game list after its session snapshots are gone.
delete from public.go_force_annual_games;

-- These counts should both be zero.
select
  (select count(*) from public.go_force_annual_games) as annual_games_remaining,
  (select count(*) from public.go_force_sessions) as sessions_remaining;

commit;