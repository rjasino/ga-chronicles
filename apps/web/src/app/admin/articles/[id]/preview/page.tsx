import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authz/require-role";
import { getArticleForAuthor } from "@/features/articles/actions";
import { ArticleContent } from "@/components/articles/article-content";

export default async function DraftPreview({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("publish");
  const { id } = await params;
  const article = await getArticleForAuthor(id);
  if (!article) notFound();
  return <main className="page-shell"><p className="preview-notice">Private preview — only you can see this draft.</p><ArticleContent article={article} /><Link className="text-link" href={`/admin/articles/${id}/edit`}>Return to editing</Link></main>;
}
