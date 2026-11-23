import type { Instrumentation } from "next";
import { reportFailure } from "@/lib/error-logging";

/**
 * Reports uncaught server-side render, Route Handler, and Server Action errors.
 * Only route metadata is forwarded; request headers, cookies, query strings,
 * and bodies are deliberately excluded from the diagnostic.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  reportFailure({
    operation: `next.request.${context.routeType}`,
    error,
    context: {
      routePath: context.routePath,
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  });
};
