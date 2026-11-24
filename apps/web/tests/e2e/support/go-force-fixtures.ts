import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function goForceServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Local Supabase credentials are required for Go Force browser fixtures.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function unusedGoForceYear(service: SupabaseClient): Promise<number> {
  const { data: games, error: gamesError } = await service
    .from("go_force_annual_games")
    .select("goty_year")
    .eq("eligibility_state", "eligible");
  if (gamesError) throw gamesError;
  const { data: sessions, error: sessionsError } = await service
    .from("go_force_sessions")
    .select("goty_year")
    .in("status", ["ready", "live", "final_ballot"]);
  if (sessionsError) throw sessionsError;

  const occupiedYears = new Set([
    ...(games ?? []).map((game) => game.goty_year),
    ...(sessions ?? []).map((session) => session.goty_year),
  ]);
  const start = Date.now() % 101;
  for (let offset = 0; offset < 101; offset += 1) {
    const year = 2000 + ((start + offset) % 101);
    if (!occupiedYears.has(year)) return year;
  }
  throw new Error("No unused Go Force game year is available for this browser fixture.");
}

export async function readyGoForceSessionId(
  service: SupabaseClient,
  gotyYear: number,
): Promise<string> {
  const { data: session, error } = await service
    .from("go_force_sessions")
    .select("id")
    .eq("goty_year", gotyYear)
    .eq("status", "ready")
    .single();
  if (error || !session)
    throw error ?? new Error(`No ready Go Force session exists for ${gotyYear}.`);
  return session.id;
}

export async function seedGoForceFixtureGames(
  service: SupabaseClient,
  gotyYear: number,
  titles: string[],
): Promise<void> {
  const { error } = await service.from("go_force_annual_games").insert(
    titles.map((title, index) => ({
      goty_year: gotyYear,
      title,
      eligibility_state: "eligible",
      display_order: index + 1,
    })),
  );
  if (error) throw error;
}

export async function cleanupGoForceFixture(
  service: SupabaseClient,
  sessionId: string | null,
  year: number,
  titles: string[],
) {
  if (sessionId) {
    const { error } = await service.from("go_force_sessions").delete().eq("id", sessionId);
    if (error) throw error;
  }
  if (titles.length > 0) {
    const { error } = await service
      .from("go_force_annual_games")
      .delete()
      .eq("goty_year", year)
      .in("title", titles);
    if (error) throw error;
  }
}
