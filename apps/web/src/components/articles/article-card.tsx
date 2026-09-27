import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/features/articles/queries";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="article-card">
      <div className="article-card__image">
        {article.cover_image ? (
          <Image src={article.cover_image} alt="" fill sizes="(max-width: 700px) 100vw, 50vw" />
        ) : <span className="image-fallback" aria-hidden="true">GA</span>}
      </div>
      <div className="article-card__copy">
        <p className="article-type">{article.type}</p>
        <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
        <p className="article-card__summary">{article.body.slice(0, 155)}{article.body.length > 155 ? "…" : ""}</p>
      </div>
    </article>
  );
}
