import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authz/require-role";
import { getArticleForAuthor } from "@/features/articles/actions";
import { ArticleEditor } from "@/components/articles/article-editor";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("publish");
  const { id } = await params;
  const article = await getArticleForAuthor(id);
  if (!article) notFound();
  return <main className="page-shell admin-page min-h-[70vh] py-12 pb-20"><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Editorial desk</h1><p className="m-0 mb-2.5 text-muted">Edit story</p><ArticleEditor article={article} /></main>;
}
