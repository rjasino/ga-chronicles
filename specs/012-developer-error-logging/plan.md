# Implementation Plan: Developer Error Logging

**Branch**: `012-developer-error-logging` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-developer-error-logging/spec.md`

## Summary

Add transient, developer-oriented diagnostics for unexpected application failures. Reuse a small server-only reporting utility and Next.js error hooks, with explicit reporting at handled failure boundaries. Each handled unexpected failure gets a safe identifier that is included in the developer console diagnostic and the client-facing failure state. Expected validation and authorization outcomes remain ordinary user-facing results. No persistent log store, monitoring service, or new runtime dependency is needed.

The project primarily returns failures through React Server Action state rather than JSON API routes. The response contract therefore focuses on serializable action results; it does not introduce an HTTP endpoint or expose internal exception details.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 24 (project engine is `>=24 <25`)

**Primary Dependencies**: Next.js 16.4.6 installed (declared as `^16.4.3`), React 19, existing Node.js runtime APIs; no new dependencies planned

**Storage**: None for diagnostics; application data remains in Supabase as currently configured

**Testing**: Vitest 5 for unit and integration tests; Playwright for end-to-end coverage; npm scripts in `apps/web/package.json`

**Target Platform**: Next.js App Router web application running on Node.js

**Project Type**: Web application with React Server Components, Server Actions, and a small number of Route Handlers

**Performance Goals**: Reporting adds no network or persistence work; diagnostic preparation and console output should not materially delay a failure response

**Constraints**: The application adds no diagnostic persistence (hosting may independently capture console output); do not record complete request/form contents, secrets, credentials, or unrelated personal data; reporting failures must not replace the original application outcome; preserve Next.js control-flow exceptions

**Scale/Scope**: Shared diagnostics behavior for unexpected server-side failures and explicitly handled failures in supported Server Actions and Route Handlers; preserve expected user-correctable results

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality — PASS**: A focused shared utility follows existing `apps/web/src/lib` conventions and reduces inconsistent ad hoc reporting.
- **Testing Standards — PASS**: Unit coverage will validate normalization, redaction, identifier generation, and logger-failure isolation; integration coverage will validate action result correlation.
- **User Experience Consistency — PASS**: Existing expected-error messages and action-state flows remain intact; unexpected failures receive a consistent safe message and reference.
- **Security — PASS**: Public results contain no stack or raw exception message; diagnostic metadata is allow-listed and sanitized, with sensitive request data excluded. Next.js control-flow exceptions such as redirects and not-found signals must not be swallowed by broad catches.
- **Performance Requirements — PASS**: No network service, database, file, or third-party dependency is introduced for diagnostics.
- **Scope — PASS**: Monitoring, alerting, dashboards, retention, and a new JSON API are explicitly out of scope.

## Project Structure

### Documentation (this feature)

```text
specs/012-developer-error-logging/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── action-error-contract.md
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── instrumentation.ts                 # Next.js uncaught request-error hook
│   ├── app/                                # App Router and Route Handlers
│   ├── features/*/actions.ts               # Existing Server Action boundaries
│   └── lib/                                # Shared server-only diagnostic utility
└── tests/
    ├── unit/
    └── integration/
```

**Structure Decision**: Keep the feature inside the existing web application. Place reusable server-side diagnostic behavior under `apps/web/src/lib`, use Next.js App Router instrumentation for uncaught server request errors, and update relevant Server Action boundaries where failures are converted into returned state. Tests follow the current Vitest unit/integration layout. Existing Route Handlers remain unchanged unless they return an unexpected failure response.

## Post-Design Constitution Re-check

- **Code Quality — PASS**: Shared utility and existing feature boundaries avoid a new subsystem.
- **Testing Standards — PASS**: Unit and integration scenarios cover formatting, safety, correlation, and failure isolation.
- **User Experience Consistency — PASS**: Existing expected-error flows remain; unexpected failures use a safe, consistent response.
- **Security — PASS**: Console context is allow-listed, client responses are sanitized, and framework control-flow exceptions remain intact.
- **Performance Requirements — PASS**: No external reporting, database, or file operations are added.

## Complexity Tracking

No constitution violations or additional architectural projects are required.
