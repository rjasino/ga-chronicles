-- Go Force GOTY: admin-managed annual games, fixed session snapshots, live rounds,
-- ballots, results, and private Realtime channel access.

create table public.go_force_page_settings (
  id boolean primary key default true check (id),
  page_visible boolean not null default false,
  updated_by uuid references public.accounts(id),
  updated_at timestamptz not null default now()
);
comment on column public.go_force_page_settings.page_visible is 'Controls whether the public Go Force page is visible; active sessions remain reachable.';
insert into public.go_force_page_settings (id) values (true) on conflict (id) do nothing;
create trigger go_force_page_settings_set_updated_at before update on public.go_force_page_settings
for each row execute function public.set_updated_at();

create table public.go_force_annual_games (
  id uuid primary key default extensions.gen_random_uuid(),
  goty_year integer not null check (goty_year between 2000 and 2100),
  title text not null check (length(trim(title)) between 1 and 200),
  eligibility_state text not null default 'eligible' check (eligibility_state in ('eligible', 'ineligible')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.go_force_annual_games.title is 'Required, non-empty game title; only eligible entries can start a session.';
comment on column public.go_force_annual_games.eligibility_state is 'Eligible entries can be snapshotted into a new session; ineligible entries remain admin content.';
create unique index go_force_annual_games_year_title_key on public.go_force_annual_games (goty_year, lower(trim(title)));
create index go_force_annual_games_year_order_idx on public.go_force_annual_games (goty_year, display_order, title);
create trigger go_force_annual_games_set_updated_at before update on public.go_force_annual_games
for each row execute function public.set_updated_at();

create table public.go_force_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  goty_year integer not null check (goty_year between 2000 and 2100),
  game_master_id uuid not null references public.accounts(id),
  status text not null default 'ready' check (status in ('ready', 'live', 'final_ballot', 'complete', 'stopped_no_finalists', 'incomplete_vote_threshold')),
  started_at timestamptz,
  completed_at timestamptz,
  vote_completion_percentage numeric(5, 2) check (vote_completion_percentage between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.go_force_sessions.status is 'ready, live, final_ballot, complete, stopped_no_finalists, or incomplete_vote_threshold; the roster and game list are frozen after start.';
create unique index go_force_one_active_session_per_year on public.go_force_sessions (goty_year)
where status in ('ready', 'live', 'final_ballot');
create index go_force_sessions_year_idx on public.go_force_sessions (goty_year, created_at desc);
create trigger go_force_sessions_set_updated_at before update on public.go_force_sessions
for each row execute function public.set_updated_at();

create table public.go_force_session_participants (
  session_id uuid not null references public.go_force_sessions(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  display_name_snapshot text not null check (length(trim(display_name_snapshot)) between 1 and 80),
  roster_order integer not null check (roster_order > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (session_id, account_id),
  constraint go_force_participants_roster_order_key unique (session_id, roster_order)
);
comment on column public.go_force_session_participants.display_name_snapshot is 'Display-name snapshot captured at roster confirmation; an account appears at most once per session.';
create index go_force_participants_account_idx on public.go_force_session_participants (account_id);

create table public.go_force_session_games (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.go_force_sessions(id) on delete cascade,
  annual_game_id uuid references public.go_force_annual_games(id) on delete set null,
  title_snapshot text not null check (length(trim(title_snapshot)) between 1 and 200),
  source_year integer not null check (source_year between 2000 and 2100),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now()
);
comment on column public.go_force_session_games.title_snapshot is 'Immutable title captured when the session starts; later annual-list edits do not change it.';
create unique index go_force_session_games_annual_key on public.go_force_session_games (session_id, annual_game_id)
where annual_game_id is not null;
create unique index go_force_session_games_title_key on public.go_force_session_games (session_id, title_snapshot);
create index go_force_session_games_session_idx on public.go_force_session_games (session_id, display_order);

create table public.go_force_rounds (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.go_force_sessions(id) on delete cascade,
  round_number integer not null check (round_number between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'active', 'complete')),
  go_limit integer not null check (go_limit between 1 and 3),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint go_force_rounds_number_key unique (session_id, round_number),
  constraint go_force_rounds_go_limit_matches_number check (go_limit = 4 - round_number)
);
comment on column public.go_force_rounds.go_limit is 'Maximum go votes per participant: three in round 1, two in round 2, one in round 3.';
create index go_force_rounds_session_idx on public.go_force_rounds (session_id, round_number);

create table public.go_force_selections (
  id uuid primary key default extensions.gen_random_uuid(),
  round_id uuid not null references public.go_force_rounds(id) on delete cascade,
  session_game_id uuid not null references public.go_force_session_games(id) on delete cascade,
  selection_order integer not null check (selection_order > 0),
  selected_at timestamptz not null default now(),
  voting_closed_at timestamptz,
  advancement_outcome text not null default 'pending' check (advancement_outcome in ('pending', 'advanced', 'eliminated')),
  constraint go_force_selections_game_key unique (round_id, session_game_id),
  constraint go_force_selections_order_key unique (round_id, selection_order)
);
comment on column public.go_force_selections.advancement_outcome is 'A title advances when at least one participant votes go; a game is selected at most once per round.';
create index go_force_selections_round_idx on public.go_force_selections (round_id, selection_order);

create table public.go_force_game_votes (
  id uuid primary key default extensions.gen_random_uuid(),
  selection_id uuid not null references public.go_force_selections(id) on delete cascade,
  participant_account_id uuid not null references public.accounts(id) on delete cascade,
  choice text not null check (choice in ('go', 'no-go', 'abstain')),
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint go_force_game_votes_selection_participant_key unique (selection_id, participant_account_id)
);
comment on column public.go_force_game_votes.choice is 'One go, no-go, or abstain per participant per selected game; go is quota-limited per round.';
comment on column public.go_force_game_votes.submitted_at is 'Set only when the participant submitted the vote; missing votes are recorded as abstentions at close and keep this null.';
create index go_force_game_votes_participant_idx on public.go_force_game_votes (participant_account_id);

create table public.go_force_final_ballot_votes (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.go_force_sessions(id) on delete cascade,
  participant_account_id uuid not null references public.accounts(id) on delete cascade,
  finalist_game_id uuid references public.go_force_session_games(id) on delete restrict,
  remark text check (remark is null or length(remark) <= 500),
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint go_force_final_ballot_session_participant_key unique (session_id, participant_account_id),
  constraint go_force_final_ballot_abstention_shape check (
    (finalist_game_id is not null and submitted_at is not null)
    or (finalist_game_id is null and submitted_at is null)
  )
);
comment on column public.go_force_final_ballot_votes.remark is 'Optional remark shown with the submitted finalist vote on the results page.';
comment on column public.go_force_final_ballot_votes.submitted_at is 'Null for a missing ballot, which becomes an abstention at close.';
create index go_force_final_ballot_session_idx on public.go_force_final_ballot_votes (session_id);

create table public.go_force_results (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null unique references public.go_force_sessions(id) on delete cascade,
  winner_game_ids uuid[] not null check (cardinality(winner_game_ids) > 0),
  final_vote_totals jsonb not null default '{}'::jsonb,
  results_visible boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.go_force_results.winner_game_ids is 'One or more GOTY winners; every title tied for the highest final-ballot count is a co-winner.';
comment on column public.go_force_results.results_visible is 'Admin-controlled publication state for the separate results page.';
create trigger go_force_results_set_updated_at before update on public.go_force_results
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers. Security-definer functions keep RLS policies narrow and
-- avoid recursive policy evaluation between sessions, participants, and votes.
-- ---------------------------------------------------------------------------

create function public.go_force_is_facilitator(target_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin')
    or exists (
      select 1 from public.go_force_sessions s
      where s.id = target_session and s.game_master_id = auth.uid()
    );
$$;
revoke all on function public.go_force_is_facilitator(uuid) from public;
grant execute on function public.go_force_is_facilitator(uuid) to anon, authenticated;

create function public.go_force_is_participant(target_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.go_force_session_participants p
    where p.session_id = target_session and p.account_id = auth.uid() and p.active
  );
$$;
revoke all on function public.go_force_is_participant(uuid) from public;
grant execute on function public.go_force_is_participant(uuid) to anon, authenticated;

create function public.go_force_can_access_session(target_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.go_force_is_facilitator(target_session)
    or public.go_force_is_participant(target_session);
$$;
revoke all on function public.go_force_can_access_session(uuid) from public;
grant execute on function public.go_force_can_access_session(uuid) to anon, authenticated;

create function public.go_force_session_for_selection(target_selection uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select r.session_id
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;
$$;
revoke all on function public.go_force_session_for_selection(uuid) from public;
grant execute on function public.go_force_session_for_selection(uuid) to anon, authenticated;

create function public.go_force_public_results_ready(target_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.go_force_results res
    join public.go_force_sessions s on s.id = res.session_id
    where res.session_id = target_session and res.results_visible and s.status = 'complete'
  );
$$;
revoke all on function public.go_force_public_results_ready(uuid) from public;
grant execute on function public.go_force_public_results_ready(uuid) to anon, authenticated;

create function public.go_force_selection_is_public(target_selection uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.go_force_selections sel
    where sel.id = target_selection and sel.voting_closed_at is not null
  )
  and public.go_force_public_results_ready(public.go_force_session_for_selection(target_selection));
$$;
revoke all on function public.go_force_selection_is_public(uuid) from public;
grant execute on function public.go_force_selection_is_public(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security.
-- ---------------------------------------------------------------------------

alter table public.go_force_page_settings enable row level security;
alter table public.go_force_annual_games enable row level security;
alter table public.go_force_sessions enable row level security;
alter table public.go_force_session_participants enable row level security;
alter table public.go_force_session_games enable row level security;
alter table public.go_force_rounds enable row level security;
alter table public.go_force_selections enable row level security;
alter table public.go_force_game_votes enable row level security;
alter table public.go_force_final_ballot_votes enable row level security;
alter table public.go_force_results enable row level security;

create policy "go force page settings are public" on public.go_force_page_settings for select to anon, authenticated using (true);
create policy "admins manage go force page settings" on public.go_force_page_settings for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "public reads eligible annual games" on public.go_force_annual_games for select to anon, authenticated
using (eligibility_state = 'eligible');
create policy "admins manage annual games" on public.go_force_annual_games for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "session members read sessions" on public.go_force_sessions for select to authenticated
using (public.go_force_can_access_session(id));
create policy "public reads published sessions" on public.go_force_sessions for select to anon
using (public.go_force_public_results_ready(id));
create policy "admins manage sessions" on public.go_force_sessions for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "session members read roster" on public.go_force_session_participants for select to authenticated
using (public.go_force_can_access_session(session_id));
create policy "public reads published roster" on public.go_force_session_participants for select to anon
using (public.go_force_public_results_ready(session_id));
create policy "admins manage roster before start" on public.go_force_session_participants for all to authenticated
using (public.has_role('admin') and exists (
  select 1 from public.go_force_sessions s where s.id = session_id and s.status = 'ready'
))
with check (public.has_role('admin') and exists (
  select 1 from public.go_force_sessions s where s.id = session_id and s.status = 'ready'
));

create policy "session members read game snapshots" on public.go_force_session_games for select to authenticated
using (public.go_force_can_access_session(session_id));
create policy "public reads published game snapshots" on public.go_force_session_games for select to anon
using (public.go_force_public_results_ready(session_id));
create policy "session members read rounds" on public.go_force_rounds for select to authenticated
using (public.go_force_can_access_session(session_id));
create policy "public reads published rounds" on public.go_force_rounds for select to anon
using (public.go_force_public_results_ready(session_id));
create policy "session members read selections" on public.go_force_selections for select to authenticated
using (public.go_force_can_access_session(public.go_force_session_for_selection(id)));
create policy "public reads published selections" on public.go_force_selections for select to anon
using (public.go_force_public_results_ready(public.go_force_session_for_selection(id)));

create policy "participants read own game votes" on public.go_force_game_votes for select to anon, authenticated
using (
  participant_account_id = auth.uid()
  or public.go_force_is_facilitator(public.go_force_session_for_selection(selection_id))
  or public.go_force_selection_is_public(selection_id)
);

create policy "participants read own final ballot" on public.go_force_final_ballot_votes for select to anon, authenticated
using (
  participant_account_id = auth.uid()
  or public.go_force_is_facilitator(session_id)
  or public.go_force_public_results_ready(session_id)
);

create policy "public reads published results" on public.go_force_results for select to anon, authenticated
using (results_visible or public.go_force_is_facilitator(session_id));
create policy "admins manage results visibility" on public.go_force_results for update to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

-- Private Realtime Broadcast: only session members and the facilitator may join
-- the session topic. Vote rows are persisted before an update is broadcast.
create policy "go force session members join private channel" on realtime.messages for select to authenticated
using (
  (select realtime.topic()) ~ '^go-force:session:[0-9a-f-]{36}$'
  and public.go_force_can_access_session(split_part((select realtime.topic()), ':', 3)::uuid)
);

-- ---------------------------------------------------------------------------
-- Grants. Mutations that must stay consistent go through the functions below.
-- ---------------------------------------------------------------------------

grant select on public.go_force_page_settings to anon, authenticated;
grant insert, update, delete on public.go_force_page_settings to authenticated;
grant select on public.go_force_annual_games to anon, authenticated;
grant insert, update, delete on public.go_force_annual_games to authenticated;
grant select, insert, update, delete on public.go_force_sessions to authenticated;
grant select on public.go_force_sessions to anon;
grant select, insert, update, delete on public.go_force_session_participants to authenticated;
grant select on public.go_force_session_participants to anon;
grant select on public.go_force_session_games to authenticated;
grant select on public.go_force_session_games to anon;
grant select on public.go_force_rounds to authenticated;
grant select on public.go_force_rounds to anon;
grant select on public.go_force_selections to authenticated;
grant select on public.go_force_selections to anon;
grant select on public.go_force_game_votes to anon, authenticated;
grant select on public.go_force_final_ballot_votes to anon, authenticated;
grant select on public.go_force_results to anon, authenticated;
grant update on public.go_force_results to authenticated;

-- ---------------------------------------------------------------------------
-- Session transitions.
-- ---------------------------------------------------------------------------

create function public.go_force_start_session(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target public.go_force_sessions%rowtype;
  roster_count integer;
  game_count integer;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into target from public.go_force_sessions where id = target_session for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if target.status <> 'ready' then raise exception 'SESSION_NOT_READY'; end if;

  select count(*) into roster_count
  from public.go_force_session_participants
  where session_id = target_session and active;
  if roster_count = 0 then raise exception 'EMPTY_ROSTER'; end if;

  select count(*) into game_count
  from public.go_force_annual_games
  where goty_year = target.goty_year and eligibility_state = 'eligible';
  if game_count = 0 then raise exception 'NO_ELIGIBLE_GAMES'; end if;

  insert into public.go_force_session_games (session_id, annual_game_id, title_snapshot, source_year, display_order)
  select target_session, ag.id, ag.title, ag.goty_year,
         row_number() over (order by ag.display_order, lower(ag.title))::integer
  from public.go_force_annual_games ag
  where ag.goty_year = target.goty_year and ag.eligibility_state = 'eligible';

  update public.go_force_sessions
  set status = 'live', started_at = now()
  where id = target_session;

  insert into public.go_force_rounds (session_id, round_number, status, go_limit, started_at)
  values (target_session, 1, 'active', 3, now());

  return jsonb_build_object('status', 'live', 'round', 1, 'roster', roster_count, 'games', game_count);
end;
$$;
revoke all on function public.go_force_start_session(uuid) from public;
grant execute on function public.go_force_start_session(uuid) to authenticated;

create function public.go_force_draw_selection(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target public.go_force_sessions%rowtype;
  active_round public.go_force_rounds%rowtype;
  chosen_game uuid;
  chosen_title text;
  next_order integer;
  new_selection uuid;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select * into target from public.go_force_sessions where id = target_session for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if target.status <> 'live' then raise exception 'SESSION_NOT_LIVE'; end if;

  select * into active_round from public.go_force_rounds
  where session_id = target_session and status = 'active'
  order by round_number desc limit 1 for update;
  if not found then raise exception 'NO_ACTIVE_ROUND'; end if;

  select sg.id, sg.title_snapshot into chosen_game, chosen_title
  from public.go_force_session_games sg
  where sg.session_id = target_session
    and (
      active_round.round_number = 1
      or exists (
        select 1
        from public.go_force_selections prior_sel
        join public.go_force_rounds prior_round on prior_round.id = prior_sel.round_id
        where prior_round.session_id = target_session
          and prior_round.round_number = active_round.round_number - 1
          and prior_sel.session_game_id = sg.id
          and prior_sel.advancement_outcome = 'advanced'
      )
    )
    and not exists (
      select 1 from public.go_force_selections sel
      where sel.round_id = active_round.id and sel.session_game_id = sg.id
    )
  order by random()
  limit 1;

  if chosen_game is null then raise exception 'ROUND_EXHAUSTED'; end if;

  select coalesce(max(selection_order), 0) + 1 into next_order
  from public.go_force_selections where round_id = active_round.id;

  insert into public.go_force_selections (round_id, session_game_id, selection_order)
  values (active_round.id, chosen_game, next_order)
  returning id into new_selection;

  return jsonb_build_object(
    'selectionId', new_selection,
    'gameId', chosen_game,
    'title', chosen_title,
    'selectionOrder', next_order,
    'round', active_round.round_number
  );
end;
$$;
revoke all on function public.go_force_draw_selection(uuid) from public;
grant execute on function public.go_force_draw_selection(uuid) to authenticated;

create function public.go_force_submit_game_vote(target_selection uuid, vote_choice text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selection_row public.go_force_selections%rowtype;
  round_row public.go_force_rounds%rowtype;
  session_row public.go_force_sessions%rowtype;
  used_go integer;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED'; end if;
  if vote_choice not in ('go', 'no-go') then raise exception 'INVALID_CHOICE'; end if;

  select * into selection_row from public.go_force_selections where id = target_selection for update;
  if not found then raise exception 'SELECTION_NOT_FOUND'; end if;
  select * into round_row from public.go_force_rounds where id = selection_row.round_id;
  select * into session_row from public.go_force_sessions where id = round_row.session_id;

  if session_row.status <> 'live' then raise exception 'SESSION_NOT_LIVE'; end if;
  if round_row.status <> 'active' then raise exception 'ROUND_NOT_ACTIVE'; end if;
  if selection_row.voting_closed_at is not null then raise exception 'VOTING_CLOSED'; end if;
  if not public.go_force_is_participant(session_row.id) then raise exception 'NOT_A_PARTICIPANT'; end if;
  if exists (
    select 1 from public.go_force_game_votes v
    where v.selection_id = target_selection and v.participant_account_id = auth.uid()
  ) then raise exception 'VOTE_ALREADY_SUBMITTED'; end if;

  if vote_choice = 'go' then
    select count(*) into used_go
    from public.go_force_game_votes v
    join public.go_force_selections sel on sel.id = v.selection_id
    where sel.round_id = round_row.id
      and v.participant_account_id = auth.uid()
      and v.choice = 'go'
      and v.submitted_at is not null;
    if used_go >= round_row.go_limit then raise exception 'GO_LIMIT_REACHED'; end if;
  end if;

  insert into public.go_force_game_votes (selection_id, participant_account_id, choice, submitted_at)
  values (target_selection, auth.uid(), vote_choice, now());

  return jsonb_build_object('selectionId', target_selection, 'choice', vote_choice);
end;
$$;
revoke all on function public.go_force_submit_game_vote(uuid, text) from public;
grant execute on function public.go_force_submit_game_vote(uuid, text) to authenticated;

create function public.go_force_close_selection(target_selection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selection_row public.go_force_selections%rowtype;
  round_row public.go_force_rounds%rowtype;
  session_row public.go_force_sessions%rowtype;
  session_id_value uuid;
  go_count integer;
  pool_size integer;
  selected_count integer;
  advanced_count integer;
  new_status text;
  new_round_number integer;
  next_go_limit integer;
  next_status text;
  missing_go integer;
begin
  select r.session_id into session_id_value
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;

  if session_id_value is null then raise exception 'SELECTION_NOT_FOUND'; end if;
  if auth.uid() is null or not public.go_force_is_facilitator(session_id_value) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into session_row from public.go_force_sessions where id = session_id_value for update;
  select * into selection_row from public.go_force_selections where id = target_selection for update;
  select * into round_row from public.go_force_rounds where id = selection_row.round_id for update;

  if selection_row.voting_closed_at is not null and round_row.status = 'complete' then
    select count(*) into go_count
    from public.go_force_game_votes
    where selection_id = target_selection and choice = 'go';
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
    insert into public.go_force_game_votes (selection_id, participant_account_id, choice, closed_at)
    select target_selection, p.account_id, 'abstain', now()
    from public.go_force_session_participants p
    where p.session_id = session_row.id and p.active
      and not exists (
        select 1 from public.go_force_game_votes v
        where v.selection_id = target_selection and v.participant_account_id = p.account_id
      );

    update public.go_force_game_votes
    set closed_at = now()
    where selection_id = target_selection and closed_at is null;

    select count(*) into go_count
    from public.go_force_game_votes
    where selection_id = target_selection and choice = 'go';

    update public.go_force_selections
    set voting_closed_at = now(),
        advancement_outcome = case when go_count > 0 then 'advanced' else 'eliminated' end
    where id = target_selection
    returning * into selection_row;
  end if;

  select count(*) into go_count
  from public.go_force_game_votes
  where selection_id = target_selection and choice = 'go';

  -- The round pool is every session game in round 1 and only prior-round
  -- advancing games in rounds 2 and 3.
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

  update public.go_force_rounds set status = 'complete', ended_at = now() where id = round_row.id;

  select count(*) into advanced_count
  from public.go_force_selections
  where round_id = round_row.id and advancement_outcome = 'advanced';

  new_status := session_row.status;
  if round_row.round_number < 3 then
    if advanced_count = 0 then
      new_status := 'stopped_no_finalists';
      update public.go_force_sessions
      set status = new_status, completed_at = now(), vote_completion_percentage = 0
      where id = session_row.id;
    else
      new_round_number := round_row.round_number + 1;
      next_go_limit := 4 - new_round_number;
      insert into public.go_force_rounds (session_id, round_number, status, go_limit, started_at)
      values (session_row.id, new_round_number, 'active', next_go_limit, now());
      new_status := session_row.status;
    end if;
  else
    if advanced_count = 0 then
      new_status := 'stopped_no_finalists';
      update public.go_force_sessions
      set status = new_status, completed_at = now(), vote_completion_percentage = 0
      where id = session_row.id;
    else
      select count(*) into missing_go
      from public.go_force_session_participants p
      where p.session_id = session_row.id and p.active
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
        set status = new_status, completed_at = now()
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
    'nextRound', case when round_row.round_number < 3 and advanced_count > 0 then round_row.round_number + 1 else null end
  );
end;
$$;
revoke all on function public.go_force_close_selection(uuid) from public;
grant execute on function public.go_force_close_selection(uuid) to authenticated;

create function public.go_force_submit_final_ballot(target_session uuid, target_game uuid, target_remark text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
  clean_remark text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED'; end if;
  select * into session_row from public.go_force_sessions where id = target_session for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if session_row.status <> 'final_ballot' then raise exception 'BALLOT_NOT_OPEN'; end if;
  if not public.go_force_is_participant(target_session) then raise exception 'NOT_A_PARTICIPANT'; end if;

  if not exists (
    select 1
    from public.go_force_selections sel
    join public.go_force_rounds r on r.id = sel.round_id
    where r.session_id = target_session
      and r.round_number = 3
      and sel.session_game_id = target_game
      and sel.advancement_outcome = 'advanced'
  ) then raise exception 'NOT_A_FINALIST'; end if;

  if exists (
    select 1 from public.go_force_final_ballot_votes v
    where v.session_id = target_session and v.participant_account_id = auth.uid()
  ) then raise exception 'BALLOT_ALREADY_SUBMITTED'; end if;

  clean_remark := nullif(trim(coalesce(target_remark, '')), '');
  if clean_remark is not null and length(clean_remark) > 500 then
    raise exception 'REMARK_TOO_LONG';
  end if;

  insert into public.go_force_final_ballot_votes (
    session_id, participant_account_id, finalist_game_id, remark, submitted_at
  ) values (target_session, auth.uid(), target_game, clean_remark, now());

  return jsonb_build_object('sessionId', target_session, 'finalistGameId', target_game);
end;
$$;
revoke all on function public.go_force_submit_final_ballot(uuid, uuid, text) from public;
grant execute on function public.go_force_submit_final_ballot(uuid, uuid, text) to authenticated;

create function public.go_force_close_final_ballot(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
  roster_count integer;
  selection_count integer;
  expected_total integer;
  submitted_total integer;
  completion numeric(5, 2);
  round_three_go_complete boolean;
  winner_ids uuid[];
  tally jsonb;
  new_status text;
begin
  if auth.uid() is null or not public.go_force_is_facilitator(target_session) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into session_row from public.go_force_sessions where id = target_session for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if session_row.status <> 'final_ballot' then raise exception 'BALLOT_NOT_OPEN'; end if;

  insert into public.go_force_final_ballot_votes (session_id, participant_account_id, finalist_game_id, remark, closed_at)
  select target_session, p.account_id, null, null, now()
  from public.go_force_session_participants p
  where p.session_id = target_session and p.active
    and not exists (
      select 1 from public.go_force_final_ballot_votes v
      where v.session_id = target_session and v.participant_account_id = p.account_id
    );

  update public.go_force_final_ballot_votes
  set closed_at = now()
  where session_id = target_session and closed_at is null;

  select count(*) into roster_count
  from public.go_force_session_participants
  where session_id = target_session and active;

  select count(*) into selection_count
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where r.session_id = target_session;

  expected_total := roster_count * selection_count + roster_count;
  select count(*) into submitted_total
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
    where p.session_id = target_session and p.active
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
    where session_id = target_session and submitted_at is not null and finalist_game_id is not null
    group by finalist_game_id
  ) counts;

  select coalesce(array_agg(finalist_game_id), '{}'::uuid[]) into winner_ids
  from (
    select finalist_game_id, count(*) as total
    from public.go_force_final_ballot_votes
    where session_id = target_session and submitted_at is not null and finalist_game_id is not null
    group by finalist_game_id
    having count(*) = (
      select max(inner_counts.total)
      from (
        select count(*) as total
        from public.go_force_final_ballot_votes
        where session_id = target_session and submitted_at is not null and finalist_game_id is not null
        group by finalist_game_id
      ) inner_counts
    )
  ) winners;

  if completion >= 80 and round_three_go_complete and cardinality(winner_ids) > 0 then
    new_status := 'complete';
    update public.go_force_sessions
    set status = new_status, completed_at = now(), vote_completion_percentage = completion
    where id = target_session;

    insert into public.go_force_results (session_id, winner_game_ids, final_vote_totals)
    values (target_session, winner_ids, tally)
    on conflict (session_id) do update
    set winner_game_ids = excluded.winner_game_ids,
        final_vote_totals = excluded.final_vote_totals;
  else
    new_status := 'incomplete_vote_threshold';
    update public.go_force_sessions
    set status = new_status, completed_at = now(), vote_completion_percentage = completion
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
