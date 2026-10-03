import Image from "next/image";
import { ArticleCard } from "@/components/articles/article-card";
import { listPublishedArticles } from "@/features/articles/queries";

export default async function HomePage() {
  const articles = await listPublishedArticles();
  return (
    <main className="page-shell">
      <section className="masthead">
        <div className="masthead__copy">
          <p className="masthead__motto">#fortheloveofgaming</p>
          <h1>The games worth<br />your time.</h1>
          <p>Reviews, reporting, and opinion for players who care about what they play.</p>
        </div>
        <Image className="masthead__mark" src="/brand/neon-GA-01.png" alt="" width={2424} height={2424} priority />
      </section>
      <section className="latest" aria-labelledby="latest-heading">
        <div className="section-heading"><h2 id="latest-heading">Latest stories</h2><span>{articles.length} published</span></div>
        {articles.length ? <div className="article-grid">{articles.map((article) => <ArticleCard key={article.id} article={article} />)}</div> : <p className="empty-state">There are no stories yet. Check back soon.</p>}
      </section>
    </main>
  );
}