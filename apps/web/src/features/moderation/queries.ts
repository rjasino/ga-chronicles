import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/authz/permissions";

export async function getReviewQueue(roles: readonly Role[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id,body,created_at,articles(title,slug),reports(reporter_id)")
    .eq("status", "visible")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load the review queue.", { cause: error });
  const { data: settings } = await supabase.from("site_settings").select("moderation_report_threshold").eq("id", true).single();
  const threshold = settings?.moderation_report_threshold ?? 3;
  return (data ?? []).map((item) => {
    const reports = new Set(item.reports.map((report) => report.reporter_id)).size;
    const article = Array.isArray(item.articles) ? item.articles[0] ?? null : item.articles;
    const actionable = reports > 0 && (roles.includes("admin") || (roles.includes("moderator") && reports >= threshold));
    return { ...item, articles: article, reportCount: reports, threshold, actionable };
  }).filter((item) => item.reportCount > 0);
}

export async function getPublishedArticlesForModeration() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").select("id,title,slug").eq("status", "published").order("published_at", { ascending: false });
  if (error) throw new Error("Could not load published articles.", { cause: error });
  return data ?? [];
}
