insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-covers',
  'article-covers',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read article covers"
on storage.objects for select to public
using (bucket_id = 'article-covers');

create policy "Contributors upload article covers"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-covers'
  and (public.has_role('contributor') or public.has_role('admin'))
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Contributors remove article covers"
on storage.objects for delete to authenticated
using (
  bucket_id = 'article-covers'
  and (
    public.has_role('admin')
    or (public.has_role('contributor') and (storage.foldername(name))[1] = auth.uid()::text)
  )
);
