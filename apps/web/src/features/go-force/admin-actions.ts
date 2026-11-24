"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { failureResult, reportFailure } from "@/lib/error-logging";
import { canManageGoForce } from "@/features/go-force/access";
import { annualGameInputSchema, goForceVotingSettingsSchema, pageVisibilitySchema, resultVisibilitySchema } from "@/features/go-force/admin-schemas";
import {
  parseAnnualGameImport,
  type AnnualGameImportExisting,
} from "@/features/go-force/annual-game-import";
import { articleImageExtension, validateImageFile } from "@/features/articles/body-image";
import { GO_FORCE_COVER_BUCKET, GO_FORCE_COVER_MAX_SIZE } from "@/features/go-force/game-covers";

export type AdminActionState = { error?: string; errorId?: string; success?: string; gameId?: string; pageVisible?: boolean };

export type AnnualGameImportActionState = AdminActionState & {
  addedCount?: number;
  skippedCount?: number;
};

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
    return failureResult({
      operation: "go-force.settings.page-visibility",
      error: error ?? new Error("The page visibility update returned no settings row."),
      message: "The Go Force page visibility could not be saved.",
    });
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
    roundVotingTimed: formData.get("roundVotingTimed") === "on",
    finalBallotSeconds: formData.get("finalBallotSeconds"),
    finalBallotTimed: formData.get("finalBallotTimed") === "on",
    minimumRoundThreeGoVoters: formData.get("minimumRoundThreeGoVoters"),
  });
  if (!parsed.success) {
    return {
      error:
        "Set each timer between 5 and 600 seconds and the Round 3 Go minimum between 1 and 64 players.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("go_force_page_settings")
    .update({
      round_voting_seconds: parsed.data.roundVotingSeconds,
      round_voting_timed: parsed.data.roundVotingTimed,
      final_ballot_seconds: parsed.data.finalBallotSeconds,
      final_ballot_timed: parsed.data.finalBallotTimed,
      minimum_round_three_go_voters: parsed.data.minimumRoundThreeGoVoters,
      updated_by: session.userId,
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return failureResult({
      operation: "go-force.settings.voting-timers",
      error: error ?? new Error("The voting timer update returned no settings row."),
      message: "The Go Force voting timers could not be saved.",
    });
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
      return failureResult({
        operation: "go-force.annual-game.cover-upload",
        error,
        message: "The game cover art could not be uploaded. Try again.",
      });
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
      if (cleanupError) {
        reportFailure({
          operation: "go-force.annual-game.cover-cleanup",
          error: cleanupError,
          context: { gameId: parsed.data.id, storagePath: uploadedObjectPath },
        });
      }
    }
    if (result.error?.code === "23505") return { error: "That game is already on the list for this year." };
    return failureResult({
      operation: "go-force.annual-game.save",
      error: result.error ?? new Error("The annual game save returned no row."),
      message: "The game could not be saved.",
      context: { gameId: parsed.data.id },
    });
  }

  revalidateAdminContent();
  return { gameId: result.data.id, success: parsed.data.id ? "Game updated." : "Game added." };
}

export async function importAnnualGames(
  _state: AnnualGameImportActionState,
  formData: FormData,
): Promise<AnnualGameImportActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) {
    return { error: "Only an admin can import the annual game list." };
  }

  const rawJson = formData.get("json");
  if (typeof rawJson !== "string" || !rawJson.trim()) {
    return { error: "Choose a JSON file to import." };
  }

  const byteLength = new TextEncoder().encode(rawJson).length;
  const initialPass = parseAnnualGameImport(rawJson, { byteLength });
  if (!initialPass.ok) return { error: initialPass.error };
  if (initialPass.invalidRecords.length > 0 || initialPass.gotyYear === null) {
    return { error: "Fix the invalid records in the file before importing." };
  }

  const supabase = await createClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("go_force_annual_games")
    .select("title")
    .eq("goty_year", initialPass.gotyYear);
  if (existingError) {
    return failureResult({
      operation: "go-force.annual-game.import-lookup",
      error: existingError,
      message: "The existing annual games could not be checked. Try again.",
    });
  }

  const existingGames: AnnualGameImportExisting[] = (existingRows ?? []).map((row) => ({
    goty_year: initialPass.gotyYear as number,
    title: row.title,
  }));
  const review = parseAnnualGameImport(rawJson, { existingGames, byteLength });
  if (!review.ok) return { error: review.error };
  if (review.invalidRecords.length > 0) {
    return { error: "Fix the invalid records in the file before importing." };
  }

  if (review.additions.length === 0) {
    revalidateAdminContent();
    return {
      addedCount: 0,
      skippedCount: review.skipCount,
      success: `No new games were added. ${review.skipCount} duplicate ${
        review.skipCount === 1 ? "game was" : "games were"
      } skipped.`,
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("go_force_annual_games")
    .insert(
      review.additions.map((record) => ({
        title: record.title,
        goty_year: record.gotyYear,
        eligibility_state: record.eligibilityState,
        display_order: record.displayOrder,
        developer: record.developer,
        publisher: record.publisher,
        genre: record.genre,
        cover_art_url: record.coverArtUrl,
      })),
    )
    .select("id");

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return {
        error:
          "Another admin added one of these games while you were reviewing. Nothing was saved. Refresh and review the file again.",
      };
    }
    if (insertError) {
      return failureResult({
        operation: "go-force.annual-game.import",
        error: insertError,
        message:
          "The games could not be saved. Nothing from the batch was saved. Refresh and review the file again.",
      });
    }
    return failureResult({
      operation: "go-force.annual-game.import",
      error: new Error("The annual game import returned no saved rows."),
      message:
        "The games could not be saved. Nothing from the batch was saved. Refresh and review the file again.",
    });
  }

  revalidateAdminContent();
  return {
    addedCount: inserted.length,
    skippedCount: review.skipCount,
    success: `Added ${inserted.length} ${inserted.length === 1 ? "game" : "games"}. Skipped ${
      review.skipCount
    } duplicate ${review.skipCount === 1 ? "game" : "games"}.`,
  };
}

export async function removeAnnualGame(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await getVerifiedSession();
  if (!session || !canManageGoForce(session.roles)) return { error: "Only an admin can manage the annual game list." };
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Choose a game to remove." };

  const supabase = await createClient();
  const { error } = await supabase.from("go_force_annual_games").delete().eq("id", gameId);
  if (error) {
    return failureResult({
      operation: "go-force.annual-game.remove",
      error,
      message: "The game could not be removed.",
      context: { gameId },
    });
  }

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
  const { data: goForceSession, error: sessionError } = await supabase
    .from("go_force_sessions")
    .select("status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (sessionError) {
    reportFailure({
      operation: "go-force.results.lookup",
      error: sessionError,
      context: { sessionId: parsed.data.sessionId },
    });
  }
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
  if (error) {
    return failureResult({
      operation: "go-force.results.visibility",
      error,
      message: "The result page visibility could not be saved.",
      context: { sessionId: parsed.data.sessionId },
    });
  }

  revalidateAdminContent();
  revalidatePath(`/go-force/results/${parsed.data.sessionId}`);
  return { success: parsed.data.resultsVisible ? "The results page is public." : "The results page is hidden." };
}
