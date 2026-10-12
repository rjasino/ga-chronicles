import Image from "next/image";
import type { Article, ArticleByline } from "@/features/articles/queries";
import { isLocalArticleCoverUrl } from "@/features/articles/article-cover";
import { renderRichBody } from "@/features/articles/richtext/rich-html";

export function ArticleContent({ article, meta }: { article: Article; meta?: { byline: ArticleByline | null; readMinutes: number } }) {
  const bylineName = meta?.byline ? (meta.byline.displayName ?? meta.byline.username) : "Game Ako Chronicles staff";
  return (
    <article className="story mx-auto max-w-[760px] pt-[4.2rem] pb-8">
      <header className="story__header mb-8">
        <p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">{article.type}</p>
        <h1 className="m-0 max-w-[760px] font-display text-[clamp(2.7rem,6vw,4.8rem)] leading-[1.02] tracking-[-.055em] text-blue">{article.title}</h1>
        {article.published_at && <time className="mt-4 block text-[.9rem] text-muted" dateTime={article.published_at}>{new Date(article.published_at).toLocaleDateString("en", { dateStyle: "long" })}</time>}
        {meta && <p className="story__meta mt-2.5 mb-0 flex flex-wrap gap-x-0 gap-y-1.5 text-[.9rem] text-muted"><span className="story__byline mr-3 font-semibold text-ink">By {bylineName}</span><span className="story__read-time border-l border-line pl-3">{meta.readMinutes} min read</span></p>}
      </header>
      {article.cover_image && <div className="story__cover relative aspect-video w-full bg-paper"><Image className="object-cover" src={article.cover_image} alt="Launch story cover" fill priority loading="eager" sizes="(max-width: 760px) 100vw, 760px" unoptimized={isLocalArticleCoverUrl(article.cover_image, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")} /></div>}
      <div className="story__body" dangerouslySetInnerHTML={{ __html: renderRichBody(article.body) }} />
    </article>
  );
}
