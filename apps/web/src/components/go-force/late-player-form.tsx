"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { Select } from "@/components/ui/text-field";
import {
  addGoForceParticipant,
  type SessionActionState,
} from "@/features/go-force/session-actions";
import { useGoForceLocalMutation } from "@/components/go-force/use-local-mutation";
import type { ActiveGoForceAccountOption } from "@/features/go-force/types";

export function LatePlayerForm({
  sessionId,
  accounts,
  participantCount,
}: {
  sessionId: string;
  accounts: ActiveGoForceAccountOption[];
  participantCount: number;
}) {
  const [state, action, pending] = useActionState(
    addGoForceParticipant,
    {} satisfies SessionActionState,
  );
  const onSubmit = useGoForceLocalMutation(pending);

  if (participantCount >= 64) {
    return (
      <p className="m-0 text-muted">This session already has the maximum number of players.</p>
    );
  }
  if (accounts.length === 0) {
    return <p className="m-0 text-muted">No active accounts are available to add.</p>;
  }

  return (
    <form className="form-stack mt-4" action={action} onSubmit={onSubmit}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <Select label="Player to add" name="accountId" required defaultValue="">
        <option value="" disabled>
          Choose a player
        </option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.display_name?.trim()
              ? `${account.display_name} (${account.username})`
              : account.username}
          </option>
        ))}
      </Select>
      {state.error && <Message tone="error">{state.error}</Message>}
      {state.success && <Message tone="success">{state.success}</Message>}
      <Button purpose="secondary" pending={pending}>
        Add player
      </Button>
    </form>
  );
}
