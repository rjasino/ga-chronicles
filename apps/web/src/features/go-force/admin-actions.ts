"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { canManageGoForce } from "@/features/go-force/access";
import { annualGameInputSchema, pageVisibilitySchema, resultVisibilitySchema } from "@/features/go-force/admin-schemas";

export type AdminActionState = { error?: string; success?: string; gameId?: string };

function revalidateAdminContent() {
  revalidatePath("/go-force");
  revalidatePath("/admin/go-force");
}

export async function saveGoForcePageVisibility(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can change Go Force visibility." };
  const parsed = pageVisibilitySchema.safeParse({ pageVisible: formData.get("page_visible") === "on" });
  if (!parsed.success) return { error: "Choose whether the page is visible." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("go_force_page_settings")
    .update({ page_visible: parsed.data.pageVisible, updated_by: session.userId })
    .eq("id", true);
  if (error) return { error: "The Go Force page visibility could not be saved." };

  revalidatePath("/", "layout");
  revalidateAdminContent();
  return { success: parsed.data.pageVisible ? "The Go Force page is visible." : "The Go Force page is hidden." };
}

export async function saveAnnualGame(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can manage the annual game list." };
  const parsed = annualGameInputSchema.safeParse({
    id: String(formData.get("id") ?? "") || undefined,
    title: String(formData.get("title") ?? ""),
    gotyYear: formData.get("gotyYear"),
    eligibilityState: String(formData.get("eligibilityState") ?? "eligible"),
    displayOrder: formData.get("displayOrder") ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the game details." };

  const payload = {
    title: parsed.data.title,
    goty_year: parsed.data.gotyYear,
    eligibility_state: parsed.data.eligibilityState,
    display_order: parsed.data.displayOrder ?? 0,
  };
  const supabase = await createClient();
  const result = parsed.data.id
    ? await supabase.from("go_force_annual_games").update(payload).eq("id", parsed.data.id).select("id").maybeSingle()
    : await supabase.from("go_force_annual_games").insert(payload).select("id").single();

  if (result.error || !result.data) {
    if (result.error?.code === "23505") return { error: "That game is already on the list for this year." };
    return { error: "The game could not be saved." };
  }

  revalidateAdminContent();
  return { gameId: result.data.id, success: parsed.data.id ? "Game updated." : "Game added." };
}

export async function removeAnnualGame(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can manage the annual game list." };
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Choose a game to remove." };

  const supabase = await createClient();
  const { error } = await supabase.from("go_force_annual_games").delete().eq("id", gameId);
  if (error) return { error: "The game could not be removed." };

  revalidateAdminContent();
  return { success: "Game removed. Started sessions keep their original snapshots." };
}

export async function setGoForceResultVisibility(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can publish Go Force results." };
  const parsed = resultVisibilitySchema.safeParse({
    sessionId: String(formData.get("sessionId") ?? ""),
    resultsVisible: formData.get("results_visible") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the result visibility choice." };

  const supabase = await createClient();
  const { data: goForceSession } = await supabase
    .from("go_force_sessions")
    .select("status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (goForceSession?.status !== "complete") {
    return { error: "Only a completed session with a GOTY result can be published." };
  }

  const { error } = await supabase
    .from("go_force_results")
    .update({
      results_visible: parsed.data.resultsVisible,
      published_at: parsed.data.resultsVisible ? new Date().toISOString() : null,
    })
    .eq("session_id", parsed.data.sessionId);
  if (error) return { error: "The result page visibility could not be saved." };

  revalidateAdminContent();
  revalidatePath(`/go-force/results/${parsed.data.sessionId}`);
  return { success: parsed.data.resultsVisible ? "The results page is public." : "The results page is hidden." };
}
