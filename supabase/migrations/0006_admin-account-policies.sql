-- Role grants and user provisioning are performed with a server-only service-role client.
-- RLS remains the final boundary for authenticated clients; only admins may manage grants.
create policy "only admins manage role grants" on public.account_roles for all to authenticated
using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "admins read every account" on public.accounts for select to authenticated
using (public.has_role('admin'));
