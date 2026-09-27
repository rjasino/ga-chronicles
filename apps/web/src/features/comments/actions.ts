"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/supabase/session";
import { findBlockedWord, launchBlockedWords } from "@/features/comments/blocked-words";

export type CommentState = { error?: string; body?: string; success?: string; resetKey?: string };

export async function postComment(_state: CommentState, formData: FormData): Promise<CommentState> {
  const body = String(formData.get("body") ?? "");
  const articleId = String(formData.get("articleId") ?? "");
  if (!body.trim()) return { error: "Write a comment before posting.", body };
  if (body.trim().length > 3000) return { error: "Keep comments under 3,000 characters.", body };
  if (findBlockedWord(body, launchBlockedWords)) return { error: "This comment includes a blocked term. Edit it and try again.", body };
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in with an active account to comment.", body };
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ article_id: articleId, author_id: session.userId, body: body.trim() });
  if (error) {
    if (error.message.includes("COMMENTS_DISABLED")) return { error: "Comments are turned off right now.", body };
    if (error.message.includes("COMMENT_BLOCKED")) return { error: "This comment includes a blocked term. Edit it and try again.", body };
    return { error: "Your comment could not be posted. Please try again.", body };
  }
  revalidatePath("/articles/[slug]", "page");
  return { success: "Comment posted.", body: "", resetKey: `${Date.now()}` };
}

export async function reportComment(_state: CommentState, formData: FormData): Promise<CommentState> {
  const commentId = String(formData.get("commentId") ?? "");
  const session = await getVerifiedSession();
  if (!session) return { error: "Sign in with an active account to report a comment." };
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ comment_id: commentId, reporter_id: session.userId });
  if (error?.code === "23505") return { error: "You have already reported this comment." };
  if (error) return { error: "The report could not be submitted. Please try again." };
  revalidatePath("/admin/moderation");
  return { success: "Report sent to the moderation team." };
}

export async function getPublicComments(articleId: string) {
  const supabase = await createClient();
  const [{ data: comments }, { data: settings }] = await Promise.all([
    supabase.from("public_comments").select("id,body,created_at,display_name").eq("article_id", articleId).order("created_at", { ascending: true }),
    supabase.from("public_comment_settings").select("comments_enabled").single(),
  ]);
  return { comments: comments ?? [], enabled: settings?.comments_enabled ?? true };
}
