import Link from "next/link";
import { requireAnyRole } from "@/lib/authz/require-role";
import { listManagedAccounts } from "@/features/admin/account-actions";
import { RoleAssignmentForm } from "@/components/admin/role-assignment-form";

export default async function UsersPage() {
  await requireAnyRole(["admin"]);
  const accounts = await listManagedAccounts();
  return <main className="page-shell admin-page"><div className="section-heading"><h1>People & roles</h1><Link className="button-link" href="/admin/users/new">Create internal account</Link></div><ul className="admin-list">{accounts.map((account) => <li key={account.id}><div><strong>{account.username}</strong><span>{account.status}</span><RoleAssignmentForm accountId={account.id} initialRoles={account.account_roles.map((item) => item.role)} /></div></li>)}</ul></main>;
}
