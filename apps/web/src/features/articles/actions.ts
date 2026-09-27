"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { can } from "@/lib/authz/permissions";
import { articleInputSchema } from "@/features/articles/schema";

export type EditorState = { error?: string; message?: string; articleId?: string; title?: string; body?: string; type?: string };

function slugFor(title: string) {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `story-${Date.now()}`;
}

export async function saveArticle(_state: EditorState, formData: FormData): Promise<EditorState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    type: String(formData.get("type") ?? "news"),
    cover_image: String(formData.get("cover_image") ?? ""),
  };
  const articleId = String(formData.get("articleId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  const session = await getVerifiedSession();
  if (!session || !can(session.roles, "publish")) return { error: "You do not have permission to publish articles.", ...values, articleId };
  const parsed = articleInputSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the article details.", ...values, articleId };

  const supabase = await createClient();
  const payload = {
    title: parsed.data.title,
    body: parsed.data.body,
    type: parsed.data.type,
    cover_image: parsed.data.cover_image || null,
    slug: slugFor(parsed.data.title),
    status: intent === "publish" ? "published" : "draft",
    published_at: intent === "publish" ? new Date().toISOString() : null,
    ...(articleId ? {} : { author_id: session.userId }),
  };
  const result = articleId
    ? await supabase.from("articles").update(payload).eq("id", articleId).select("id,slug").maybeSingle()
    : await supabase.from("articles").insert(payload).select("id,slug").single();
  if (result.error || !result.data) return { error: "Could not save this article. Check the title is unique and try again.", ...values, articleId };
  revalidatePath("/");
  revalidatePath(`/articles/${result.data.slug}`);
  revalidatePath("/admin/articles");
  return { articleId: result.data.id, message: intent === "publish" ? "Article published." : "Draft saved.", ...values };
}

export async function getAuthorArticles() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("id,title,slug,status,updated_at").order("updated_at", { ascending: false });
  if (error) throw new Error("Could not load your articles.", { cause: error });
  return data ?? [];
}

export async function getArticleForAuthor(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load this draft.", { cause: error });
  return data;
}
