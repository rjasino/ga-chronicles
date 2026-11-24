import { notFound, redirect } from "next/navigation";
import { FacilitatorSession } from "@/components/go-force/facilitator-session";
import { isGoForceAdmin, isGoForceGameMaster } from "@/features/go-force/access";
import {
  getActiveGoForceAccountOptions,
  getFacilitatorSessionView,
} from "@/features/go-force/session-queries";
import type { ActiveGoForceAccountOption } from "@/features/go-force/types";
import { getVerifiedSession } from "@/lib/supabase/session";

export const metadata = {
  title: "Go Force facilitator",
};

export default async function GoForceFacilitatorPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const account = await getVerifiedSession();
  if (!account) redirect("/sign-in");

  const view = await getFacilitatorSessionView(sessionId);
  if (!view) notFound();
  if (
    !isGoForceAdmin(account.roles) &&
    !isGoForceGameMaster(account.userId, view.session.game_master_id)
  )
    notFound();
  const sessionCanAddParticipants =
    view.session.status === "live" || view.session.status === "final_ballot";
  const accountOptions = sessionCanAddParticipants
    ? await getActiveGoForceAccountOptions(sessionId)
    : { accounts: [], canAdd: false };
  const addableAccounts: ActiveGoForceAccountOption[] = accountOptions.accounts;
  const canAddParticipants = sessionCanAddParticipants && accountOptions.canAdd;

  return (
    <main className="page-shell admin-page min-h-[70vh] py-12 pb-20">
      <p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">
        Facilitator screen
      </p>
      <h1 className="m-0 mb-6 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">
        Go Force GOTY {view.session.goty_year}
      </h1>
      <FacilitatorSession
        data={view}
        addableAccounts={addableAccounts}
        canAddParticipants={canAddParticipants}
      />
    </main>
  );
}
