"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";
import { failureResult, reportFailure } from "@/lib/error-logging";

export type SettingsState = { error?: string; errorId?: string; success?: string };

export async function updateCommentSettings(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await getVerifiedSession();
  if (!session?.roles.includes("admin")) return { error: "Only admins can change comment settings." };
  const threshold = Number(formData.get("threshold"));
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 1000) return { error: "Enter a whole-number threshold between 1 and 1,000." };
  const commentsEnabled = formData.get("comments_enabled") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update({ comments_enabled: commentsEnabled, moderation_report_threshold: threshold, updated_by: session.userId }).eq("id", true);
  if (error) {
    return failureResult({
      operation: "moderation.update-settings",
      error,
      message: "Settings could not be saved.",
    });
  }
  revalidatePath("/admin/settings/comments");
  revalidatePath("/articles/[slug]", "page");
  return { success: "Comment settings saved." };
}

export async function getCommentSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_settings").select("comments_enabled,moderation_report_threshold").eq("id", true).single();
  if (error) {
    reportFailure({ operation: "moderation.read-settings", error });
  }
  return data ?? { comments_enabled: true, moderation_report_threshold: 3 };
}
