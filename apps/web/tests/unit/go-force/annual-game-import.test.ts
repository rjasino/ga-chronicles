import { describe, expect, it } from "vitest";
import {
  ANNUAL_GAME_IMPORT_MAX_BYTES,
  ANNUAL_GAME_IMPORT_MAX_RECORDS,
  annualGameImportTitleKey,
  parseAnnualGameImport,
} from "@/features/go-force/annual-game-import";

function importText(records: unknown[]) {
  return JSON.stringify(records);
}

describe("parseAnnualGameImport", () => {
  it("parses valid records and applies eligibility and display-order defaults", () => {
    const result = parseAnnualGameImport(
      importText([
        {
          title: "  First Game  ",
          gotyYear: 2026,
          developer: "Studio One",
          coverArtUrl: "https://example.com/first.jpg",
        },
        {
          title: "Second Game",
          gotyYear: 2026,
          eligibilityState: "ineligible",
          displayOrder: 12,
          publisher: "Publisher Two",
          genre: "Adventure",
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.gotyYear).toBe(2026);
    expect(result.invalidRecords).toEqual([]);
    expect(result.records).toEqual([
      {
        title: "First Game",
        gotyYear: 2026,
        eligibilityState: "eligible",
        displayOrder: 1,
        developer: "Studio One",
        publisher: null,
        genre: null,
        coverArtUrl: "https://example.com/first.jpg",
      },
      {
        title: "Second Game",
        gotyYear: 2026,
        eligibilityState: "ineligible",
        displayOrder: 12,
        developer: null,
        publisher: "Publisher Two",
        genre: "Adventure",
        coverArtUrl: null,
      },
    ]);
    expect(result.addCount).toBe(2);
    expect(result.skipCount).toBe(0);
  });

  it("defaults display order to the original file position", () => {
    const result = parseAnnualGameImport(
      importText([
        { gotyYear: 2026 },
        { title: "Second", gotyYear: 2026 },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.displayOrder).toBe(2);
    expect(result.invalidRecords).toEqual([
      { position: 1, messages: ["Add a game title."] },
    ]);
  });

  it("rejects malformed JSON, non-array roots, and empty arrays", () => {
    expect(parseAnnualGameImport("")).toEqual({
      ok: false,
      error: "The selected JSON file is empty.",
    });
    expect(parseAnnualGameImport("{not json")).toEqual({
      ok: false,
      error: "The selected file is not valid JSON.",
    });
    expect(parseAnnualGameImport('{"title":"Game"}')).toEqual({
      ok: false,
      error: "The JSON file must contain an array of game records.",
    });
    expect(parseAnnualGameImport("[]")).toEqual({
      ok: false,
      error: "The JSON file must contain at least one game record.",
    });
  });

  it("rejects files over 512 KiB before parsing", () => {
    const result = parseAnnualGameImport(importText([{ title: "Game", gotyYear: 2026 }]), {
      byteLength: ANNUAL_GAME_IMPORT_MAX_BYTES + 1,
    });

    expect(result).toEqual({
      ok: false,
      error: "Choose a JSON file that is 512 KiB or smaller.",
    });
  });

  it("rejects more than 500 records", () => {
    const records = Array.from({ length: ANNUAL_GAME_IMPORT_MAX_RECORDS + 1 }, (_, index) => ({
      title: `Game ${index + 1}`,
      gotyYear: 2026,
    }));

    expect(parseAnnualGameImport(importText(records))).toEqual({
      ok: false,
      error: "Import at most 500 games at a time.",
    });
  });

  it("rejects a file that mixes GOTY years", () => {
    const result = parseAnnualGameImport(
      importText([
        { title: "One", gotyYear: 2026 },
        { title: "Two", gotyYear: 2027 },
      ]),
    );

    expect(result).toEqual({
      ok: false,
      error: "All records in the file must use the same GOTY year.",
    });
  });

  it("reports positioned findings for invalid field values", () => {
    const result = parseAnnualGameImport(
      importText([
        { title: "", gotyYear: 2026 },
        { title: "Bad Year", gotyYear: 1999 },
        { title: "Bad Eligibility", gotyYear: 2026, eligibilityState: "maybe" },
        { title: "Bad Order", gotyYear: 2026, displayOrder: 10001 },
        { title: "Bad Cover", gotyYear: 2026, coverArtUrl: "ftp://example.com/cover.jpg" },
        { title: "Too Long Developer", gotyYear: 2026, developer: "x".repeat(161) },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toEqual([]);
    expect(result.invalidRecords.map((issue) => issue.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.invalidRecords[0]?.messages).toContain("Add a game title.");
    expect(result.invalidRecords[1]?.messages).toContain("Choose a year from 2000 onward.");
    expect(result.invalidRecords[2]?.messages.length).toBeGreaterThan(0);
    expect(result.invalidRecords[3]?.messages.length).toBeGreaterThan(0);
    expect(result.invalidRecords[4]?.messages).toContain("Enter an http or https cover-art URL.");
    expect(result.invalidRecords[5]?.messages).toEqual([
      expect.stringContaining("160"),
    ]);
    expect(result.addCount).toBe(0);
  });

  it("reports records that are not JSON objects", () => {
    const result = parseAnnualGameImport(importText(["Game Title", null, 42]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invalidRecords).toEqual([
      { position: 1, messages: ["Each record must be a JSON object."] },
      { position: 2, messages: ["Each record must be a JSON object."] },
      { position: 3, messages: ["Each record must be a JSON object."] },
    ]);
  });

  it("skips case- and whitespace-insensitive duplicate titles within the file", () => {
    const result = parseAnnualGameImport(
      importText([
        { title: "Hollow Knight", gotyYear: 2026 },
        { title: "  hollow KNIGHT ", gotyYear: 2026 },
        { title: "Celeste", gotyYear: 2026 },
      ]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.additions.map((record) => record.title)).toEqual(["Hollow Knight", "Celeste"]);
    expect(result.duplicateRecords).toEqual([
      { position: 2, title: "hollow KNIGHT", reason: "file" },
    ]);
    expect(result.addCount).toBe(2);
    expect(result.skipCount).toBe(1);
  });

  it("skips titles already in the annual list for the same year only", () => {
    const existingGames = [
      { goty_year: 2026, title: "Hollow Knight" },
      { goty_year: 2025, title: "Celeste" },
    ];
    const result = parseAnnualGameImport(
      importText([
        { title: " hollow knight ", gotyYear: 2026 },
        { title: "Celeste", gotyYear: 2026 },
        { title: "Celeste", gotyYear: 2026 },
      ]),
      { existingGames },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.additions.map((record) => record.title)).toEqual(["Celeste"]);
    expect(result.duplicateRecords).toEqual([
      { position: 1, title: "hollow knight", reason: "existing" },
      { position: 3, title: "Celeste", reason: "file" },
    ]);
    expect(result.addCount).toBe(1);
    expect(result.skipCount).toBe(2);
  });

  it("allows a title that exists for a different year", () => {
    const result = parseAnnualGameImport(
      importText([{ title: "Celeste", gotyYear: 2026 }]),
      { existingGames: [{ goty_year: 2025, title: "Celeste" }] },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.addCount).toBe(1);
    expect(result.duplicateRecords).toEqual([]);
  });

  it("normalizes title keys with trimming and case folding", () => {
    expect(annualGameImportTitleKey("  The Last of Us  ")).toBe("the last of us");
    expect(annualGameImportTitleKey("THE LAST OF US")).toBe("the last of us");
  });
});
