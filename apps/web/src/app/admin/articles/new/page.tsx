import { requirePermission } from "@/lib/authz/require-role";
import { ArticleEditor } from "@/components/articles/article-editor";

export default async function NewArticlePage() {
  await requirePermission("publish");
  return <main className="page-shell admin-page"><h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Editorial desk</h1><p className="m-0 text-muted">Write a story</p><ArticleEditor /></main>;
}
