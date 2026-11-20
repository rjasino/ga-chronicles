import { z } from "zod";
import { sessionRosterSchema } from "@/features/go-force/schemas";

export const annualGameInputSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Add a game title.").max(200, "Keep game titles at 200 characters or fewer."),
  gotyYear: z.coerce
    .number()
    .int("Enter a whole GOTY year.")
    .min(2000, "Choose a year from 2000 onward.")
    .max(2100, "Choose a year no later than 2100."),
  eligibilityState: z.enum(["eligible", "ineligible"]),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
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

export const resultVisibilitySchema = z.object({
  sessionId: z.uuid("Choose a valid Go Force session."),
  resultsVisible: z.boolean(),
});

export type AnnualGameInput = z.infer<typeof annualGameInputSchema>;
