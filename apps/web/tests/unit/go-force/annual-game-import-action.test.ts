import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));

import { importAnnualGames } from "@/features/go-force/admin-actions";

type SupabaseError = { code: string; message: string };

function setupSupabase(
  existingTitles: string[] = [],
  options: { insertError?: SupabaseError; insertedIds?: string[] } = {},
) {
  const existingQuery = {
    eq: vi.fn(async () => ({ data: existingTitles.map((title) => ({ title })), error: null })),
  };
  const select = vi.fn(() => existingQuery);
  const insertReturn = {
    select: vi.fn(async () =>
      options.insertError
        ? { data: null, error: options.insertError }
        : { data: (options.insertedIds ?? []).map((id) => ({ id })), error: null },
    ),
  };
  const insert = vi.fn(() => insertReturn);
  const from = vi.fn(() => ({ select, insert }));
  mocks.createClient.mockResolvedValue({ from });
  return { from, select, insert, insertReturn };
}

function formFor(records: unknown[]) {
  const formData = new FormData();
  formData.set("json", JSON.stringify(records));
  return formData;
}

describe("importAnnualGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "admin-id",
      username: "admin",
      roles: ["admin"],
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts an authorized valid batch in one statement and revalidates both routes", async () => {
    const supabase = setupSupabase([], { insertedIds: ["new-1", "new-2"] });

    await expect(
      importAnnualGames(
        {},
        formFor([
          { title: "First Game", gotyYear: 2026 },
          {
            title: "Second Game",
            gotyYear: 2026,
            eligibilityState: "ineligible",
            displayOrder: 7,
            developer: "Studio",
            publisher: "Publisher",
            genre: "Puzzle",
            coverArtUrl: "https://example.com/cover.jpg",
          },
        ]),
      ),
    ).resolves.toEqual({
      addedCount: 2,
      skippedCount: 0,
      success: "Added 2 games. Skipped 0 duplicate games.",
    });

    expect(supabase.insert).toHaveBeenCalledTimes(1);
    expect(supabase.insert).toHaveBeenCalledWith([
      {
        title: "First Game",
        goty_year: 2026,
        eligibility_state: "eligible",
        display_order: 1,
        developer: null,
        publisher: null,
        genre: null,
        cover_art_url: null,
      },
      {
        title: "Second Game",
        goty_year: 2026,
        eligibility_state: "ineligible",
        display_order: 7,
        developer: "Studio",
        publisher: "Publisher",
        genre: "Puzzle",
        cover_art_url: "https://example.com/cover.jpg",
      },
    ]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/go-force");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/go-force");
  });

  it("skips titles already on the annual list without updating them", async () => {
    const supabase = setupSupabase(["Hollow Knight"], { insertedIds: ["new-1"] });

    await expect(
      importAnnualGames(
        {},
        formFor([
          { title: " hollow KNIGHT ", gotyYear: 2026 },
          { title: "Celeste", gotyYear: 2026 },
        ]),
      ),
    ).resolves.toEqual({
      addedCount: 1,
      skippedCount: 1,
      success: "Added 1 game. Skipped 1 duplicate game.",
    });

    expect(supabase.insert).toHaveBeenCalledWith([
      {
        title: "Celeste",
        goty_year: 2026,
        eligibility_state: "eligible",
        display_order: 2,
        developer: null,
        publisher: null,
        genre: null,
        cover_art_url: null,
      },
    ]);
  });

  it("skips duplicate titles inside the file", async () => {
    const supabase = setupSupabase([], { insertedIds: ["new-1"] });

    await expect(
      importAnnualGames(
        {},
        formFor([
          { title: "Celeste", gotyYear: 2026 },
          { title: "celeste", gotyYear: 2026 },
        ]),
      ),
    ).resolves.toEqual({
      addedCount: 1,
      skippedCount: 1,
      success: "Added 1 game. Skipped 1 duplicate game.",
    });

    expect(supabase.insert).toHaveBeenCalledTimes(1);
  });

  it("reports a zero-add import without writing", async () => {
    const supabase = setupSupabase(["Celeste"]);

    await expect(
      importAnnualGames({}, formFor([{ title: "celeste", gotyYear: 2026 }])),
    ).resolves.toEqual({
      addedCount: 0,
      skippedCount: 1,
      success: "No new games were added. 1 duplicate game was skipped.",
    });

    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it("rejects an account without the Go Force admin role", async () => {
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "reader-id",
      username: "reader",
      roles: ["reader"],
    });

    await expect(
      importAnnualGames({}, formFor([{ title: "Celeste", gotyYear: 2026 }])),
    ).resolves.toEqual({ error: "Only an admin can import the annual game list." });

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized request with no verified session", async () => {
    mocks.getVerifiedSession.mockResolvedValue(null);

    await expect(
      importAnnualGames({}, formFor([{ title: "Celeste", gotyYear: 2026 }])),
    ).resolves.toEqual({ error: "Only an admin can import the annual game list." });

    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects invalid records before touching the database", async () => {
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "admin-id",
      username: "admin",
      roles: ["admin"],
    });

    await expect(
      importAnnualGames({}, formFor([{ title: "", gotyYear: 2026 }])),
    ).resolves.toEqual({ error: "Fix the invalid records in the file before importing." });

    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a mixed-year file before touching the database", async () => {
    await expect(
      importAnnualGames(
        {},
        formFor([
          { title: "One", gotyYear: 2026 },
          { title: "Two", gotyYear: 2027 },
        ]),
      ),
    ).resolves.toEqual({ error: "All records in the file must use the same GOTY year." });

    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a file larger than 512 KiB", async () => {
    const formData = new FormData();
    formData.set("json", JSON.stringify([{ title: "x".repeat(524_289), gotyYear: 2026 }]));

    await expect(importAnnualGames({}, formData)).resolves.toEqual({
      error: "Choose a JSON file that is 512 KiB or smaller.",
    });

    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports a concurrent uniqueness conflict without claiming a partial save", async () => {
    setupSupabase([], { insertError: { code: "23505", message: "duplicate key" } });

    await expect(
      importAnnualGames({}, formFor([{ title: "Celeste", gotyYear: 2026 }])),
    ).resolves.toEqual({
      error:
        "Another admin added one of these games while you were reviewing. Nothing was saved. Refresh and review the file again.",
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a generic persistence failure as an atomic batch failure", async () => {
    setupSupabase([], { insertError: { code: "XX000", message: "write failed" } });

    await expect(
      importAnnualGames({}, formFor([{ title: "Celeste", gotyYear: 2026 }])),
    ).resolves.toMatchObject({
      error:
        "The games could not be saved. Nothing from the batch was saved. Refresh and review the file again.",
      errorId: expect.any(String),
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
