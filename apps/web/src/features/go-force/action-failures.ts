import { failureResult, type FailureContext } from "@/lib/error-logging";
import { goForceErrorMessage } from "@/features/go-force/messages";

/**
 * Maps a known Go Force domain error to its existing user-facing message. Only
 * errors that do not match a known domain code are reported as unexpected and
 * receive a correlatable identifier.
 */
export function withKnownGoForceFailure(
  error: { message?: string; code?: string } | null,
  operation: string,
  fallback: string,
  context?: FailureContext,
): { error: string; errorId?: string } {
  const message = goForceErrorMessage(error, fallback);
  if (message !== fallback) return { error: message };

  return failureResult({
    operation,
    error,
    message,
    ...(context ? { context } : {}),
  });
}
