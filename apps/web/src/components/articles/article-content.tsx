import Image from "next/image";
import type { Article, ArticleByline } from "@/features/articles/queries";
import { isLocalArticleCoverUrl } from "@/features/articles/article-cover";
import { renderRichBody } from "@/features/articles/richtext/rich-html";

export function ArticleContent({ article, meta }: { article: Article; meta?: { byline: ArticleByline | null; readMinutes: number } }) {
  const bylineName = meta?.byline ? (meta.byline.displayName ?? meta.byline.username) : "Game Ako Chronicles staff";
  return (
    <article className="story">
      <header className="story__header">
        <p className="article-type">{article.type}</p>
        <h1>{article.title}</h1>
        {article.published_at && <time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString("en", { dateStyle: "long" })}</time>}
        {meta && <p className="story__meta"><span className="story__byline">By {bylineName}</span><span className="story__read-time">{meta.readMinutes} min read</span></p>}
      </header>
      {article.cover_image && <div className="story__cover"><Image src={article.cover_image} alt="Launch story cover" fill priority loading="eager" sizes="(max-width: 760px) 100vw, 760px" unoptimized={isLocalArticleCoverUrl(article.cover_image, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")} /></div>}
      <div className="story__body" dangerouslySetInnerHTML={{ __html: renderRichBody(article.body) }} />
    </article>
  );
}
