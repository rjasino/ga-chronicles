create view public.public_article_bylines as
select story.id as article_id, nullif(trim(acc.display_name), '') as display_name, acc.username
from public.articles story join public.accounts acc on acc.id = story.author_id
where story.status = 'published';
comment on view public.public_article_bylines is 'Public author byline for published articles; exposes only display name and username';
grant select on public.public_article_bylines to anon, authenticated;
