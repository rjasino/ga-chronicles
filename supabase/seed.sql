-- Deterministic local-only identities. Password is intentionally a disposable local fixture.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reader@example.test', crypt('local-reader-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'contributor@example.test', crypt('local-contributor-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'moderator@example.test', crypt('local-moderator-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'admin@example.test', crypt('local-admin-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'editor-moderator@example.test', crypt('local-multi-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now()
from auth.users where id between '10000000-0000-4000-8000-000000000001'::uuid and '10000000-0000-4000-8000-000000000005'::uuid
on conflict (provider_id, provider) do nothing;

insert into public.accounts (id, username, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'localreader', 'Local Reader'),
  ('10000000-0000-4000-8000-000000000002', 'localcontributor', 'Local Contributor'),
  ('10000000-0000-4000-8000-000000000003', 'localmoderator', 'Local Moderator'),
  ('10000000-0000-4000-8000-000000000004', 'localadmin', 'Local Admin'),
  ('10000000-0000-4000-8000-000000000005', 'localmulti', 'Local Multi-role')
on conflict (id) do nothing;

insert into public.account_auth_lookup (account_id, email) values
  ('10000000-0000-4000-8000-000000000001', 'reader@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'contributor@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'moderator@example.test'),
  ('10000000-0000-4000-8000-000000000004', 'admin@example.test'),
  ('10000000-0000-4000-8000-000000000005', 'editor-moderator@example.test')
on conflict (account_id) do nothing;

insert into public.account_roles (account_id, role) values
  ('10000000-0000-4000-8000-000000000002', 'contributor'),
  ('10000000-0000-4000-8000-000000000003', 'moderator'),
  ('10000000-0000-4000-8000-000000000004', 'admin'),
  ('10000000-0000-4000-8000-000000000005', 'contributor'),
  ('10000000-0000-4000-8000-000000000005', 'moderator')
on conflict do nothing;

insert into public.articles (id, title, slug, body, type, status, author_id, cover_image, published_at) values
  ('20000000-0000-4000-8000-000000000001', 'A new chapter for independent games', 'a-new-chapter-for-independent-games', $legacy$A launch-week field note on the small teams making big worlds.

The best independent games invite us to look closer. This week, we are following the makers who are building places worth getting lost in.$legacy$, 'news', 'published', '10000000-0000-4000-8000-000000000002', '/brand/launch-article-cover.svg', now()),
  ('20000000-0000-4000-8000-000000000002', 'Private preview draft', 'private-preview-draft', $legacy$This unpublished preview must never appear on the public site.$legacy$, 'commentary/opinion', 'draft', '10000000-0000-4000-8000-000000000002', null, null),
  ('20000000-0000-4000-8000-000000000003', 'A rich reading room for sketchers', 'a-rich-reading-room', $body$<h2>Small teams, big worlds</h2><p>A <strong>launch-week</strong> field note with <em>emphasis</em>, a list, and an inline image.</p><ul><li>One point</li><li>Two points</li></ul><blockquote>Sketches first, engines later.</blockquote><p>An inline sketch:<br><img src="http://127.0.0.1:3000/brand/richtext-inline-image.svg" alt="Inline sketch fixture" /></p>$body$, 'review', 'published', '10000000-0000-4000-8000-000000000002', null, now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Deterministic test users so the admin "People & roles" list has more than
-- one page of results right after `npx supabase db reset`, and role/status
-- filters have seeded data to exercise. Every statement below is idempotent:
-- ids are derived from the series index (stable across runs) and each insert
-- uses ON CONFLICT DO NOTHING, so re-running the seed never duplicates rows.
--
--   testuser01..30  readers (active; testuser30 intentionally has no email on file)
--   testuser31..32  contributors (active)
--   testuser33      admin (active)
--   testuser34..35  moderators (active)
--   testuser36      reader (disabled)
--
-- With the five base accounts below this yields 41 people -> 3 pages at 20 per page.
-- ---------------------------------------------------------------------------

with batch as (
  select i,
         ('00000000-0000-4000-8000-' || substr(md5('seed.testuser.' || i), 1, 12))::uuid as uid
  from generate_series(1, 36) as i
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000',
  b.uid,
  'authenticated',
  'authenticated',
  'testuser' || lpad(b.i::text, 2, '0') || '@example.test',
  crypt('test-user-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', '', '', ''
from batch b
on conflict (id) do nothing;

with batch as (
  select i,
         ('00000000-0000-4000-8000-' || substr(md5('seed.testuser.' || i), 1, 12))::uuid as uid
  from generate_series(1, 36) as i
)
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
select b.uid::text, b.uid,
       jsonb_build_object('sub', b.uid::text, 'email', 'testuser' || lpad(b.i::text, 2, '0') || '@example.test'),
       'email', now(), now()
from batch b
on conflict (provider_id, provider) do nothing;

with batch as (
  select i,
         ('00000000-0000-4000-8000-' || substr(md5('seed.testuser.' || i), 1, 12))::uuid as uid
  from generate_series(1, 36) as i
)
insert into public.accounts (id, username, display_name, status)
select b.uid,
       'testuser' || lpad(b.i::text, 2, '0'),
       'Seed Test User ' || b.i,
       case when b.i = 36 then 'disabled' else 'active' end
from batch b
on conflict (id) do nothing;

with batch as (
  select i,
         ('00000000-0000-4000-8000-' || substr(md5('seed.testuser.' || i), 1, 12))::uuid as uid
  from generate_series(1, 36) as i
)
insert into public.account_auth_lookup (account_id, email)
select b.uid, 'testuser' || lpad(b.i::text, 2, '0') || '@example.test'
from batch b
where b.i <> 30 -- testuser30 has no auth-lookup row: exercises the "no email on file" state
on conflict (account_id) do nothing;

with batch as (
  select i,
         ('00000000-0000-4000-8000-' || substr(md5('seed.testuser.' || i), 1, 12))::uuid as uid
  from generate_series(1, 36) as i
)
insert into public.account_roles (account_id, role)
select b.uid, grants.role
from batch b
cross join lateral (
  values
    (case when b.i between 31 and 32 then 'contributor' end),
    (case when b.i between 34 and 35 then 'moderator' end),
    (case when b.i = 33 then 'admin' end)
) as grants(role)
where grants.role is not null
on conflict (account_id, role) do nothing;

-- Go Force GOTY local content. The page starts visible so the admin, session,
-- and results journeys have deterministic annual-list fixtures after a reset.
insert into public.go_force_page_settings (id, page_visible) values (true, true)
on conflict (id) do update set page_visible = excluded.page_visible;

insert into public.go_force_annual_games (id, goty_year, title, eligibility_state, display_order) values
  ('50000000-0000-4000-8000-000000000001', 2026, 'Hades II', 'eligible', 1),
  ('50000000-0000-4000-8000-000000000002', 2026, 'Balatro', 'eligible', 2),
  ('50000000-0000-4000-8000-000000000003', 2026, 'Animal Well', 'eligible', 3),
  ('50000000-0000-4000-8000-000000000004', 2026, 'Neva', 'eligible', 4),
  ('50000000-0000-4000-8000-000000000005', 2025, 'Past Year Pick', 'ineligible', 1),
  ('50000000-0000-4000-8000-000000000006', 2029, 'Accessibility Fixture One', 'eligible', 1),
  ('50000000-0000-4000-8000-000000000007', 2029, 'Accessibility Fixture Two', 'eligible', 2)
on conflict (id) do nothing;

-- Completed Go Force fixture for results-page journeys. The result starts hidden
-- so the admin publication toggle can be exercised end to end.
insert into public.go_force_sessions (id, goty_year, game_master_id, status, started_at, completed_at, vote_completion_percentage)
values ('60000000-0000-4000-8000-000000000001', 2025, '10000000-0000-4000-8000-000000000004', 'complete', now() - interval '2 days', now() - interval '2 days', 100)
on conflict (id) do nothing;

insert into public.go_force_session_participants (session_id, account_id, display_name_snapshot, roster_order) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Local Reader', 1),
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Local Contributor', 2)
on conflict (session_id, account_id) do nothing;

insert into public.go_force_session_games (id, session_id, title_snapshot, source_year, display_order) values
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'E2E Past Winner', 2025, 1),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 'E2E Runner Up', 2025, 2)
on conflict (id) do nothing;

insert into public.go_force_rounds (id, session_id, round_number, status, go_limit, started_at, ended_at) values
  ('62000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 1, 'complete', 3, now() - interval '2 days', now() - interval '2 days'),
  ('62000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 2, 'complete', 2, now() - interval '2 days', now() - interval '2 days'),
  ('62000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', 3, 'complete', 1, now() - interval '2 days', now() - interval '2 days')
on conflict (id) do nothing;

insert into public.go_force_selections (id, round_id, session_game_id, selection_order, selected_at, voting_closed_at, advancement_outcome) values
  ('63000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 1, now() - interval '2 days', now() - interval '2 days', 'advanced'),
  ('63000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 2, now() - interval '2 days', now() - interval '2 days', 'advanced'),
  ('63000000-0000-4000-8000-000000000003', '62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 1, now() - interval '2 days', now() - interval '2 days', 'advanced'),
  ('63000000-0000-4000-8000-000000000004', '62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000002', 2, now() - interval '2 days', now() - interval '2 days', 'eliminated'),
  ('63000000-0000-4000-8000-000000000005', '62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001', 1, now() - interval '2 days', now() - interval '2 days', 'advanced'),
  ('63000000-0000-4000-8000-000000000006', '62000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000002', 2, now() - interval '2 days', now() - interval '2 days', 'eliminated')
on conflict (id) do nothing;

insert into public.go_force_game_votes (selection_id, participant_account_id, choice, submitted_at, closed_at) values
  ('63000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'no-go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'no-go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'no-go', now() - interval '2 days', now() - interval '2 days'),
  ('63000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'no-go', now() - interval '2 days', now() - interval '2 days')
on conflict (selection_id, participant_account_id) do nothing;

insert into public.go_force_final_ballot_votes (session_id, participant_account_id, finalist_game_id, remark, submitted_at, closed_at) values
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'A year-defining world.', now() - interval '2 days', now() - interval '2 days'),
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'The one I kept replaying.', now() - interval '2 days', now() - interval '2 days')
on conflict (session_id, participant_account_id) do nothing;

insert into public.go_force_results (id, session_id, winner_game_ids, final_vote_totals, results_visible, published_at) values
  ('64000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', array['61000000-0000-4000-8000-000000000001']::uuid[], '{"61000000-0000-4000-8000-000000000001": 2}'::jsonb, false, null)
on conflict (session_id) do nothing;
