import Image from "next/image";
import { ArticleCard } from "@/components/articles/article-card";
import { listPublishedArticles } from "@/features/articles/queries";

export default async function HomePage() {
  const articles = await listPublishedArticles();
  return (
    <main className="page-shell mx-auto w-[min(1160px,90vw)] max-[760px]:w-[90vw]">
      <section className="masthead grid min-h-[380px] grid-cols-[1fr_260px] items-center border-b border-line py-16 pb-14 max-[760px]:min-h-0 max-[760px]:grid-cols-1 max-[760px]:gap-8 max-[760px]:py-13">
        <div className="masthead__copy max-w-[690px]">
          <p className="masthead__motto mb-3.5 font-display text-[clamp(1.05rem,2.4vw,1.35rem)] font-semibold tracking-[-.01em] text-red">#fortheloveofgaming</p>
          <h1 className="m-0 font-display text-[clamp(3rem,7vw,5.8rem)] leading-[.98] tracking-[-.065em] text-blue">The games worth<br />your time.</h1>
          <p className="mt-5 mb-0 max-w-[460px] text-[1.1rem] text-muted">Reviews, reporting, and opinion for players who care about what they play.</p>
        </div>
        <Image className="masthead__mark h-auto w-[min(100%,300px)] justify-self-end border border-line bg-paper p-2 max-[760px]:w-[150px] max-[760px]:justify-self-start" src="/brand/neon-GA-01.png" alt="" width={2424} height={2424} priority />
      </section>
      <section className="latest pt-9 pb-20" aria-labelledby="latest-heading">
        <div className="section-heading mb-6 flex items-baseline justify-between border-b-[3px] border-blue"><h2 id="latest-heading" className="mb-2.5 font-display text-[1.8rem] text-blue">Latest stories</h2><span className="text-[.85rem] text-muted">{articles.length} published</span></div>
        {articles.length ? <div className="article-grid grid grid-cols-2 gap-5 max-[760px]:grid-cols-1">{articles.map((article) => <ArticleCard key={article.id} article={article} />)}</div> : <p className="empty-state bg-paper p-8 text-muted">There are no stories yet. Check back soon.</p>}
      </section>
    </main>
  );
}
