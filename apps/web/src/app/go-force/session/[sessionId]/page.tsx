import { notFound, redirect } from "next/navigation";
import { PlayerSession } from "@/components/go-force/player-session";
import { getPlayerSessionView } from "@/features/go-force/session-queries";
import { getVerifiedSession } from "@/lib/supabase/session";

export const metadata = {
  title: "Go Force player screen",
};

export default async function GoForcePlayerSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getVerifiedSession();
  if (!session) redirect("/sign-in");

  const view = await getPlayerSessionView(sessionId, session.userId);
  if (!view) notFound();

  return (
    <main className="page-shell min-h-[70vh] py-12 pb-20">
      <p className="article-type m-0 mb-2 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">Go Force {view.session.goty_year}</p>
      <h1 className="m-0 mb-6 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">Player screen</h1>
      <PlayerSession data={view} />
    </main>
  );
}
