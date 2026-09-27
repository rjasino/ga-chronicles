import { z } from "zod";

export const accountInputSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/),
  email: z.email().transform((value) => value.toLowerCase()),
  roles: z.array(z.enum(["contributor", "moderator"])).min(1),
  password: z.string().min(12).optional(),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(12),
  confirm: z.string().min(12),
}).refine((value) => value.password === value.confirm, { path: ["confirm"], message: "Passwords must match." });
