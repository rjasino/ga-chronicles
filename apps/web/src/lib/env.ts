import "server-only";
import { z } from "zod";
export { getPublicEnv } from "@/lib/public-env";

export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this server action.");
  return key;
}

/**
 * Server-side only. Keep this out of publicSchema and only read it from
 * server-only integrations.
 */
export function getWheelOfNamesApiKey(): string {
  const key = process.env.WHEEL_OF_NAMES_API_KEY?.trim();
  if (!key) throw new Error("WHEEL_OF_NAMES_API_KEY is required to spin the roulette.");
  return key;
}

export function getSiteUrl(): string {
  const result = z.string().url().safeParse(process.env.SITE_URL);
  if (!result.success) throw new Error("SITE_URL must be configured as the public application URL.");
  return new URL(result.data).origin;
}
