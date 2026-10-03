begin;
select plan(12);

-- Table and uniqueness
select has_table('public', 'article_body_images', 'article_body_images table exists');
insert into public.article_body_images (storage_path, article_id)
values ('shared/one.png', '20000000-0000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.article_body_images (storage_path, article_id) values ('shared/one.png', '20000000-0000-4000-8000-000000000001')$$,
  '23505',
  null,
  'the same storage path for the same article is rejected'
);

-- Bucket configuration
select ok(
  (select public and file_size_limit = 10485760
      and 'image/jpeg' = any(allowed_mime_types)
      and 'image/png' = any(allowed_mime_types)
      and 'image/webp' = any(allowed_mime_types)
   from storage.buckets where id = 'article-images'),
  'article-images bucket is public with a 10 MiB limit and JPEG/PNG/WebP allowed'
);

-- Anonymous cannot manage references
set local role anon;
select throws_ok(
  $$insert into public.article_body_images (storage_path, article_id) values ('anon/one.png', '20000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'anonymous cannot insert body image references'
);
select lives_ok(
  $$select count(*) from public.article_body_images$$,
  'anonymous can query references (RLS returns none)'
);
reset role;

-- Contributor author can manage references for their own article
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$insert into public.article_body_images (storage_path, article_id) values ('10000000-0000-4000-8000-000000000002/a.png', '20000000-0000-4000-8000-000000000001')$$,
  'the article author can insert body image references'
);

-- Moderator-only account cannot manage references for a contributor article
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$insert into public.article_body_images (storage_path, article_id) values ('10000000-0000-4000-8000-000000000003/b.png', '20000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'moderator-only account cannot insert references for a contributor article'
);

-- Admin can manage references for any article
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select lives_ok(
  $$insert into public.article_body_images (storage_path, article_id) values ('10000000-0000-4000-8000-000000000004/admin.png', '20000000-0000-4000-8000-000000000001')$$,
  'admin can insert body image references for any article'
);

-- Storage bucket: public reads, authorized uploads only under the actor folder
set local role anon;
select lives_ok(
  $$select count(*) from storage.objects where bucket_id = 'article-images'$$,
  'anonymous can read the article-images bucket'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata) values ('article-images', 'anon-inline.png', null, '{"mimetype":"image/png","size":1}'::jsonb)$$,
  '42501',
  null,
  'anonymous cannot upload body images'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata) values ('article-images', '10000000-0000-4000-8000-000000000002/c.png', auth.uid(), '{"mimetype":"image/png","size":1}'::jsonb)$$,
  'contributor can upload under their own user folder'
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner, metadata) values ('article-images', '10000000-0000-4000-8000-000000000003/d.png', auth.uid(), '{"mimetype":"image/png","size":1}'::jsonb)$$,
  '42501',
  null,
  'moderator-only account cannot upload body images'
);

select * from finish();
rollback;