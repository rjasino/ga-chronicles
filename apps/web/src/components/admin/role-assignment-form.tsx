"use client";

import { useActionState } from "react";
import { assignRoles } from "@/features/admin/account-actions";

export function RoleAssignmentForm({ accountId, initialRoles }: { accountId: string; initialRoles: string[] }) {
  const [state, action, pending] = useActionState(assignRoles, {});
  return <form action={action} className="role-form"><input type="hidden" name="accountId" value={accountId} /><label className="check-label"><input type="checkbox" name="roles" value="contributor" defaultChecked={initialRoles.includes("contributor")} /> Contributor</label><label className="check-label"><input type="checkbox" name="roles" value="moderator" defaultChecked={initialRoles.includes("moderator")} /> Moderator</label><button className="button-secondary" disabled={pending}>Save roles</button>{state.error && <span role="alert">{state.error}</span>}{state.success && <span role="status">{state.success}</span>}</form>;
}
