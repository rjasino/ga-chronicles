"use client";

import { useActionState } from "react";
import type { SettingsState } from "@/features/moderation/settings-actions";

export function CommentSettingsForm({ action, enabled, threshold }: { action: (state: SettingsState, data: FormData) => Promise<SettingsState>; enabled: boolean; threshold: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <form className="form-stack settings-form" action={formAction}><label className="check-label"><input type="checkbox" name="comments_enabled" defaultChecked={enabled} /> Allow new comments</label><label>Unique reports needed for moderator action<input name="threshold" type="number" min={1} max={1000} defaultValue={threshold} required /></label>{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}<button disabled={pending}>Save settings</button></form>;
}
