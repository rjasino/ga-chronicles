import Link from "next/link";
import { requireAnyRole } from "@/lib/authz/require-role";
import { getPublishedArticlesForModeration, getReviewQueue } from "@/features/moderation/queries";
import { ReviewQueue, ArticleAction } from "@/components/moderation/review-queue";

export default async function ModerationPage() {
  const session = await requireAnyRole(["moderator", "admin"]);
  const [items, articles] = await Promise.all([getReviewQueue(session.roles), getPublishedArticlesForModeration()]);
  return <main className="page-shell admin-page min-h-[70vh] py-12 pb-20"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Review desk</p><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Moderation</h1><p className="field-hint m-0 text-[.88rem] text-muted">Reports flag comments for review. Reports do not hide a comment.</p><ReviewQueue items={items} /><section className="reported-articles"><h2 className="m-0 font-display text-[1.8rem] text-blue">Published articles</h2><ul className="admin-list m-6 list-none border-t border-line p-0">{articles.map((article) => <li key={article.id} className="flex items-center justify-between gap-4 border-b border-line p-4"><Link href={`/articles/${article.slug}`}>{article.title}</Link><ArticleAction id={article.id} /></li>)}</ul></section><p className="field-hint m-0 text-[.88rem] text-muted">Signed in with {session.roles.join(" + ") || "reader"} access.</p></main>;
}
