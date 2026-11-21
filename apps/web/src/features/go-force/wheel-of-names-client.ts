import "server-only";
import { z } from "zod";
import { getWheelOfNamesApiKey } from "@/lib/env";

export type WheelOfNamesEntry = {
  id: string;
  text: string;
};

export type WheelOfNamesSpinResult = {
  animation: string;
  winner: WheelOfNamesEntry;
};

export type WheelConfig = {
  title: string;
  autoRemoveWinner: true;
  entries: WheelOfNamesEntry[];
};

const DEFAULT_ANIMATE_URL = "https://wheelofnames.com/api/v3/wheels/animate";
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const spinResponseSchema = z.object({
  animation: z.string().min(4).regex(BASE64_PATTERN),
  winner: z.object({
    id: z.string().min(1),
    text: z.string().min(1),
  }),
});

export class WheelOfNamesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WheelOfNamesError";
  }
}

export function buildWheelConfig(entries: WheelOfNamesEntry[]): WheelConfig {
  if (entries.length === 0) {
    throw new WheelOfNamesError("There are no games left to spin in this round.");
  }

  return {
    title: "Go Force",
    autoRemoveWinner: true,
    entries: entries.map(({ id, text }) => ({ id, text })),
  };
}

export async function spinWheelOfNames(
  entries: WheelOfNamesEntry[],
): Promise<WheelOfNamesSpinResult> {
  const apiKey = getWheelOfNamesApiKey();
  const wheelConfig = buildWheelConfig(entries);
  const endpoint = process.env.WHEEL_OF_NAMES_API_URL || DEFAULT_ANIMATE_URL;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ wheelConfig }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new WheelOfNamesError("Wheel of Names is unavailable right now. Please retry.");
  }

  if (!response.ok) {
    throw new WheelOfNamesError(`Wheel of Names could not complete the spin (HTTP ${response.status}).`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WheelOfNamesError("Wheel of Names returned an invalid response. Please retry.");
  }

  const parsed = spinResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new WheelOfNamesError("Wheel of Names returned an invalid response. Please retry.");
  }

  const winningEntry = entries.find(({ id }) => id === parsed.data.winner.id);
  if (!winningEntry) {
    throw new WheelOfNamesError("Wheel of Names returned a game that is not in the current game pool. Please retry.");
  }
  if (winningEntry.text !== parsed.data.winner.text) {
    throw new WheelOfNamesError("Wheel of Names winner title did not match the current game pool. Please retry.");
  }

  return parsed.data;
}
