import Link from "next/link";
import { requirePermission } from "@/lib/authz/require-role";
import { getAuthorArticles } from "@/features/articles/actions";
import { ButtonLink } from "@/components/ui/button";

export default async function ArticlesDashboard() {
  await requirePermission("publish");
  const articles = await getAuthorArticles();
  return <main className="page-shell admin-page min-h-[70vh] py-12 pb-20"><div className="section-heading mb-6 flex items-center justify-between border-b-[3px] border-blue"><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Your articles</h1><ButtonLink purpose="primary" href="/admin/articles/new">Write an article</ButtonLink></div><ul className="admin-list m-6 list-none border-t border-line p-0">{articles.map((article) => <li key={article.id} className="flex items-center justify-between gap-4 border-b border-line p-4"><div className="grid gap-1.5"><strong>{article.title}</strong><span className="text-[.85rem] text-muted">{article.status}</span></div><Link href={`/admin/articles/${article.id}/edit`}>Edit</Link></li>)}</ul></main>;
}
