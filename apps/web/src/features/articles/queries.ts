import { createClient } from "@/lib/supabase/server";

export type Article = {
  id: string;
  title: string;
  slug: string;
  body: string;
  type: "news" | "review" | "commentary/opinion" | "interview";
  status: "draft" | "published" | "removed";
  author_id: string;
  cover_image: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPublishedArticles(): Promise<Article[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error("Could not load articles.", { cause: error });
  return (data ?? []) as Article[];
}

export type ArticleByline = { displayName: string | null; username: string };

export async function getArticleByline(articleId: string): Promise<ArticleByline | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_article_bylines")
    .select("display_name,username")
    .eq("article_id", articleId)
    .maybeSingle();
  if (error) throw new Error("Could not load this article's author.", { cause: error });
  if (!data) return null;
  const byline = data as { display_name: string | null; username: string };
  return { displayName: byline.display_name, username: byline.username };
}

export async function getPublishedArticle(slug: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("Could not load this article.", { cause: error });
  return (data as Article | null) ?? null;
}
