import { requirePermission } from "@/lib/authz/require-role";
import { ArticleEditor } from "@/components/articles/article-editor";

export default async function NewArticlePage() {
  await requirePermission("publish");
  return <main className="page-shell admin-page"><p className="article-type">Editorial desk</p><h1>Write a story</h1><ArticleEditor /></main>;
}
