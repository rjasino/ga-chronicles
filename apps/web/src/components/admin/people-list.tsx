import type { ManagedAccountRow } from "@/features/admin/account-actions";
import { RoleAssignmentForm } from "@/components/admin/role-assignment-form";

function rolesLabel(account: ManagedAccountRow): string {
  const roles = account.account_roles.map((grant) => grant.role);
  return roles.length === 0 ? "reader" : roles.join(" + ");
}

/** Renders the People & roles rows with identifying detail and role controls. */
export function PeopleList({ rows }: { rows: ManagedAccountRow[] }) {
  return (
    <ul className="admin-list">
      {rows.map((account) => (
        <li key={account.id}>
          <div className="people-row">
            <strong className="people-row__name">{account.username}</strong>
            <span className="people-row__email">{account.email ?? "no email on file"}</span>
            <span className="people-row__status">{account.status}</span>
            <span className="people-row__roles">{rolesLabel(account)}</span>
          </div>
          <RoleAssignmentForm accountId={account.id} initialRoles={account.account_roles.map((grant) => grant.role)} />
        </li>
      ))}
    </ul>
  );
}