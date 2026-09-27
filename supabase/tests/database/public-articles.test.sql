begin;
select plan(2);
set local role anon;
select results_eq($$select status from public.articles where slug = 'a-new-chapter-for-independent-games'$$, array['published']::text[], 'anonymous sees the seeded published article');
select is_empty($$select id from public.articles where slug = 'private-preview-draft'$$, 'draft is not readable');
select * from finish();
rollback;
