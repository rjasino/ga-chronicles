create policy "contributors create their articles" on public.articles for insert to authenticated
with check (
  author_id = auth.uid()
  and (public.has_role('contributor') or public.has_role('admin'))
  and status in ('draft', 'published')
);
create policy "contributors edit their articles" on public.articles for update to authenticated
using (
  (author_id = auth.uid() and (public.has_role('contributor') or public.has_role('admin')))
  or public.has_role('admin')
)
with check (
  (author_id = auth.uid() and (public.has_role('contributor') or public.has_role('admin')))
  or public.has_role('admin')
);

create function public.prepare_article_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at = now();
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;
create trigger articles_prepare_publication before insert or update of status on public.articles
for each row execute function public.prepare_article_publication();
