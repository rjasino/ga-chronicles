revoke update on public.comments from authenticated;

create function public.moderate_comment(target_comment_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_status text;
  report_total integer;
  threshold integer;
  is_admin boolean;
begin
  if auth.uid() is null or not (public.has_role('moderator') or public.has_role('admin')) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select status into current_status from public.comments where id = target_comment_id for update;
  if not found then return false; end if;
  if current_status = 'deleted' then return false; end if;
  select count(distinct reporter_id)::integer into report_total from public.reports where comment_id = target_comment_id;
  select moderation_report_threshold into threshold from public.site_settings where id = true;
  is_admin := public.has_role('admin');
  if report_total = 0 or (not is_admin and report_total < threshold) then raise exception 'THRESHOLD_NOT_MET'; end if;
  update public.comments set status = 'deleted' where id = target_comment_id;
  return true;
end;
$$;
revoke all on function public.moderate_comment(uuid) from public;
grant execute on function public.moderate_comment(uuid) to authenticated;

create function public.moderate_article(target_article_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  current_status text;
begin
  if auth.uid() is null or not (public.has_role('moderator') or public.has_role('admin')) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  select status into current_status from public.articles where id = target_article_id for update;
  if not found or current_status = 'removed' then return false; end if;
  if current_status <> 'published' and not public.has_role('admin') then raise exception 'NOT_AUTHORIZED'; end if;
  update public.articles set status = 'removed' where id = target_article_id;
  return true;
end;
$$;
revoke all on function public.moderate_article(uuid) from public;
grant execute on function public.moderate_article(uuid) to authenticated;

create policy "admins update settings" on public.site_settings for update to authenticated
using (public.has_role('admin')) with check (public.has_role('admin') and moderation_report_threshold > 0);
