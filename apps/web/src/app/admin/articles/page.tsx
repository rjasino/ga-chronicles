import Link from "next/link";
import { requirePermission } from "@/lib/authz/require-role";
import { getAuthorArticles } from "@/features/articles/actions";

export default async function ArticlesDashboard() {
  await requirePermission("publish");
  const articles = await getAuthorArticles();
  return <main className="page-shell admin-page"><div className="section-heading"><h1>Your articles</h1><Link className="button-link" href="/admin/articles/new">Write an article</Link></div><ul className="admin-list">{articles.map((article) => <li key={article.id}><div><strong>{article.title}</strong><span>{article.status}</span></div><Link href={`/admin/articles/${article.id}/edit`}>Edit</Link></li>)}</ul></main>;
}
