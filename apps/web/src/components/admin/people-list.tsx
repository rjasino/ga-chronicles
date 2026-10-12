import type { ManagedAccountRow } from "@/features/admin/account-actions";
import { RoleAssignmentForm } from "@/components/admin/role-assignment-form";

function rolesLabel(account: ManagedAccountRow): string {
  const roles = account.account_roles.map((grant) => grant.role);
  return roles.length === 0 ? "reader" : roles.join(" + ");
}

/** Renders the People & roles rows with identifying detail and role controls. */
export function PeopleList({ rows }: { rows: ManagedAccountRow[] }) {
  return (
    <ul className="admin-list m-6 list-none border-t border-line p-0">
      {rows.map((account) => (
        <li key={account.id} className="flex items-center justify-between gap-4 border-b border-line p-4 max-[760px]:flex-col max-[760px]:items-start">
          <div className="people-row grid content-start gap-1.5">
            <strong className="people-row__name">{account.username}</strong>
            <span className="people-row__email text-[.85rem] text-muted">{account.email ?? "no email on file"}</span>
            <span className="people-row__status text-[.85rem] text-muted">{account.status}</span>
            <span className="people-row__roles text-[.85rem] font-semibold text-blue">{rolesLabel(account)}</span>
          </div>
          <RoleAssignmentForm accountId={account.id} initialRoles={account.account_roles.map((grant) => grant.role)} />
        </li>
      ))}
    </ul>
  );
}
