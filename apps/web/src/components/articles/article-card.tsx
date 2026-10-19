import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/features/articles/queries";
import { isLocalArticleCoverUrl } from "@/features/articles/article-cover";
import { richBodyToPlainText } from "@/features/articles/richtext/rich-html";

export function ArticleCard({ article }: { article: Article }) {
  const summary = richBodyToPlainText(article.body);
  return (
    <article className="article-card grid min-h-[170px] grid-cols-[180px_1fr] border border-line bg-card max-[760px]:grid-cols-[130px_1fr] max-[430px]:grid-cols-1">
      <div className="article-card__image relative min-h-[168px] overflow-hidden bg-brand-band max-[760px]:min-h-[150px] max-[430px]:min-h-[190px]">
        {article.cover_image ? (
          <Image className="object-cover" src={article.cover_image} alt="" fill sizes="(max-width: 700px) 100vw, 50vw" unoptimized={isLocalArticleCoverUrl(article.cover_image, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")} />
        ) : <span className="image-fallback grid size-full place-items-center font-display text-5xl font-bold text-yellow" aria-hidden="true">GA</span>}
      </div>
      <div className="article-card__copy px-[1.15rem] py-4">
        <p className="article-type m-0 mb-2.5 text-[.68rem] font-bold tracking-[.06em] text-red uppercase">{article.type}</p>
        <h2 className="m-0 font-display text-xl leading-[1.2] font-semibold text-blue"><Link className="no-underline" href={`/articles/${article.slug}`}>{article.title}</Link></h2>
        <p className="article-card__summary mt-2.5 mb-0 text-[.87rem] leading-normal text-muted">{summary.slice(0, 155)}{summary.length > 155 ? "…" : ""}</p>
      </div>
    </article>
  );
}
