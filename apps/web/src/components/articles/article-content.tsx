import Image from "next/image";
import type { Article } from "@/features/articles/queries";
import { isLocalArticleCoverUrl } from "@/features/articles/article-cover";

export function ArticleContent({ article }: { article: Article }) {
  const paragraphs = article.body.split(/\n\s*\n/).filter(Boolean);
  return (
    <article className="story">
      <header className="story__header">
        <p className="article-type">{article.type}</p>
        <h1>{article.title}</h1>
        {article.published_at && <time dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString("en", { dateStyle: "long" })}</time>}
      </header>
      {article.cover_image && <div className="story__cover"><Image src={article.cover_image} alt="Launch story cover" fill priority loading="eager" sizes="(max-width: 760px) 100vw, 760px" unoptimized={isLocalArticleCoverUrl(article.cover_image, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")} /></div>}
      <div className="story__body">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    </article>
  );
}
