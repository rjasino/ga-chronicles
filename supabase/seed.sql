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
  ('20000000-0000-4000-8000-000000000001', 'A new chapter for independent games', 'a-new-chapter-for-independent-games', 'A launch-week field note on the small teams making big worlds.\n\nThe best independent games invite us to look closer. This week, we are following the makers who are building places worth getting lost in.', 'news', 'published', '10000000-0000-4000-8000-000000000002', '/brand/launch-article-cover.svg', now()),
  ('20000000-0000-4000-8000-000000000002', 'Private preview draft', 'private-preview-draft', 'This unpublished preview must never appear on the public site.', 'commentary/opinion', 'draft', '10000000-0000-4000-8000-000000000002', null, null)
on conflict (id) do nothing;
