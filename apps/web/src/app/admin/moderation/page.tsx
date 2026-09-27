import { requireAnyRole } from "@/lib/authz/require-role";
import { getPublishedArticlesForModeration, getReviewQueue } from "@/features/moderation/queries";
import { ReviewQueue, ArticleAction } from "@/components/moderation/review-queue";

export default async function ModerationPage() {
  const session = await requireAnyRole(["moderator", "admin"]);
  const [items, articles] = await Promise.all([getReviewQueue(session.roles), getPublishedArticlesForModeration()]);
  return <main className="page-shell admin-page"><p className="article-type">Review desk</p><h1>Moderation</h1><p className="field-hint">Reports flag comments for review. Reports do not hide a comment.</p><ReviewQueue items={items} /><section className="reported-articles"><h2>Published articles</h2><ul className="admin-list">{articles.map((article) => <li key={article.id}><Link href={`/articles/${article.slug}`}>{article.title}</Link><ArticleAction id={article.id} /></li>)}</ul></section><p className="field-hint">Signed in with {session.roles.join(" + ") || "reader"} access.</p></main>;
}
import Link from "next/link";
