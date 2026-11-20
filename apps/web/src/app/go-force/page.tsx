import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { getGoForcePageSettings, getLatestGotyYear, listEligibleAnnualGames } from "@/features/go-force/admin-queries";
import { canViewGoForcePage } from "@/features/go-force/access";
import { listPublishedResults } from "@/features/go-force/results-queries";
import { getVerifiedSession } from "@/lib/supabase/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Go Force",
  description: "Game Ako's live Game of the Year selection.",
};

export default async function GoForcePage() {
  const [settings, session] = await Promise.all([getGoForcePageSettings(), getVerifiedSession()]);
  if (!canViewGoForcePage(settings.page_visible, session?.roles ?? [])) notFound();

  const year = await getLatestGotyYear();
  const [games, results] = await Promise.all([listEligibleAnnualGames(year), listPublishedResults(5)]);

  let activeSession: { id: string; status: string; game_master_id: string } | null = null;
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("go_force_sessions")
      .select("id,status,game_master_id")
      .in("status", ["ready", "live", "final_ballot"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    activeSession = data ?? null;
  }
  const facilitatorHref = activeSession && (session?.roles.includes("admin") || activeSession.game_master_id === session?.userId)
    ? `/admin/go-force/sessions/${activeSession.id}`
    : activeSession ? `/go-force/session/${activeSession.id}` : "/go-force";

  return (
    <main className="page-shell min-h-[70vh] py-12 pb-20">
      <section className="border-b-[3px] border-blue pb-6">
        <p className="article-type m-0 mb-2 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">#fortheloveofgaming</p>
        <h1 className="m-0 font-display text-[clamp(2.8rem,7vw,5rem)] leading-[1] tracking-[-.05em] text-blue">Go Force</h1>
        <p className="mt-4 max-w-[720px] text-[1.1rem] text-muted">
          Game Ako&apos;s live Game of the Year selection. A fixed roster plays three rounds of go or no-go votes before the final ballot decides the year&apos;s winner.
        </p>
        <div className="form-actions mt-5">
          {activeSession ? (
            <ButtonLink purpose="primary" href={facilitatorHref}>
              {activeSession.game_master_id === session?.userId || session?.roles.includes("admin") ? "Open facilitator screen" : "Open your session"}
            </ButtonLink>
          ) : session ? (
            <p className="m-0 border-l-4 border-line bg-paper px-4 py-2 text-muted">You are signed in. The game master will share the session link when the show begins.</p>
          ) : (
            <ButtonLink purpose="primary" href="/sign-in">Sign in to join</ButtonLink>
          )}
          {session?.roles.includes("admin") && <ButtonLink purpose="secondary" href="/admin/go-force">Manage Go Force</ButtonLink>}
        </div>
      </section>

      <section className="pt-9" aria-labelledby="go-force-games-heading">
        <div className="section-heading mb-4 flex items-baseline justify-between border-b-[3px] border-blue">
          <h2 id="go-force-games-heading" className="mb-2.5 font-display text-[1.8rem] text-blue">GOTY {year} eligible games</h2>
          <span className="text-[.85rem] text-muted">{games.length} games</span>
        </div>
        {games.length ? (
          <ol className="m-0 grid list-none gap-2 p-0 md:grid-cols-2">
            {games.map((game, index) => (
              <li key={game.id} className="flex items-baseline gap-3 border border-line bg-paper px-4 py-3">
                <span className="font-display text-[1.1rem] font-bold text-red">{index + 1}</span>
                <span className="font-semibold">{game.title}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="bg-paper p-8 text-muted">The eligible game list is being prepared. Check back soon.</p>
        )}
      </section>

      {results.length > 0 && (
        <section className="pt-12" aria-labelledby="go-force-results-heading">
          <div className="section-heading mb-4 flex items-baseline justify-between border-b-[3px] border-blue">
            <h2 id="go-force-results-heading" className="mb-2.5 font-display text-[1.8rem] text-blue">Published results</h2>
          </div>
          <ul className="m-0 grid list-none gap-2 p-0">
            {results.map((result) => (
              <li key={result.sessionId} className="border border-line px-4 py-3">
                <Link className="font-semibold text-blue underline" href={`/go-force/results/${result.sessionId}`}>
                  GOTY {result.gotyYear ?? ""} results
                </Link>
                {result.publishedAt && <span className="ml-3 text-[.85rem] text-muted">{new Date(result.publishedAt).toLocaleDateString()}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
