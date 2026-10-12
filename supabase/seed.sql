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
