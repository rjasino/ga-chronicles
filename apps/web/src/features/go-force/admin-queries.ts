import { createClient } from "@/lib/supabase/server";
import type { AnnualGame, GoForcePageSettings, GoForceSession, SessionParticipant } from "@/features/go-force/types";

export type AdminSessionListItem = GoForceSession & {
  participants: number;
  result_visible: boolean;
};

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown | null }>,
  errorMessage: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(errorMessage, { cause: error });
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

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
  return fetchAllPages<AnnualGame>(
    (from, to) => supabase
      .from("go_force_annual_games")
      .select("*")
      .eq("goty_year", year)
      .eq("eligibility_state", "eligible")
      .order("display_order", { ascending: true })
      .order("title", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
    "Could not load the Go Force game list.",
  );
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
  const [{ data: settings }, games, accounts, sessions, resultRows] =
    await Promise.all([
      supabase.from("go_force_page_settings").select("id,page_visible,round_voting_seconds,final_ballot_seconds,updated_by,updated_at").eq("id", true).maybeSingle(),
      fetchAllPages<AnnualGame>(
        (from, to) => supabase.from("go_force_annual_games").select("*")
          .order("goty_year", { ascending: false })
          .order("display_order", { ascending: true })
          .order("title", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
        "Could not load Go Force annual games.",
      ),
      fetchAllPages<{ id: string; username: string; display_name: string | null }>(
        (from, to) => supabase.from("accounts").select("id,username,display_name")
          .eq("status", "active")
          .order("username", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
        "Could not load active accounts for Go Force.",
      ),
      fetchAllPages<GoForceSession>(
        (from, to) => supabase.from("go_force_sessions").select("*")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
        "Could not load Go Force sessions.",
      ),
      fetchAllPages<{ session_id: string; results_visible: boolean }>(
        (from, to) => supabase.from("go_force_results").select("session_id,results_visible")
          .order("session_id", { ascending: true })
          .range(from, to),
        "Could not load Go Force results.",
      ),
    ]);

  const allGames = games as AnnualGame[];
  const years = Array.from(new Set(allGames.map((game) => game.goty_year))).sort((a, b) => b - a);
  const visibleBySession = new Map(
    (resultRows as { session_id: string; results_visible: boolean }[]).map((row) => [
      row.session_id,
      row.results_visible,
    ]),
  );
  const sessionRows = sessions as GoForceSession[];
  const sessionIds = sessionRows.map((session) => session.id);
  const participantRows: Pick<SessionParticipant, "session_id">[] = [];
  for (let start = 0; start < sessionIds.length; start += PAGE_SIZE) {
    const sessionIdBatch = sessionIds.slice(start, start + PAGE_SIZE);
    participantRows.push(
      ...await fetchAllPages<Pick<SessionParticipant, "session_id">>(
        (from, to) => supabase.from("go_force_session_participants").select("session_id")
          .in("session_id", sessionIdBatch)
          .eq("active", true)
          .order("session_id", { ascending: true })
          .order("account_id", { ascending: true })
          .range(from, to),
        "Could not load Go Force session participants.",
      ),
    );
  }
  const participantCounts = participantRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.session_id] = (counts[row.session_id] ?? 0) + 1;
    return counts;
  }, {});

  return {
    settings: settings ?? { id: true, page_visible: false, round_voting_seconds: 10, final_ballot_seconds: 10, updated_by: null, updated_at: new Date(0).toISOString() },
    games: allGames,
    accounts,
    sessions: sessionRows.map((session) => ({
      ...session,
      participants: participantCounts[session.id] ?? 0,
      result_visible: visibleBySession.get(session.id) ?? false,
    })),
    years,
  };
}
