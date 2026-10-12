"use client";

import { useActionState } from "react";
import type { SettingsState } from "@/features/moderation/settings-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

export function CommentSettingsForm({ action, enabled, threshold }: { action: (state: SettingsState, data: FormData) => Promise<SettingsState>; enabled: boolean; threshold: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form className="form-stack settings-form" action={formAction}>
    <Checkbox name="comments_enabled" defaultChecked={enabled} label="Allow new comments" />
    <TextField label="Unique reports needed for moderator action" name="threshold" type="number" min={1} max={1000} defaultValue={threshold} required />
    {state.error && <Message tone="error">{state.error}</Message>}
    {state.success && <Message tone="success">{state.success}</Message>}
    <Button purpose="primary" pending={pending}>Save settings</Button>
  </form>;
}
