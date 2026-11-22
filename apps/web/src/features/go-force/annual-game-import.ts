import { annualGameInputSchema } from "@/features/go-force/admin-schemas";
import type { AnnualGameEligibility } from "@/features/go-force/types";

/** Maximum accepted JSON file size: 512 KiB. */
export const ANNUAL_GAME_IMPORT_MAX_BYTES = 524_288;

/** Maximum accepted number of game records in one file. */
export const ANNUAL_GAME_IMPORT_MAX_RECORDS = 500;

export type AnnualGameImportRecord = {
  title: string;
  gotyYear: number;
  eligibilityState: AnnualGameEligibility;
  displayOrder: number;
  developer: string | null;
  publisher: string | null;
  genre: string | null;
  coverArtUrl: string | null;
};

export type AnnualGameImportIssue = {
  /** One-based position of the record in the uploaded array. */
  position: number;
  messages: string[];
};

export type AnnualGameImportDuplicate = {
  /** One-based position of the duplicate record in the uploaded array. */
  position: number;
  title: string;
  reason: "file" | "existing";
};

export type AnnualGameImportFailure = {
  ok: false;
  error: string;
};

export type AnnualGameImportSuccess = {
  ok: true;
  /** The single GOTY year shared by the valid records, or null when none are valid. */
  gotyYear: number | null;
  /** Valid records, including duplicates, in file order. */
  records: AnnualGameImportRecord[];
  /** One-based file positions matching `records`. */
  recordPositions: number[];
  /** Valid, non-duplicate records ready to insert. */
  additions: AnnualGameImportRecord[];
  invalidRecords: AnnualGameImportIssue[];
  duplicateRecords: AnnualGameImportDuplicate[];
  addCount: number;
  skipCount: number;
};

export type AnnualGameImportResult = AnnualGameImportFailure | AnnualGameImportSuccess;

export type AnnualGameImportExisting = {
  goty_year: number;
  title: string;
};

export type AnnualGameImportOptions = {
  /** Annual games already stored, used to report existing-title duplicates. */
  existingGames?: readonly AnnualGameImportExisting[];
  /** File size in bytes; defaults to the UTF-8 length of the submitted text. */
  byteLength?: number;
};

const importRecordSchema = annualGameInputSchema.omit({ id: true });

/** Normalizes a title for the case-insensitive, trimmed uniqueness rule. */
export function annualGameImportTitleKey(title: string): string {
  return title.trim().toLocaleLowerCase();
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordMessages(messages: string[]): string[] {
  return Array.from(new Set(messages.filter(Boolean)));
}

/**
 * Parses and validates one annual-game JSON document for review or server-side
 * revalidation. Structural problems reject the whole file; per-record problems
 * are returned as positioned findings so the admin can correct the file.
 */
export function parseAnnualGameImport(
  rawText: string,
  { existingGames = [], byteLength = utf8ByteLength(rawText) }: AnnualGameImportOptions = {},
): AnnualGameImportResult {
  if (byteLength > ANNUAL_GAME_IMPORT_MAX_BYTES) {
    return { ok: false, error: "Choose a JSON file that is 512 KiB or smaller." };
  }
  if (!rawText.trim()) {
    return { ok: false, error: "The selected JSON file is empty." };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "The selected file is not valid JSON." };
  }

  if (!Array.isArray(parsedJson)) {
    return { ok: false, error: "The JSON file must contain an array of game records." };
  }
  if (parsedJson.length === 0) {
    return { ok: false, error: "The JSON file must contain at least one game record." };
  }
  if (parsedJson.length > ANNUAL_GAME_IMPORT_MAX_RECORDS) {
    return {
      ok: false,
      error: `Import at most ${ANNUAL_GAME_IMPORT_MAX_RECORDS} games at a time.`,
    };
  }

  const records: { record: AnnualGameImportRecord; position: number }[] = [];
  const invalidRecords: AnnualGameImportIssue[] = [];

  parsedJson.forEach((entry, index) => {
    const position = index + 1;
    if (!isRecord(entry)) {
      invalidRecords.push({ position, messages: ["Each record must be a JSON object."] });
      return;
    }

    const parsed = importRecordSchema.safeParse({
      title: entry.title ?? "",
      gotyYear: entry.gotyYear,
      eligibilityState: entry.eligibilityState ?? "eligible",
      displayOrder: entry.displayOrder ?? position,
      developer: entry.developer,
      publisher: entry.publisher,
      genre: entry.genre,
      coverArtUrl: entry.coverArtUrl,
    });

    if (!parsed.success) {
      invalidRecords.push({
        position,
        messages: recordMessages(parsed.error.issues.map((issue) => issue.message)),
      });
      return;
    }

    records.push({
      position,
      record: {
        title: parsed.data.title,
        gotyYear: parsed.data.gotyYear,
        eligibilityState: parsed.data.eligibilityState,
        displayOrder: parsed.data.displayOrder ?? position,
        developer: parsed.data.developer ?? null,
        publisher: parsed.data.publisher ?? null,
        genre: parsed.data.genre ?? null,
        coverArtUrl: parsed.data.coverArtUrl ?? null,
      },
    });
  });

  const years = Array.from(new Set(records.map(({ record }) => record.gotyYear)));
  if (years.length > 1) {
    return {
      ok: false,
      error: "All records in the file must use the same GOTY year.",
    };
  }
  const gotyYear = years[0] ?? null;

  const existingKeys = new Set(
    existingGames.map((game) => `${game.goty_year}:${annualGameImportTitleKey(game.title)}`),
  );
  const seenKeys = new Set<string>();
  const additions: AnnualGameImportRecord[] = [];
  const duplicateRecords: AnnualGameImportDuplicate[] = [];

  records.forEach(({ record, position }) => {
    const key = annualGameImportTitleKey(record.title);
    const scopedKey = `${record.gotyYear}:${key}`;
    if (existingKeys.has(scopedKey)) {
      duplicateRecords.push({ position, title: record.title, reason: "existing" });
      return;
    }
    if (seenKeys.has(key)) {
      duplicateRecords.push({ position, title: record.title, reason: "file" });
      return;
    }
    seenKeys.add(key);
    additions.push(record);
  });

  return {
    ok: true,
    gotyYear,
    records: records.map(({ record }) => record),
    recordPositions: records.map(({ position }) => position),
    additions,
    invalidRecords,
    duplicateRecords,
    addCount: additions.length,
    skipCount: duplicateRecords.length,
  };
}
