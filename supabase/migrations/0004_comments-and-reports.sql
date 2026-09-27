create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid not null references public.accounts(id),
  body text not null check (length(trim(body)) > 0),
  status text not null default 'visible' check (status in ('visible', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.comments.id is 'Stable unique identifier';
comment on column public.comments.article_id is 'Required reference to a published article';
comment on column public.comments.author_id is 'Required reference to an active signed-in account';
comment on column public.comments.body is 'Required, non-empty after trimming, and rejected/withheld if it contains a blocked term';
comment on column public.comments.status is 'Visible or deleted; a report alone does not change visibility';
comment on column public.comments.created_at is 'Required timestamp';
comment on column public.comments.updated_at is 'Required timestamp';

create table public.reports (
  id uuid primary key default extensions.gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.accounts(id),
  reason text check (reason is null or length(reason) <= 300),
  created_at timestamptz not null default now(),
  constraint reports_comment_id_reporter_id_key unique (comment_id, reporter_id)
);
comment on column public.reports.id is 'Stable unique identifier';
comment on column public.reports.comment_id is 'Required reference to a non-deleted comment';
comment on column public.reports.reporter_id is 'Required reference to an active signed-in account';
comment on column public.reports.reason is 'Optional short category/text if collected by the interface';
comment on column public.reports.created_at is 'Required timestamp';

create table public.blocked_words (
  id uuid primary key default extensions.gen_random_uuid(),
  term text not null unique check (term = lower(trim(term)) and length(term) > 0),
  enabled boolean not null default true
);
comment on column public.blocked_words.id is 'Stable unique identifier';
comment on column public.blocked_words.term is 'Required normalized matching term; unique under the matching normalization rules';
comment on column public.blocked_words.enabled is 'Allows a term to be disabled without deleting history/configuration';
insert into public.blocked_words (term) values ('spoiler') on conflict (term) do nothing;

create function public.validate_comment_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  setting_enabled boolean;
  article_published boolean;
  account_active boolean;
  blocked_term text;
begin
  select comments_enabled into setting_enabled from public.site_settings where id = true;
  if not coalesce(setting_enabled, false) then raise exception 'COMMENTS_DISABLED'; end if;
  select status = 'published' into article_published from public.articles where id = new.article_id;
  if not coalesce(article_published, false) then raise exception 'ARTICLE_UNAVAILABLE'; end if;
  select status = 'active' into account_active from public.accounts where id = new.author_id;
  if new.author_id <> auth.uid() or not coalesce(account_active, false) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
  select term into blocked_term from public.blocked_words
    where enabled and lower(new.body) ~ ('(^|[^[:alnum:]_])' || term || '([^[:alnum:]_]|$)') limit 1;
  if blocked_term is not null then raise exception 'COMMENT_BLOCKED'; end if;
  return new;
end;
$$;
create trigger comments_validate_submission before insert on public.comments
for each row execute function public.validate_comment_submission();
create trigger comments_set_updated_at before update on public.comments
for each row execute function public.set_updated_at();

alter table public.comments enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_words enable row level security;

create policy "read visible comments" on public.comments for select to anon, authenticated
using (status = 'visible' and exists (select 1 from public.articles a where a.id = article_id and a.status = 'published'));
create policy "active readers create comments" on public.comments for insert to authenticated
with check (author_id = auth.uid() and status = 'visible');
create policy "active readers report visible comments" on public.reports for insert to authenticated
with check (
  reporter_id = auth.uid()
  and exists (select 1 from public.comments c where c.id = comment_id and c.status = 'visible')
  and exists (select 1 from public.accounts a where a.id = auth.uid() and a.status = 'active')
);
create policy "moderators review reports" on public.reports for select to authenticated
using (public.has_role('moderator') or public.has_role('admin'));
create policy "no blocked-word client access" on public.blocked_words for select to authenticated
using (false);

create view public.public_comments as
select c.id, c.article_id, c.body, c.created_at, a.display_name
from public.comments c join public.accounts a on a.id = c.author_id
join public.articles story on story.id = c.article_id
where c.status = 'visible' and story.status = 'published';
create view public.public_comment_settings as
select comments_enabled from public.site_settings where id = true;
grant select on public.public_comments, public.public_comment_settings to anon, authenticated;

grant select on public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
grant select, insert on public.reports to authenticated;
