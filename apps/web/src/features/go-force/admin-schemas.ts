import { z } from "zod";
import { sessionRosterSchema } from "@/features/go-force/schemas";

const optionalMetadata = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(maxLength).nullable().optional(),
  );

const optionalCoverUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(2048)
    .url()
    .refine((value) => {
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Enter an http or https cover-art URL.")
    .nullable()
    .optional(),
);

export const annualGameInputSchema = z.object({
  id: z.uuid().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Add a game title.")
    .max(200, "Keep game titles at 200 characters or fewer."),
  gotyYear: z.coerce
    .number()
    .int("Enter a whole GOTY year.")
    .min(2000, "Choose a year from 2000 onward.")
    .max(2100, "Choose a year no later than 2100."),
  eligibilityState: z.enum(["eligible", "ineligible"]),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
  developer: optionalMetadata(160),
  publisher: optionalMetadata(160),
  genre: optionalMetadata(120),
  coverArtUrl: optionalCoverUrl,
});

export const goForceVotingSettingsSchema = z.object({
  roundVotingSeconds: z.coerce.number().int().min(5).max(600),
  roundVotingTimed: z.boolean(),
  finalBallotSeconds: z.coerce.number().int().min(5).max(600),
  finalBallotTimed: z.boolean(),
  minimumRoundThreeGoVoters: z.coerce.number().int().min(1).max(64),
});

export const pageVisibilitySchema = z.object({
  pageVisible: z.boolean(),
});

export const createSessionSchema = z.object({
  gotyYear: z.coerce
    .number()
    .int("Enter a whole GOTY year.")
    .min(2000, "Choose a year from 2000 onward.")
    .max(2100, "Choose a year no later than 2100."),
  participantIds: sessionRosterSchema,
});

export const addSessionParticipantSchema = z.object({
  sessionId: z.uuid("Choose a valid Go Force session."),
  accountId: z.uuid("Choose a valid player to add."),
});

export const resultVisibilitySchema = z.object({
  sessionId: z.uuid("Choose a valid Go Force session."),
  resultsVisible: z.boolean(),
});

export type AnnualGameInput = z.infer<typeof annualGameInputSchema>;
