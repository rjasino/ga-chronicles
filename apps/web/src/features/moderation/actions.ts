"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

export type ModerationState = { error?: string; success?: string };

export async function deleteComment(_state: ModerationState, formData: FormData): Promise<ModerationState> {
  const session = await getVerifiedSession();
  if (!session || !session.roles.some((role) => role === "moderator" || role === "admin")) return { error: "You do not have permission to moderate comments." };
  const commentId = String(formData.get("commentId") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("moderate_comment", { target_comment_id: commentId });
  if (error?.message.includes("THRESHOLD_NOT_MET")) return { error: "The report threshold has not been reached." };
  if (error) return { error: "This comment could not be removed." };
  if (!data) return { error: "This comment was already handled." };
  revalidatePath("/admin/moderation");
  revalidatePath("/articles/[slug]", "page");
  return { success: "Comment removed." };
}

export async function removeArticle(_state: ModerationState, formData: FormData): Promise<ModerationState> {
  const session = await getVerifiedSession();
  if (!session || !session.roles.some((role) => role === "moderator" || role === "admin")) return { error: "You do not have permission to remove articles." };
  const articleId = String(formData.get("articleId") ?? "");
  const supabase = await createClient();
  const { data: article } = await supabase.from("articles").select("slug").eq("id", articleId).maybeSingle();
  const { data: removed, error } = await supabase.rpc("moderate_article", { target_article_id: articleId });
  if (error) return { error: "This article could not be removed." };
  if (!removed) return { error: "This article was already handled." };
  if (article?.slug) revalidatePath(`/articles/${article.slug}`);
  revalidatePath("/");
  revalidatePath("/admin/moderation");
  return { success: "Article removed from the public site." };
}
