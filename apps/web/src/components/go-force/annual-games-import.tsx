"use client";

import { useState, useActionState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";
import {
  importAnnualGames,
  type AnnualGameImportActionState,
} from "@/features/go-force/admin-actions";
import {
  ANNUAL_GAME_IMPORT_MAX_BYTES,
  ANNUAL_GAME_IMPORT_MAX_RECORDS,
  parseAnnualGameImport,
  type AnnualGameImportExisting,
  type AnnualGameImportSuccess,
} from "@/features/go-force/annual-game-import";

function formatSizeLimit(bytes: number): string {
  return `${Math.round(bytes / 1024)} KiB`;
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("The file could not be read."));
    reader.readAsText(file);
  });
}

export function AnnualGamesImport({
  existingGames,
}: {
  existingGames: readonly AnnualGameImportExisting[];
}) {
  const [review, setReview] = useState<AnnualGameImportSuccess | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [state, action, pending] = useActionState<AnnualGameImportActionState, FormData>(
    async (previous, formData) => {
      setHasSubmitted(true);
      const next = await importAnnualGames(previous, formData);
      if (next.success) {
        setShowSuccess(true);
        setHasSubmitted(false);
        setReview(null);
        setRawText(null);
        setFileError(null);
        setFileInputKey((key) => key + 1);
      }
      return next;
    },
    {},
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setReview(null);
    setRawText(null);
    setFileError(null);
    setHasSubmitted(false);
    setShowSuccess(false);
    if (!file) return;

    if (file.size > ANNUAL_GAME_IMPORT_MAX_BYTES) {
      setFileError(
        `Choose a JSON file that is ${formatSizeLimit(ANNUAL_GAME_IMPORT_MAX_BYTES)} or smaller.`,
      );
      return;
    }

    try {
      const text = await readFileText(file);
      const result = parseAnnualGameImport(text, { existingGames, byteLength: file.size });
      if (!result.ok) {
        setFileError(result.error);
        return;
      }
      setRawText(text);
      setReview(result);
    } catch {
      setFileError("The selected file could not be read.");
    }
  }

  function cancelReview() {
    setReview(null);
    setRawText(null);
    setFileError(null);
    setHasSubmitted(false);
    setShowSuccess(false);
    setFileInputKey((key) => key + 1);
  }

  const confirmationBlocked = pending || !review || review.invalidRecords.length > 0 || review.addCount === 0;

  return (
    <div className="grid gap-4 border border-line bg-paper p-4">
      <div>
        <h3 className="m-0 font-display text-[1.25rem] text-blue">Import games from JSON</h3>
        <p className="m-0 mt-1 text-[.9rem] text-muted">
          Choose a JSON array for one GOTY year. Up to {ANNUAL_GAME_IMPORT_MAX_RECORDS} records and{" "}
          {formatSizeLimit(ANNUAL_GAME_IMPORT_MAX_BYTES)}. Duplicate titles are skipped and existing
          games are never changed.
        </p>
      </div>

      <TextField
        key={fileInputKey}
        label="Games JSON file"
        name="gamesJsonFile"
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        hint="The file is checked before anything is saved. The manual add form below still works for one game."
      />

      {fileError && <Message tone="error">{fileError}</Message>}

      {review && (
        <section aria-labelledby="annual-game-import-review" className="grid gap-3">
          <h4 id="annual-game-import-review" className="m-0 font-display text-[1.1rem] text-blue">
            Review import
          </h4>
          <p className="m-0" role="status">
            {review.gotyYear === null ? "No valid GOTY year" : `GOTY ${review.gotyYear}`} ·{" "}
            {review.addCount} to add · {review.skipCount} to skip
          </p>

          {review.invalidRecords.length > 0 && (
            <div className="border-l-4 border-red bg-danger-bg px-3 py-2.5 text-danger-ink">
              <p className="m-0 font-semibold">Fix these records before importing:</p>
              <ul className="m-0 mt-1 pl-5">
                {review.invalidRecords.map((issue) => (
                  <li key={issue.position}>
                    Record {issue.position}: {issue.messages.join(" ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.duplicateRecords.length > 0 && (
            <div className="border-l-4 border-gold bg-paper px-3 py-2.5">
              <p className="m-0 font-semibold">Duplicates will be skipped:</p>
              <ul className="m-0 mt-1 pl-5">
                {review.duplicateRecords.map((duplicate) => (
                  <li key={`${duplicate.position}-${duplicate.reason}`}>
                    Record {duplicate.position}: “{duplicate.title}”{" "}
                    {duplicate.reason === "existing"
                      ? "is already in the annual list for this year"
                      : "repeats an earlier title in this file"}
                    .
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.records.length > 0 && (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Parsed annual game records"
            >
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">Parsed annual game records</caption>
                <thead>
                  <tr className="border-b-2 border-line">
                    <th scope="col" className="p-2">
                      #
                    </th>
                    <th scope="col" className="p-2">
                      Title
                    </th>
                    <th scope="col" className="p-2">
                      Year
                    </th>
                    <th scope="col" className="p-2">
                      Eligibility
                    </th>
                    <th scope="col" className="p-2">
                      Order
                    </th>
                    <th scope="col" className="p-2">
                      Developer
                    </th>
                    <th scope="col" className="p-2">
                      Publisher
                    </th>
                    <th scope="col" className="p-2">
                      Genre
                    </th>
                    <th scope="col" className="p-2">
                      Cover art URL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {review.records.map((record, index) => (
                    <tr key={`${index}-${record.title}`} className="border-b border-line">
                      <td className="p-2">{review.recordPositions[index]}</td>
                      <th scope="row" className="p-2 text-left font-semibold">
                        {record.title}
                      </th>
                      <td className="p-2">{record.gotyYear}</td>
                      <td className="p-2">{record.eligibilityState}</td>
                      <td className="p-2">{record.displayOrder}</td>
                      <td className="p-2">{record.developer ?? "—"}</td>
                      <td className="p-2">{record.publisher ?? "—"}</td>
                      <td className="p-2">{record.genre ?? "—"}</td>
                      <td className="p-2">{record.coverArtUrl ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {review.addCount === 0 && review.invalidRecords.length === 0 && (
            <p className="m-0 text-[.9rem] text-muted">
              Every record in this file is already on the annual list or repeated in the file, so
              there is nothing new to add.
            </p>
          )}

          {state.error && hasSubmitted && <Message tone="error">{state.error}</Message>}

          <form className="flex flex-wrap gap-2" action={action}>
            <input type="hidden" name="json" value={rawText ?? ""} />
            <Button purpose="primary" pending={pending} disabled={confirmationBlocked}>
              Confirm import
            </Button>
            <Button purpose="secondary" type="button" onClick={cancelReview}>
              Cancel
            </Button>
          </form>
        </section>
      )}

      {showSuccess && state.success && !review && (
        <Message tone="success">{state.success}</Message>
      )}
    </div>
  );
}
