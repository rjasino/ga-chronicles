begin;
select plan(3);
select columns_are('public', 'public_article_bylines', array['article_id', 'display_name', 'username'], 'byline view exposes only article_id, display_name, and username');
select is_empty($$select 1 from public.public_article_bylines b join public.articles a on a.id = b.article_id where a.slug = 'private-preview-draft'$$, 'draft article has no public byline');
set local role anon;
select isnt_empty($$select article_id from public.public_article_bylines$$, 'anonymous readers can read published article bylines');
select * from finish();
rollback;
