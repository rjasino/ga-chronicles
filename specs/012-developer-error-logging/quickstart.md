# Quickstart: Developer Error Logging

## Prerequisites

- Node.js 24 (`apps/web/package.json` requires `>=24 <25`)
- Dependencies installed in `apps/web`

## Validate the diagnostic utility and action result

From `apps/web`:

```bash
npm run test:unit -- tests/unit/lib/error-logging.test.ts
npm run test:unit -- tests/integration/action-error-reporting.test.ts
npm run test:unit -- tests/integration/instrumentation-error-reporting.test.ts
```

Expected outcomes:

- An unexpected failure emits one bounded, sanitized console diagnostic.
- Its `errorId` is present in both the diagnostic and returned action state.
- Secrets and raw form/request data are absent from diagnostic output and the client result.
- Expected validation failures do not invoke unexpected-failure reporting.
- A simulated console-output failure does not replace or alter the original safe failure result.

## Validate the web application

From `apps/web`:

```bash
npm run typecheck
npm run test:unit
npm run build
```

Expected outcomes:

- Type checking and automated tests pass.
- The application builds with its existing Server Action and Route Handler conventions.
- No log file, database table, external reporting service, or monitoring configuration is required. Hosting platforms may independently capture console output.

## Manual verification

In a local development run, trigger a controlled unexpected Server Action failure. Confirm that the returned UI state contains a safe message and reference identifier, and that the same identifier appears once in the server console diagnostic. Confirm that ordinary invalid-input feedback remains unchanged and is not logged as an unexpected defect.

See [the action error contract](contracts/action-error-contract.md) and [the data model](data-model.md) for output and sanitization rules.
