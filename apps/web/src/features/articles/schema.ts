import { z } from "zod";

export const articleTypes = ["news", "review", "commentary/opinion", "interview"] as const;

export const articleInputSchema = z.object({
  title: z.string().trim().min(1, "Add a title."),
  body: z.string().trim().min(1, "Add article content."),
  type: z.enum(articleTypes),
  cover_image: z.string().trim().optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;
