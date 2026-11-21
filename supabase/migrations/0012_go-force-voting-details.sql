-- Optional game details, cover-art storage, and independently configurable
-- deadlines for round voting and the final ballot.

alter table public.go_force_page_settings
  add column round_voting_seconds integer not null default 10
    constraint go_force_round_voting_seconds_range check (round_voting_seconds between 5 and 600),
  add column final_ballot_seconds integer not null default 10
    constraint go_force_final_ballot_seconds_range check (final_ballot_seconds between 5 and 600);

alter table public.go_force_annual_games
  add column developer text check (developer is null or length(trim(developer)) <= 160),
  add column publisher text check (publisher is null or length(trim(publisher)) <= 160),
  add column genre text check (genre is null or length(trim(genre)) <= 120),
  add column cover_art_url text check (
    cover_art_url is null
    or (length(cover_art_url) <= 2048 and cover_art_url ~* '^https?://')
  );

alter table public.go_force_session_games
  add column developer_snapshot text,
  add column publisher_snapshot text,
  add column genre_snapshot text,
  add column cover_art_url_snapshot text;

alter table public.go_force_sessions
  add column final_ballot_deadline_at timestamptz;

alter table public.go_force_selections
  add column voting_deadline_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'go-force-covers',
  'go-force-covers',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read Go Force covers"
on storage.objects for select to public
using (bucket_id = 'go-force-covers');

create policy "Admins upload Go Force covers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'go-force-covers'
  and public.has_role('admin')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Admins remove Go Force covers"
on storage.objects for delete to authenticated
using (bucket_id = 'go-force-covers' and public.has_role('admin'));

create function public.go_force_snapshot_game_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.annual_game_id is not null then
    select ag.developer, ag.publisher, ag.genre, ag.cover_art_url
    into new.developer_snapshot, new.publisher_snapshot, new.genre_snapshot, new.cover_art_url_snapshot
    from public.go_force_annual_games ag
    where ag.id = new.annual_game_id;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_snapshot_game_details() from public;

create trigger go_force_snapshot_game_details_before_insert
before insert on public.go_force_session_games
for each row execute function public.go_force_snapshot_game_details();

create function public.go_force_set_selection_voting_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  duration_seconds integer;
begin
  select coalesce(settings.round_voting_seconds, 10) into duration_seconds
  from public.go_force_rounds r
  join public.go_force_sessions s on s.id = r.session_id
  left join public.go_force_page_settings settings on settings.id = true
  where r.id = new.round_id;

  new.voting_deadline_at := coalesce(
    new.voting_deadline_at,
    clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10))
  );
  return new;
end;
$$;
revoke all on function public.go_force_set_selection_voting_deadline() from public;

create trigger go_force_selection_voting_deadline_before_insert
before insert on public.go_force_selections
for each row execute function public.go_force_set_selection_voting_deadline();

-- Keep the public status transition responsible for starting the final ballot
-- timer. The round timer is intentionally not used for the final ballot.
create function public.go_force_set_final_ballot_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  duration_seconds integer;
begin
  if new.status = 'final_ballot' and tg_op = 'INSERT' then
    select coalesce(final_ballot_seconds, 10) into duration_seconds
    from public.go_force_page_settings
    where id = true;
    new.final_ballot_deadline_at := clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10));
  elsif new.status = 'final_ballot' and old.status is distinct from new.status then
    select coalesce(final_ballot_seconds, 10) into duration_seconds
    from public.go_force_page_settings
    where id = true;
    new.final_ballot_deadline_at := clock_timestamp() + make_interval(secs => coalesce(duration_seconds, 10));
  elsif new.status <> 'final_ballot' then
    new.final_ballot_deadline_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_set_final_ballot_deadline() from public;

create trigger go_force_session_final_ballot_deadline
before insert or update on public.go_force_sessions
for each row execute function public.go_force_set_final_ballot_deadline();

create function public.go_force_enforce_game_vote_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  deadline_at timestamptz;
begin
  if new.submitted_at is not null then
    select voting_deadline_at into deadline_at
    from public.go_force_selections
    where id = new.selection_id;
    if deadline_at is not null and clock_timestamp() >= deadline_at then
      raise exception 'VOTING_CLOSED';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_enforce_game_vote_deadline() from public;

create trigger go_force_game_vote_deadline_before_insert
before insert on public.go_force_game_votes
for each row execute function public.go_force_enforce_game_vote_deadline();

create function public.go_force_enforce_final_ballot_deadline()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  deadline_at timestamptz;
begin
  if new.submitted_at is not null then
    select final_ballot_deadline_at into deadline_at
    from public.go_force_sessions
    where id = new.session_id;
    if deadline_at is not null and clock_timestamp() >= deadline_at then
      raise exception 'BALLOT_NOT_OPEN';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.go_force_enforce_final_ballot_deadline() from public;

create trigger go_force_final_ballot_deadline_before_insert
before insert on public.go_force_final_ballot_votes
for each row execute function public.go_force_enforce_final_ballot_deadline();

-- Give any rostered participant a safe way to trigger timeout closure after
-- the database deadline; manual early closure remains facilitator-only.
create or replace function public.go_force_close_selection(target_selection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  selection_row public.go_force_selections%rowtype;
  round_row public.go_force_rounds%rowtype;
  session_row public.go_force_sessions%rowtype;
  session_id_value uuid;
  deadline_at timestamptz;
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

create or replace function public.go_force_close_final_ballot(target_session uuid)
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
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED'; end if;

  select * into session_row from public.go_force_sessions where id = target_session for update;
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

create function public.go_force_expire_selection(target_selection uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_id_value uuid;
  deadline_at timestamptz;
begin
  select r.session_id, sel.voting_deadline_at into session_id_value, deadline_at
  from public.go_force_selections sel
  join public.go_force_rounds r on r.id = sel.round_id
  where sel.id = target_selection;
  if session_id_value is null then raise exception 'SELECTION_NOT_FOUND'; end if;
  if auth.uid() is null or not (
    public.go_force_is_facilitator(session_id_value)
    or public.go_force_is_participant(session_id_value)
  ) then raise exception 'NOT_AUTHORIZED'; end if;
  if deadline_at is null or clock_timestamp() < deadline_at then
    raise exception 'TIMER_NOT_EXPIRED';
  end if;

  perform public.go_force_close_selection(target_selection);
  return jsonb_build_object('closed', true);
end;
$$;
revoke all on function public.go_force_expire_selection(uuid) from public;
grant execute on function public.go_force_expire_selection(uuid) to authenticated;

create function public.go_force_expire_final_ballot(target_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  session_row public.go_force_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHORIZED'; end if;
  select * into session_row from public.go_force_sessions where id = target_session;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;
  if not (
    public.go_force_is_facilitator(target_session)
    or public.go_force_is_participant(target_session)
  ) then raise exception 'NOT_AUTHORIZED'; end if;

  if session_row.status <> 'final_ballot' then
    return jsonb_build_object('closed', true);
  end if;
  if session_row.final_ballot_deadline_at is null
     or clock_timestamp() < session_row.final_ballot_deadline_at then
    raise exception 'TIMER_NOT_EXPIRED';
  end if;

  perform public.go_force_close_final_ballot(target_session);
  return jsonb_build_object('closed', true);
end;
$$;
revoke all on function public.go_force_expire_final_ballot(uuid) from public;
grant execute on function public.go_force_expire_final_ballot(uuid) to authenticated;

update public.go_force_selections sel
set voting_deadline_at = clock_timestamp() + make_interval(secs => settings.round_voting_seconds)
from public.go_force_rounds r
join public.go_force_page_settings settings on settings.id = true
where sel.round_id = r.id
  and sel.voting_closed_at is null
  and sel.voting_deadline_at is null;

update public.go_force_sessions
set final_ballot_deadline_at = clock_timestamp() + make_interval(secs => final_ballot_seconds)
where status = 'final_ballot' and final_ballot_deadline_at is null;
