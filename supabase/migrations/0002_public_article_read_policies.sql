create policy "public reads published articles" on public.articles for select to anon, authenticated
using (status = 'published');
grant select on public.articles to anon;
