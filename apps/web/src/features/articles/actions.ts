"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedSession } from "@/lib/supabase/session";
import { can } from "@/lib/authz/permissions";
import { getPublicEnv } from "@/lib/env";
import { ARTICLE_COVER_BUCKET, articleCoverExtension, articleCoverStoragePath, validateArticleCover } from "@/features/articles/article-cover";
import {
  ARTICLE_BODY_IMAGE_SUBJECT,
  ARTICLE_IMAGES_BUCKET,
  ARTICLE_IMAGES_MAX_SIZE,
  articleImageExtension,
  imageTooLargeMessage,
  validateArticleBodyImage,
} from "@/features/articles/body-image";
import { articleInputSchema } from "@/features/articles/schema";
import { richBodyHasContent, sanitizeRichHtml } from "@/features/articles/richtext/rich-html";
import { bodyImagePaths, reconcileArticleBodyImages } from "@/features/articles/body-image-refs";

export type EditorState = {
  error?: string;
  message?: string;
  articleId?: string;
  title?: string;
  body?: string;
  type?: string;
};

function slugFor(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `story-${Date.now()}`
  );
}

export async function saveArticle(_state: EditorState, formData: FormData): Promise<EditorState> {
  const values = {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    type: String(formData.get("type") ?? "news"),
  };
  const articleId = String(formData.get("articleId") ?? "");
  const intent = String(formData.get("intent") ?? "draft");
  const session = await getVerifiedSession();
  if (!session || !can(session.roles, "publish"))
    return { error: "You do not have permission to publish articles.", ...values, articleId };
  const coverValue = formData.get("cover_image");
  if (typeof coverValue === "string" && coverValue.trim())
    return { error: "Choose an image file instead of entering a cover-image path.", ...values, articleId };
  const coverFile = coverValue && typeof coverValue !== "string" && coverValue.size > 0 ? coverValue : null;
  if (coverFile) {
    const coverError = await validateArticleCover(coverFile);
    if (coverError) return { error: coverError, ...values, articleId };
  }

  const parsed = articleInputSchema.safeParse(values);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Check the article details.",
      ...values,
      articleId,
    };

  const bodyHtml = sanitizeRichHtml(parsed.data.body);
  if (!richBodyHasContent(bodyHtml))
    return { error: "Add article content.", ...values, articleId };

  const supabase = await createClient();
  let existingCover: string | null = null;
  if (articleId) {
    const { data: existingArticle, error } = await supabase.from("articles").select("cover_image").eq("id", articleId).maybeSingle();
    if (error || !existingArticle)
      return { error: "Could not load this article. Refresh the page and try again.", ...values, articleId };
    existingCover = existingArticle.cover_image;
  }

  const removeRequested = !coverFile && formData.get("remove_cover") === "true";
  let uploadedObjectPath: string | null = null;
  let coverImage: string | null = removeRequested ? null : existingCover;
  if (coverFile) {
    const extension = articleCoverExtension(coverFile.type);
    if (!extension) return { error: "Cover images must be JPEG, PNG, or WebP.", ...values, articleId };
    uploadedObjectPath = `${session.userId}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(ARTICLE_COVER_BUCKET).upload(uploadedObjectPath, coverFile, {
      cacheControl: "3600",
      contentType: coverFile.type,
      upsert: false,
    });
    if (error) return { error: "The cover image could not be uploaded. Try again.", ...values, articleId };
    coverImage = supabase.storage.from(ARTICLE_COVER_BUCKET).getPublicUrl(uploadedObjectPath).data.publicUrl;
  }

  const payload = {
    title: parsed.data.title,
    body: bodyHtml,
    type: parsed.data.type,
    cover_image: coverImage,
    slug: slugFor(parsed.data.title),
    status: intent === "publish" ? "published" : "draft",
    published_at: intent === "publish" ? new Date().toISOString() : null,
    ...(articleId ? {} : { author_id: session.userId }),
  };
  const result = articleId
    ? await supabase
        .from("articles")
        .update(payload)
        .eq("id", articleId)
        .select("id,slug")
        .maybeSingle()
    : await supabase.from("articles").insert(payload).select("id,slug").single();
  if (result.error || !result.data) {
    if (uploadedObjectPath) {
      const { error: cleanupError } = await supabase.storage.from(ARTICLE_COVER_BUCKET).remove([uploadedObjectPath]);
      if (cleanupError) console.error("Could not clean up an article cover after the article save failed.", cleanupError);
    }
    return {
      error: "Could not save this article. Check the title is unique and try again.",
      ...values,
      articleId,
    };
  }

  let cleanupWarning = false;
  if (existingCover && existingCover !== coverImage && (removeRequested || coverFile)) {
    const oldObjectPath = articleCoverStoragePath(existingCover, getPublicEnv().NEXT_PUBLIC_SUPABASE_URL);
    if (oldObjectPath) {
      const { error } = await supabase.storage.from(ARTICLE_COVER_BUCKET).remove([oldObjectPath]);
      cleanupWarning = Boolean(error);
      if (error) console.error("Could not remove the replaced article cover from Supabase Storage.", error);
    }
  }

  let bodyImageCleanupWarning = false;
  try {
    const reconciled = await reconcileArticleBodyImages(
      supabase,
      result.data.id,
      bodyImagePaths(bodyHtml, getPublicEnv().NEXT_PUBLIC_SUPABASE_URL),
    );
    bodyImageCleanupWarning = reconciled.cleanupIncomplete;
  } catch (error) {
    console.error("Could not reconcile article body images.", error);
    bodyImageCleanupWarning = true;
  }

  revalidatePath("/");
  revalidatePath(`/articles/${result.data.slug}`);
  revalidatePath("/admin/articles");
  if (articleId) revalidatePath(`/admin/articles/${articleId}/edit`);
  return {
    articleId: result.data.id,
    message: cleanupWarning
      ? "Article saved, but the previous cover image could not be removed from storage."
      : bodyImageCleanupWarning
        ? "Article saved, but some removed body images could not be deleted from storage."
        : intent === "publish" ? "Article published." : "Draft saved.",
    ...values,
  };
}

export type BodyImageUploadErrorCode =
  | "not_signed_in"
  | "missing_file"
  | "too_large"
  | "invalid_type"
  | "invalid_signature"
  | "upload_failed";

export type BodyImageUploadResult = { error?: string; errorCode?: BodyImageUploadErrorCode; url?: string };

export async function uploadArticleBodyImage(formData: FormData): Promise<BodyImageUploadResult> {
  const session = await getVerifiedSession();
  if (!session || !can(session.roles, "publish"))
    return { errorCode: "not_signed_in", error: "You do not have permission to add images to articles." };

  const value = formData.get("image");
  if (typeof value === "string" && value.trim())
    return { errorCode: "missing_file", error: "Choose an image file instead of entering an image path." };
  if (!value || typeof value === "string" || value.size === 0)
    return { errorCode: "missing_file", error: "Choose an image file." };

  if (value.size > ARTICLE_IMAGES_MAX_SIZE)
    return {
      errorCode: "too_large",
      error: imageTooLargeMessage(ARTICLE_BODY_IMAGE_SUBJECT, value.size, ARTICLE_IMAGES_MAX_SIZE),
    };

  const extension = articleImageExtension(value.type);
  if (!extension) return { errorCode: "invalid_type", error: "Inline images must be JPEG, PNG, or WebP." };

  const fileError = await validateArticleBodyImage(value);
  if (fileError) return { errorCode: "invalid_signature", error: fileError };

  const supabase = await createClient();
  const objectPath = `${session.userId}/${randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(ARTICLE_IMAGES_BUCKET).upload(objectPath, value, {
    cacheControl: "3600",
    contentType: value.type,
    upsert: false,
  });
  if (error) return { errorCode: "upload_failed", error: "The image could not be uploaded. Try again." };
  return { url: supabase.storage.from(ARTICLE_IMAGES_BUCKET).getPublicUrl(objectPath).data.publicUrl };
}

export async function getAuthorArticles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,slug,status,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Could not load your articles.", { cause: error });
  return data ?? [];
}

export async function getArticleForAuthor(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Could not load this draft.", { cause: error });
  return data;
}
