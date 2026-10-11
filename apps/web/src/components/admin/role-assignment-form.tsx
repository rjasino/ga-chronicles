"use client";

import { useActionState } from "react";
import { assignRoles } from "@/features/admin/account-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";

export function RoleAssignmentForm({ accountId, initialRoles }: { accountId: string; initialRoles: string[] }) {
  const [state, action, pending] = useActionState(assignRoles, {});
  return <form action={action} className="role-form"><input type="hidden" name="accountId" value={accountId} /><Checkbox name="roles" value="contributor" defaultChecked={initialRoles.includes("contributor")} label="Contributor" /><Checkbox name="roles" value="moderator" defaultChecked={initialRoles.includes("moderator")} label="Moderator" /><Button purpose="secondary" pending={pending}>Save roles</Button>{state.error && <Message tone="error" className="w-full">{state.error}</Message>}{state.success && <Message tone="success" className="w-full">{state.success}</Message>}</form>;
}
