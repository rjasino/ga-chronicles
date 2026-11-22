import { z } from "zod";
import { GO_FORCE_SESSION_STATUSES } from "@/features/go-force/types";

export const sessionIdSchema = z.uuid("Choose a valid Go Force session.");
export const selectionIdSchema = z.uuid("Choose a valid game selection.");
export const accountIdSchema = z.uuid("Choose a valid account.");

export const sessionStatusSchema = z.enum(GO_FORCE_SESSION_STATUSES);

export const gameVoteInputSchema = z.object({
  selectionId: selectionIdSchema,
  choice: z.enum(["go", "no-go"]),
});

export const finalBallotInputSchema = z.object({
  sessionId: sessionIdSchema,
  finalistGameId: z.uuid("Choose a finalist."),
  remark: z
    .string()
    .trim()
    .max(500, "Keep remarks at 500 characters or fewer.")
    .optional()
    .transform((value) => value ?? ""),
});

export const sessionRosterSchema = z
  .array(accountIdSchema)
  .min(1, "Choose at least one player for the roster.")
  .max(64, "Keep the roster at 64 players or fewer.");

export function normalizeRemark(value: string): string {
  return value.trim();
}

export function parseGameVoteForm(formData: FormData) {
  return gameVoteInputSchema.safeParse({
    selectionId: String(formData.get("selectionId") ?? ""),
    choice: String(formData.get("choice") ?? ""),
  });
}

export function parseFinalBallotForm(formData: FormData) {
  return finalBallotInputSchema.safeParse({
    sessionId: String(formData.get("sessionId") ?? ""),
    finalistGameId: String(formData.get("finalistGameId") ?? ""),
    remark: String(formData.get("remark") ?? ""),
  });
}
