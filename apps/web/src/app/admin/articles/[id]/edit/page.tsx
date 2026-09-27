import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authz/require-role";
import { getArticleForAuthor } from "@/features/articles/actions";
import { ArticleEditor } from "@/components/articles/article-editor";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("publish");
  const { id } = await params;
  const article = await getArticleForAuthor(id);
  if (!article) notFound();
  return <main className="page-shell admin-page"><p className="article-type">Editorial desk</p><h1>Edit story</h1><ArticleEditor article={article} /></main>;
}
