create extension if not exists pgcrypto with schema extensions;

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(trim(username)) and length(username) between 3 and 32),
  display_name text,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);
comment on column public.accounts.id is 'Stable identifier matching the authentication identity; required and unique';
comment on column public.accounts.username is 'Required, normalized, unique login handle; never treated as a password or authorization claim';
comment on column public.accounts.display_name is 'Optional name shown beside authored comments';
comment on column public.accounts.status is 'Active or disabled; disabled accounts cannot sign in to protected features or create comments/reports';
comment on column public.accounts.created_at is 'Account creation timestamp';

create table public.account_auth_lookup (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  email text not null unique check (email = lower(trim(email)))
);
comment on table public.account_auth_lookup is 'Private server-only mapping from application usernames to Supabase Auth email identities';
alter table public.account_auth_lookup enable row level security;
revoke all on public.account_auth_lookup from public, anon, authenticated;
grant select, insert, update, delete on public.account_auth_lookup to service_role;

create table public.account_roles (
  account_id uuid not null references public.accounts(id) on delete cascade,
  role text not null check (role in ('contributor', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  constraint account_roles_account_id_role_key_key unique (account_id, role)
);

create function public.has_role(required_role text, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.account_roles ar
    join public.accounts a on a.id = ar.account_id
    where ar.account_id = target_user and ar.role = required_role and a.status = 'active'
  );
$$;
revoke all on function public.has_role(text, uuid) from public;
grant execute on function public.has_role(text, uuid) to anon, authenticated;

create table public.articles (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  slug text not null unique check (slug = lower(trim(slug)) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body text not null check (length(trim(body)) > 0),
  type text not null check (type in ('news', 'review', 'commentary/opinion', 'interview')),
  status text not null default 'draft' check (status in ('draft', 'published', 'removed')),
  author_id uuid not null references public.accounts(id),
  cover_image text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft' and published_at is null) or status <> 'draft')
);
comment on column public.articles.id is 'Stable unique identifier';
comment on column public.articles.title is 'Required and non-empty after trimming';
comment on column public.articles.body is 'Required and non-empty after trimming; rendered safely as readable article content';
comment on column public.articles.slug is 'Required, normalized, unique public route identifier';
comment on column public.articles.type is 'One of news, review, commentary/opinion, or interview';
comment on column public.articles.status is 'Draft, published, or removed; only published articles appear publicly';
comment on column public.articles.author_id is 'Required reference to the account that authored the article';
comment on column public.articles.cover_image is 'Optional reference to an associated stored image';
comment on column public.articles.published_at is 'Absent for drafts; set when published and refreshed on republish according to editorial behavior';
comment on column public.articles.created_at is 'Required timestamp';
comment on column public.articles.updated_at is 'Required timestamp';

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger articles_set_updated_at before update on public.articles
for each row execute function public.set_updated_at();

create table public.site_settings (
  id boolean primary key default true check (id),
  comments_enabled boolean not null default true,
  moderation_report_threshold integer not null default 3 check (moderation_report_threshold > 0),
  updated_by uuid references public.accounts(id),
  updated_at timestamptz not null default now()
);
comment on column public.site_settings.comments_enabled is 'Required boolean; when false, new comment submissions are rejected and the public article page explains that comments are off';
comment on column public.site_settings.moderation_report_threshold is 'Required positive integer';
comment on column public.site_settings.updated_by is 'Admin account that last changed the settings';
comment on column public.site_settings.updated_at is 'Timestamp of the latest change';
insert into public.site_settings (id) values (true);
create trigger site_settings_set_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
alter table public.account_roles enable row level security;
alter table public.articles enable row level security;
alter table public.site_settings enable row level security;

create policy "accounts self or admin read" on public.accounts for select to authenticated
using (id = auth.uid() or public.has_role('admin'));
create policy "accounts self update display name" on public.accounts for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy "roles self or admin read" on public.account_roles for select to authenticated
using (account_id = auth.uid() or public.has_role('admin'));
create policy "admin manages roles" on public.account_roles for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));
create policy "author or admin reads articles" on public.articles for select to authenticated
using (author_id = auth.uid() or public.has_role('admin'));
create policy "admin manages settings" on public.site_settings for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

grant select on public.accounts to authenticated;
grant update (display_name) on public.accounts to authenticated;
grant select, insert, update, delete on public.account_roles to authenticated;
grant select, insert, update, delete on public.articles to authenticated;
grant select, update on public.site_settings to authenticated;
grant select on public.site_settings to anon;
