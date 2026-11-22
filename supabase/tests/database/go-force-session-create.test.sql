begin;
select plan(8);

select has_function(
  'public',
  'go_force_create_session',
  array['integer', 'uuid[]'],
  'atomic session creation function exists'
);

create temporary table created_sessions (id uuid);
grant insert, select on pg_temp.created_sessions to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select lives_ok(
  $$insert into pg_temp.created_sessions
    select public.go_force_create_session(
      2096,
      array[
        '10000000-0000-4000-8000-000000000001'::uuid,
        '10000000-0000-4000-8000-000000000002'::uuid
      ]
    )$$,
  'admins can atomically create a session and roster'
);
select is(
  (select count(*)::integer
   from public.go_force_sessions s
   join pg_temp.created_sessions c on c.id = s.id
   where s.status = 'ready' and s.game_master_id = auth.uid()),
  1,
  'the new session is ready and owned by the admin'
);
select is(
  (select count(*)::integer
   from public.go_force_session_participants p
   join pg_temp.created_sessions c on c.id = p.session_id),
  2,
  'both selected accounts are inserted into the roster'
);
select is(
  (select string_agg(p.display_name_snapshot, ', ' order by p.roster_order)
   from public.go_force_session_participants p
   join pg_temp.created_sessions c on c.id = p.session_id),
  'Local Reader, Local Contributor',
  'the roster snapshots display names in the requested order'
);

reset role;
update public.accounts set display_name = repeat('x', 81)
where id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select throws_ok(
  $$select public.go_force_create_session(
      2097,
      array['10000000-0000-4000-8000-000000000001'::uuid]
    )$$,
  '23514',
  null,
  'a roster insert failure aborts session creation'
);
select is(
  (select count(*)::integer from public.go_force_sessions where goty_year = 2097),
  0,
  'a failed roster insert leaves no orphan session'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select throws_ok(
  $$select public.go_force_create_session(
      2098,
      array['10000000-0000-4000-8000-000000000001'::uuid]
    )$$,
  'P0001',
  'NOT_AUTHORIZED',
  'non-admin users cannot create sessions'
);

select * from finish();
rollback;
