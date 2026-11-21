import { createClient } from "@/lib/supabase/server";
import type { AnnualGame, GoForcePageSettings, GoForceSession, SessionParticipant } from "@/features/go-force/types";

export type AdminSessionListItem = GoForceSession & {
  participants: number;
  result_visible: boolean;
};

export async function getGoForcePageSettings(): Promise<GoForcePageSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("go_force_page_settings")
    .select("id,page_visible,round_voting_seconds,final_ballot_seconds,updated_by,updated_at")
    .eq("id", true)
    .maybeSingle();
  return data ?? { id: true, page_visible: false, round_voting_seconds: 10, final_ballot_seconds: 10, updated_by: null, updated_at: new Date(0).toISOString() };
}

export async function listEligibleAnnualGames(year: number): Promise<AnnualGame[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("go_force_annual_games")
    .select("*")
    .eq("goty_year", year)
    .eq("eligibility_state", "eligible")
    .order("display_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw new Error("Could not load the Go Force game list.", { cause: error });
  return (data ?? []) as AnnualGame[];
}

export async function getLatestGotyYear(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("go_force_annual_games")
    .select("goty_year")
    .eq("eligibility_state", "eligible")
    .order("goty_year", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.goty_year ?? new Date().getFullYear();
}

export type GoForceAdminData = {
  settings: GoForcePageSettings;
  games: AnnualGame[];
  accounts: { id: string; username: string; display_name: string | null }[];
  sessions: AdminSessionListItem[];
  years: number[];
};

export async function getGoForceAdminData(): Promise<GoForceAdminData> {
  const supabase = await createClient();
  const [{ data: settings }, { data: games }, { data: accounts }, { data: sessions }, { data: resultRows }] =
    await Promise.all([
      supabase.from("go_force_page_settings").select("id,page_visible,round_voting_seconds,final_ballot_seconds,updated_by,updated_at").eq("id", true).maybeSingle(),
      supabase.from("go_force_annual_games").select("*").order("goty_year", { ascending: false }).order("display_order", { ascending: true }).order("title", { ascending: true }),
      supabase.from("accounts").select("id,username,display_name").eq("status", "active").order("username", { ascending: true }),
      supabase.from("go_force_sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("go_force_results").select("session_id,results_visible"),
    ]);

  const allGames = (games ?? []) as AnnualGame[];
  const years = Array.from(new Set(allGames.map((game) => game.goty_year))).sort((a, b) => b - a);
  const visibleBySession = new Map((resultRows ?? []).map((row) => [row.session_id, row.results_visible]));
  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: participantRows } = sessionIds.length
    ? await supabase.from("go_force_session_participants").select("session_id").in("session_id", sessionIds).eq("active", true)
    : { data: [] as Pick<SessionParticipant, "session_id">[] };
  const participantCounts = (participantRows ?? []).reduce<Record<string, number>>((counts, row) => {
    counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
    return counts;
  }, {});

  return {
    settings: settings ?? { id: true, page_visible: false, round_voting_seconds: 10, final_ballot_seconds: 10, updated_by: null, updated_at: new Date(0).toISOString() },
    games: allGames,
    accounts: accounts ?? [],
    sessions: ((sessions ?? []) as GoForceSession[]).map((session) => ({
      ...session,
      participants: participantCounts[session.id] ?? 0,
      result_visible: visibleBySession.get(session.id) ?? false,
    })),
    years,
  };
}
