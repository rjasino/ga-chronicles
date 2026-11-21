"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { canManageGoForce } from "@/features/go-force/access";
import { annualGameInputSchema, goForceVotingSettingsSchema, pageVisibilitySchema, resultVisibilitySchema } from "@/features/go-force/admin-schemas";
import { articleImageExtension, validateImageFile } from "@/features/articles/body-image";
import { GO_FORCE_COVER_BUCKET, GO_FORCE_COVER_MAX_SIZE } from "@/features/go-force/game-covers";

export type AdminActionState = { error?: string; success?: string; gameId?: string; pageVisible?: boolean };

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
  const { data, error } = await supabase
    .from("go_force_page_settings")
    .update({ page_visible: parsed.data.pageVisible, updated_by: session.userId })
    .eq("id", true)
    .select("page_visible")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Go Force page visibility save failed.", { code: error.code, message: error.message });
    else console.error("Go Force page visibility update returned no settings row.");
    return { error: "The Go Force page visibility could not be saved." };
  }

  revalidatePath("/", "layout");
  revalidateAdminContent();
  return {
    pageVisible: data.page_visible,
    success: data.page_visible ? "The Go Force page is visible." : "The Go Force page is hidden.",
  };
}

export async function saveGoForceVotingSettings(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can change Go Force voting timers." };
  const parsed = goForceVotingSettingsSchema.safeParse({
    roundVotingSeconds: formData.get("roundVotingSeconds"),
    finalBallotSeconds: formData.get("finalBallotSeconds"),
  });
  if (!parsed.success) return { error: "Set each voting timer between 5 and 600 seconds." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("go_force_page_settings")
    .update({
      round_voting_seconds: parsed.data.roundVotingSeconds,
      final_ballot_seconds: parsed.data.finalBallotSeconds,
      updated_by: session.userId,
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("Go Force voting timer settings save failed.", { code: error.code, message: error.message });
    else console.error("Go Force voting timer update returned no settings row.");
    return { error: "The Go Force voting timers could not be saved." };
  }

  revalidateAdminContent();
  return { success: "Go Force voting timers saved." };
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
    developer: String(formData.get("developer") ?? ""),
    publisher: String(formData.get("publisher") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    coverArtUrl: String(formData.get("coverArtUrl") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the game details." };

  const fileValue = formData.get("coverArtFile");
  const coverFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  let coverArtUrl = parsed.data.coverArtUrl ?? null;
  let uploadedObjectPath: string | null = null;
  const supabase = await createClient();
  if (coverFile) {
    const extension = articleImageExtension(coverFile.type);
    if (!extension) return { error: "Game cover art must be JPEG, PNG, or WebP." };
    const validationError = await validateImageFile(coverFile, GO_FORCE_COVER_MAX_SIZE, "Game cover art");
    if (validationError) return { error: validationError };

    uploadedObjectPath = `${session.userId}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(GO_FORCE_COVER_BUCKET).upload(uploadedObjectPath, coverFile, {
      cacheControl: "3600",
      contentType: coverFile.type,
      upsert: false,
    });
    if (error) {
      console.error("Go Force cover upload failed.", { name: error.name, message: error.message });
      return { error: "The game cover art could not be uploaded. Try again." };
    }
    coverArtUrl = supabase.storage.from(GO_FORCE_COVER_BUCKET).getPublicUrl(uploadedObjectPath).data.publicUrl;
  }

  const payload = {
    title: parsed.data.title,
    goty_year: parsed.data.gotyYear,
    eligibility_state: parsed.data.eligibilityState,
    display_order: parsed.data.displayOrder ?? 0,
    developer: parsed.data.developer ?? null,
    publisher: parsed.data.publisher ?? null,
    genre: parsed.data.genre ?? null,
    cover_art_url: coverArtUrl,
  };
  const result = parsed.data.id
    ? await supabase.from("go_force_annual_games").update(payload).eq("id", parsed.data.id).select("id").maybeSingle()
    : await supabase.from("go_force_annual_games").insert(payload).select("id").single();

  if (result.error || !result.data) {
    if (uploadedObjectPath) {
      const { error: cleanupError } = await supabase.storage.from(GO_FORCE_COVER_BUCKET).remove([uploadedObjectPath]);
      if (cleanupError) console.error("Could not clean up a Go Force cover after the game save failed.", cleanupError);
    }
    if (result.error?.code === "23505") return { error: "That game is already on the list for this year." };
    if (result.error) {
      console.error("Go Force annual game save failed.", { code: result.error.code, message: result.error.message });
    } else {
      console.error("Go Force annual game save returned no saved row.");
    }
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
