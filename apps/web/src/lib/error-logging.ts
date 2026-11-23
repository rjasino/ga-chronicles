import "server-only";

export const UNEXPECTED_ERROR_MESSAGE =
  "The operation could not be completed. Please try again.";

const MAX_OPERATION_LENGTH = 120;
const MAX_ERROR_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4_000;
const MAX_CONTEXT_VALUE_LENGTH = 200;
const MAX_CONTEXT_FIELDS = 12;

const ALLOWED_CONTEXT_FIELDS = new Set([
  "route",
  "routePath",
  "routerKind",
  "routeType",
  "renderSource",
  "revalidateReason",
  "renderType",
  "stage",
  "status",
  "code",
  "requestId",
  "providerRequestId",
  "sessionId",
  "selectionId",
  "articleId",
  "gameId",
  "accountId",
  "storagePath",
]);

const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // Credentials embedded in a URL (scheme://user:password@host).
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]"],
  [
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    "[REDACTED_JWT]",
  ],
  [
    /\b(apikey|api_key|access_token|refresh_token|client_secret|token|password|secret|authorization)\b\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    "$1=[REDACTED]",
  ],
  [/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, "[REDACTED_KEY]"],
  [/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
  [/\b[A-Za-z0-9+/]{120,}={0,2}/g, "[REDACTED_LONG_VALUE]"],
];

export type FailureContext = Record<string, unknown>;

export type FailureDiagnostic = {
  errorId: string;
  operation: string;
  errorName: string;
  message: string;
  stack?: string;
  context?: Record<string, string | number | boolean>;
};

export type FailureResult = {
  error: string;
  errorId: string;
};

function redact(value: string): string {
  let result = value;
  for (const [pattern, replacement] of REDACTIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

/** Collapses whitespace so a diagnostic stays on one readable line. */
function safeInline(value: string, limit: number): string {
  return truncate(redact(value).replace(/\s+/g, " ").trim(), limit);
}

/** Stacks keep their line breaks but are still redacted and bounded. */
function safeMultiline(value: string, limit: number): string {
  return truncate(redact(value).replace(/\r\n/g, "\n").trim(), limit);
}

function normalizeError(error: unknown): Pick<FailureDiagnostic, "errorName" | "message" | "stack"> {
  if (error instanceof Error) {
    return {
      errorName: safeInline(error.name || "Error", MAX_ERROR_NAME_LENGTH),
      message: safeInline(error.message || "Unknown error", MAX_MESSAGE_LENGTH),
      ...(error.stack ? { stack: safeMultiline(error.stack, MAX_STACK_LENGTH) } : {}),
    };
  }

  if (typeof error === "string") {
    return {
      errorName: "Error",
      message: safeInline(error || "Unknown error", MAX_MESSAGE_LENGTH),
    };
  }

  if (error === null || error === undefined) {
    return { errorName: "UnknownError", message: "Unknown error" };
  }

  if (typeof error === "object") {
    const candidate = error as { name?: unknown; message?: unknown };
    return {
      errorName:
        typeof candidate.name === "string"
          ? safeInline(candidate.name, MAX_ERROR_NAME_LENGTH)
          : "UnknownError",
      message:
        typeof candidate.message === "string"
          ? safeInline(candidate.message, MAX_MESSAGE_LENGTH)
          : "Unknown error",
    };
  }

  return {
    errorName: "UnknownError",
    message: safeInline(String(error), MAX_MESSAGE_LENGTH),
  };
}

function sanitizeContext(
  context: FailureContext | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!context) return undefined;

  const safe: Record<string, string | number | boolean> = {};
  let fields = 0;
  for (const [key, value] of Object.entries(context)) {
    if (fields >= MAX_CONTEXT_FIELDS) break;
    if (!ALLOWED_CONTEXT_FIELDS.has(key)) continue;
    if (typeof value === "string") {
      safe[key] = safeInline(value, MAX_CONTEXT_VALUE_LENGTH);
      fields += 1;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
      fields += 1;
    } else if (typeof value === "boolean") {
      safe[key] = value;
      fields += 1;
    }
  }

  return fields > 0 ? safe : undefined;
}

function createErrorId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto?.randomUUID) return webCrypto.randomUUID();

  const bytes = new Uint8Array(16);
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Emits one bounded, sanitized developer diagnostic and returns it. Reporting is
 * best-effort: a failure inside this function never replaces the original outcome.
 */
export function reportFailure(input: {
  operation: string;
  error: unknown;
  context?: FailureContext;
}): FailureDiagnostic {
  const diagnostic: FailureDiagnostic = {
    errorId: createErrorId(),
    operation: safeInline(input.operation || "unknown.operation", MAX_OPERATION_LENGTH),
    ...normalizeError(input.error),
  };

  const context = sanitizeContext(input.context);
  if (context) diagnostic.context = context;

  try {
    console.error(
      `[failure ${diagnostic.errorId}] ${diagnostic.operation}: ${diagnostic.errorName}: ${diagnostic.message}`,
      {
        errorId: diagnostic.errorId,
        operation: diagnostic.operation,
        errorName: diagnostic.errorName,
        message: diagnostic.message,
        ...(diagnostic.stack ? { stack: diagnostic.stack } : {}),
        ...(diagnostic.context ? { context: diagnostic.context } : {}),
      },
    );
  } catch {
    // Console output is a convenience; the application outcome must not change.
  }

  return diagnostic;
}

/**
 * Returns the client-visible failure shape for an unexpected Server Action
 * failure: a safe message plus the identifier of its console diagnostic.
 */
export function failureResult(input: {
  operation: string;
  error: unknown;
  message?: string;
  context?: FailureContext;
}): FailureResult {
  const diagnostic = reportFailure(input);
  const message = input.message
    ? safeInline(input.message, MAX_MESSAGE_LENGTH)
    : UNEXPECTED_ERROR_MESSAGE;
  return { error: message, errorId: diagnostic.errorId };
}
