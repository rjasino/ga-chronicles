import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getWheelOfNamesApiKey } from "@/lib/env";
import { reportFailure } from "@/lib/error-logging";

export type WheelOfNamesEntry = {
  id: string;
  text: string;
};

export type WheelOfNamesAnimationFormat = "gif" | "webp";

export type WheelOfNamesSpinResult = {
  animation?: string;
  animationFormat: WheelOfNamesAnimationFormat;
  winner: WheelOfNamesEntry;
};

export type WheelOfNamesErrorReason =
  | "availability"
  | "configuration"
  | "empty_pool"
  | "invalid_response"
  | "invalid_winner";

export type WheelConfig = {
  title: string;
  autoRemoveWinner: true;
  entries: WheelOfNamesEntry[];
};

const DEFAULT_ANIMATE_URL = "https://wheelofnames.com/api/v3/wheels/animate";
const REQUESTED_IMAGE_FORMAT = "webp" as const;
const MAX_ANIMATION_BASE64_LENGTH = 12 * 1024 * 1024;

const spinResponseSchema = z.object({
  animation: z.unknown().optional(),
  winner: z.object({
    id: z.string().min(1),
    text: z.string().min(1),
  }),
});

export class WheelOfNamesError extends Error {
  constructor(
    message: string,
    readonly reason: WheelOfNamesErrorReason,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "WheelOfNamesError";
  }
}

function isBase64Animation(value: string): boolean {
  if (value.length < 4 || value.length > MAX_ANIMATION_BASE64_LENGTH || value.length % 4 !== 0) {
    return false;
  }

  const paddingLength = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const contentEnd = value.length - paddingLength;

  for (let index = 0; index < contentEnd; index += 1) {
    const code = value.charCodeAt(index);
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isDigit = code >= 48 && code <= 57;
    if (!isLetter && !isDigit && code !== 43 && code !== 47) return false;
  }

  for (let index = contentEnd; index < value.length; index += 1) {
    if (value.charCodeAt(index) !== 61) return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function logSpinFailure(requestId: string, stage: string, error: unknown) {
  reportFailure({
    operation: `wheel-of-names.${stage}`,
    error,
    context: { requestId, stage },
  });
}

export function buildWheelConfig(entries: WheelOfNamesEntry[]): WheelConfig {
  if (entries.length === 0) {
    throw new WheelOfNamesError("There are no games left to spin in this round.", "empty_pool");
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
  const requestId = randomUUID();
  let apiKey: string;
  let wheelConfig: WheelConfig;

  try {
    apiKey = getWheelOfNamesApiKey();
    wheelConfig = buildWheelConfig(entries);
  } catch (error) {
    if (error instanceof WheelOfNamesError) {
      throw new WheelOfNamesError(error.message, error.reason, requestId);
    }
    if (error instanceof Error && error.message.includes("WHEEL_OF_NAMES_API_KEY")) {
      throw new WheelOfNamesError(error.message, "configuration", requestId);
    }
    logSpinFailure(requestId, "configuration", error);
    throw new WheelOfNamesError(
      "Wheel of Names could not start the spin. Please retry.",
      "configuration",
      requestId,
    );
  }

  const endpoint = process.env.WHEEL_OF_NAMES_API_URL || DEFAULT_ANIMATE_URL;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        wheelConfig,
        imageFormat: REQUESTED_IMAGE_FORMAT,
        size: 300,
        fps: 15,
        loop: false,
        responseFormat: "json",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    logSpinFailure(requestId, "provider-request", error);
    throw new WheelOfNamesError(
      "Wheel of Names is unavailable right now. Please retry.",
      "availability",
      requestId,
    );
  }

  console.info("[Wheel of Names] provider response", {
    requestId,
    status: response.status,
    contentType: response.headers.get("content-type"),
  });

  if (!response.ok) {
    throw new WheelOfNamesError(
      `Wheel of Names could not complete the spin (HTTP ${response.status}).`,
      "availability",
      requestId,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    // Avoid forwarding parser text: JSON syntax errors may echo provider body content.
    const parseError = new Error(
      `Could not parse the provider response (${error instanceof Error ? error.name : "UnknownError"}).`,
    );
    logSpinFailure(requestId, "response-json", parseError);
    throw new WheelOfNamesError(
      "Wheel of Names returned an invalid response. Please retry.",
      "invalid_response",
      requestId,
    );
  }

  const bodyRecord = isRecord(body) ? body : {};
  const winnerRecord = isRecord(bodyRecord.winner) ? bodyRecord.winner : {};
  console.info("[Wheel of Names] response metadata", {
    requestId,
    animationLength: typeof bodyRecord.animation === "string" ? bodyRecord.animation.length : null,
    winnerIdPresent: typeof winnerRecord.id === "string",
    winnerTextPresent: typeof winnerRecord.text === "string",
  });

  let parsed;
  try {
    parsed = spinResponseSchema.safeParse(body);
  } catch (error) {
    logSpinFailure(requestId, "response-schema", error);
    throw new WheelOfNamesError(
      "Wheel of Names returned an invalid response. Please retry.",
      "invalid_response",
      requestId,
    );
  }

  if (!parsed.success) {
    console.warn("[Wheel of Names] response schema rejected", {
      requestId,
      issues: parsed.error.issues.map(({ code, path }) => ({ code, path })),
    });
    throw new WheelOfNamesError(
      "Wheel of Names returned an invalid response. Please retry.",
      "invalid_response",
      requestId,
    );
  }

  const winningEntry = entries.find(({ id }) => id === parsed.data.winner.id);
  if (!winningEntry) {
    throw new WheelOfNamesError(
      "Wheel of Names returned a game that is not in the current game pool. Please retry.",
      "invalid_winner",
      requestId,
    );
  }
  if (winningEntry.text !== parsed.data.winner.text) {
    throw new WheelOfNamesError(
      "Wheel of Names winner title did not match the current game pool. Please retry.",
      "invalid_winner",
      requestId,
    );
  }

  const animationData = parsed.data.animation;
  let animation: string | undefined;
  if (typeof animationData === "string" && animationData.length > MAX_ANIMATION_BASE64_LENGTH) {
    console.warn("[Wheel of Names] animation exceeds size limit; continuing without animation", {
      requestId,
      animationLength: animationData.length,
      maxLength: MAX_ANIMATION_BASE64_LENGTH,
    });
  } else if (typeof animationData === "string" && isBase64Animation(animationData)) {
    animation = animationData;
  } else {
    console.warn(
      "[Wheel of Names] animation is unavailable or invalid; continuing without animation",
      {
        requestId,
        animationLength: typeof animationData === "string" ? animationData.length : null,
      },
    );
  }

  return {
    ...(animation ? { animation } : {}),
    animationFormat: REQUESTED_IMAGE_FORMAT,
    winner: winningEntry,
  };
}
