import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/articles/article-content";
import { CommentSection } from "@/components/comments/comment-section";
import { estimateReadMinutes } from "@/features/articles/read-time";
import { getArticleByline, getPublishedArticle } from "@/features/articles/queries";
import { getPublicComments } from "@/features/comments/actions";
import { getVerifiedSession } from "@/lib/supabase/session";

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const [{ comments, enabled }, session, byline] = await Promise.all([getPublicComments(article.id), getVerifiedSession(), getArticleByline(article.id)]);
  return <main className="page-shell"><ArticleContent article={article} meta={{ byline, readMinutes: estimateReadMinutes(article.body) }} /><CommentSection articleId={article.id} comments={comments} enabled={enabled} signedIn={Boolean(session)} /></main>;
}
