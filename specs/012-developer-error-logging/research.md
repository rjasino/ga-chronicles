# Research: Developer Error Logging

## Decision 1: Use a shared, server-only diagnostic reporter

**Decision**: Use one small server-only utility to generate an opaque error identifier, normalize unknown thrown values, sanitize a bounded set of diagnostic fields, and write a structured diagnostic to the runtime console. The utility must contain its own failures so reporting cannot replace the original error outcome.

**Rationale**: Existing code already writes ad hoc console diagnostics in feature actions and integrations. Some current paths log raw Supabase errors, provider response text, or database messages, which can expose sensitive information. A shared reporter can make identifiers, formatting, and redaction consistent without adding a service or persistence cost. Existing `node:crypto` UUID usage in the Wheel of Names integration demonstrates a project-compatible identifier pattern.

**Alternatives considered**:
- Add a logging/observability dependency: rejected because the feature explicitly excludes monitoring and the project has no need to add a runtime dependency.
- Write logs to a file or database: rejected because the feature excludes persistent log storage and the user cited resource constraints.
- Keep per-feature `console.error` calls: rejected because output shape, safety, and client correlation would remain inconsistent.

## Decision 2: Preserve the distinction between expected results and unexpected failures

**Decision**: Continue returning validation, authorization, and other user-correctable outcomes through existing Server Action state. Only unexpected failures that are handled and surfaced as failures receive a diagnostic identifier and a generic safe message.

**Rationale**: The project uses React `useActionState` with serializable result objects. The installed Next.js 16 error-handling guide says expected Server Function errors should be returned as values, while uncaught exceptions should be thrown and handled by error boundaries. This keeps ordinary user errors out of developer error logs.

**Alternatives considered**:
- Log every action result containing an `error` field: rejected because expected validation and permission outcomes are common and are not unexpected defects.
- Throw for every failure: rejected because it conflicts with current action-state UX and Next.js guidance for expected errors.

## Decision 3: Cover uncaught server request errors with Next.js instrumentation

**Decision**: Use the App Router `onRequestError` instrumentation hook for uncaught server-side render, Route Handler, and Server Action errors. Do not forward request headers, query strings, bodies, or other raw request data to the diagnostic.

**Rationale**: The installed Next.js 16 instrumentation reference documents `onRequestError` for server errors and identifies request context types including render, route, and action. This offers centralized coverage for errors that escape local handling. Its request metadata can contain sensitive values, so the reporter should use only safe route/context fields.

**Alternatives considered**:
- Add `error.tsx` only: rejected as the only server diagnostic mechanism because it is a client error boundary and does not replace server request-level reporting.
- Add a monitoring provider or network callback: rejected because diagnostics must remain local and transient.
- Rely only on instrumentation: rejected because expected returned failures and errors represented as provider/database result values do not necessarily become uncaught exceptions.

Implementation catches must remain narrow and preserve Next.js control-flow exceptions such as `redirect()` and `notFound()`; these are not application failures to convert into generic errors.

## Decision 4: Return correlation identifiers in client-facing action state

**Decision**: For unexpected failures handled by Server Actions, return the existing safe user-facing `error` field together with an optional opaque `errorId`; write that same identifier to the console diagnostic. Preserve existing expected-error response shapes. Do not add a JSON API endpoint.

**Rationale**: The repository has a single OAuth callback Route Handler that redirects, while most user interactions are Server Actions whose state is consumed by `useActionState`. An action-result contract directly addresses the current application surface without inventing an external API. Server Actions are public POST-callable entry points; this design does not replace existing authentication, authorization, or input validation.

**Alternatives considered**:
- Return raw exception details: rejected because it may expose stack traces, secrets, or implementation details.
- Add a separate REST error endpoint: rejected because no current product flow requires one and it would expand scope.
- Use a generated identifier only in console output: rejected because a developer could not correlate it with the client-visible failure.

## Decision 5: Test behavior without a persistent log backend

**Decision**: Unit-test sanitization and logger failure isolation, and integration-test that an unexpected action failure writes one diagnostic whose identifier matches the returned action state. Include a test that expected validation results do not invoke unexpected-failure reporting.

**Rationale**: These checks directly verify the feature's primary outcomes and no-storage constraint with existing Vitest infrastructure.

**Alternatives considered**:
- Add a live monitoring or log collection service to prove output: rejected because that would violate the product scope.
- Use only manual console inspection: rejected because output format, redaction, and correlation are testable requirements.

## Technical findings

- The web application is TypeScript 5.9 on Node.js 24, with Next.js 16.4.6 installed (`^16.4.3` declared) and React 19.
- `apps/web/src/features/*/actions.ts` uses `"use server"` and returns serializable objects such as `{ error: string }`; client forms consume these via `useActionState`.
- Existing logs are ad hoc `console.error`/`console.warn` calls. One integration already creates a UUID and selectively logs error name and stack context.
- Current Route Handler usage is limited to the OAuth callback, which redirects; no JSON API error-response endpoint exists.
- Existing tests use Vitest 5 in `apps/web/tests/unit` and `apps/web/tests/integration`.
- Installed Next.js guidance distinguishes expected returned action errors from uncaught exceptions, and documents `onRequestError` for server render, route, and action error contexts.
- The application itself will not persist diagnostic output, but console output may be captured or retained by the hosting/runtime environment independently; this feature does not configure that behavior.
- Next.js production error boundaries may expose a framework digest for uncaught rendering errors; this is useful for framework-managed failures but is not a substitute for the explicit `errorId` returned by handled Server Action failures.
