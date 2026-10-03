-- Inline article body images: reference tracking table and storage bucket.

create table public.article_body_images (
  id uuid primary key default extensions.gen_random_uuid(),
  storage_path text not null check (storage_path <> ''),
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint article_body_images_storage_path_article_key unique (storage_path, article_id)
);
comment on table public.article_body_images is 'Records which storage objects an article body references so replaced or removed inline images can be cleaned up';
comment on column public.article_body_images.storage_path is 'Object path in the article-images bucket referenced by an article body';
comment on column public.article_body_images.article_id is 'Article whose body references this stored image';
comment on column public.article_body_images.created_at is 'Timestamp of the first reference';

alter table public.article_body_images enable row level security;

create policy "authors and admins read their article body images" on public.article_body_images for select to authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (a.author_id = auth.uid() or public.has_role('admin'))
  )
);

create policy "authors and admins manage their article body images" on public.article_body_images for all to authenticated
using (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (a.author_id = auth.uid() or public.has_role('admin'))
  )
)
with check (
  exists (
    select 1 from public.articles a
    where a.id = article_id
      and (a.author_id = auth.uid() or public.has_role('admin'))
  )
);

grant select, insert, update, delete on public.article_body_images to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'article-images',
  'article-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read article body images"
on storage.objects for select to public
using (bucket_id = 'article-images');

create policy "Contributors upload article body images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'article-images'
  and (public.has_role('contributor') or public.has_role('admin'))
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Contributors remove article body images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'article-images'
  and (
    public.has_role('admin')
    or (public.has_role('contributor') and (storage.foldername(name))[1] = auth.uid()::text)
  )
);