# Implementation Plan: Wheel of Names Fallback Draw

**Branch**: `014-wheelofnames-fallback` | **Date**: 2026-11-28 | **Spec**: [spec.md](file:///C:/Projects/ga-chronicles/specs/014-wheelofnames-fallback/spec.md)

**Input**: Feature specification from `/specs/014-wheelofnames-fallback/spec.md`

## Summary

Add a Wheel of Names fallback draw mechanism to Go Force so live sessions never stall if Wheel of Names is unreachable or unavailable. Facilitators can toggle fallback mode on or off in settings before a session starts (globally in `/admin/go-force` or on a `ready` session) and mid-game on a `live` session. When fallback mode is enabled—or automatically when Wheel of Names is unreachable during a draw—the server pre-randomizes the active round's remaining un-drawn games into a persisted queue (`go_force_rounds.fallback_queue`) and atomically pops and commits one game at a time into `go_force_selections`.

## Technical Context

**Language/Version**: TypeScript 5.9 (`apps/web`), Node >=24 <25, PostgreSQL (Supabase SQL migrations)  
**Primary Dependencies**: Next.js 16, React 19, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Zod 4, Tailwind CSS 4  
**Storage**: PostgreSQL (Supabase) with RLS and `SECURITY DEFINER` RPCs (`go_force_page_settings`, `go_force_sessions`, `go_force_rounds`, `go_force_selections`)  
**Testing**: Vitest (`npm run test:unit`), Supabase pgTAP (`npm run test:database`), Playwright (`npm run test:e2e`, `npm run test:a11y`)  
**Target Platform**: Web application (desktop & mobile browsers) + Supabase backend  
**Project Type**: Web application (`apps/web` + `supabase/`)  
**Performance Goals**: Fallback draw completes in <1s without waiting on external API timeouts when toggled on; UI updates propagate via existing realtime broadcast  
**Constraints**: Must never expose un-drawn queue order to players or facilitators; must preserve all existing Go Force voting, advancement, and annual-list rules  
**Scale/Scope**: Single-event live sessions (typically 10–100 eligible games, 2–64 participants per session)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality**: PASS — Uses existing Zod schemas, Server Actions, `SECURITY DEFINER` RPC conventions (`set search_path = ''`), and shared UI primitives (`Button`, `Checkbox`, `Message`).
- **II. Testing Standards**: PASS — Plan includes pgTAP database tests for the new RPCs, Vitest unit tests for `drawGoForceSelection` / `setGoForceWheelFallback` fallback logic, and Playwright E2E coverage for pre-game/mid-game toggling and unreachable fallback.
- **III. User Experience Consistency**: PASS — Reuses existing Go Force admin/facilitator layout, editorial design tokens, and `Message` status banners.
- **IV. Security**: PASS — Facilitator-only authorization enforced in both Server Actions and Postgres RPCs (`go_force_is_facilitator`); `fallback_queue` never selected into client payloads.
- **V. Performance Requirements**: PASS — Pre-randomized queue stored in `go_force_rounds.fallback_queue` avoids external latency when enabled and falls back cleanly on provider failure.

*Post-Phase 1 Re-check*: All five gates remain PASS with no complexity violations.

## Project Structure

### Documentation (this feature)

```text
specs/014-wheelofnames-fallback/
├── plan.md              # This file
├── research.md          # Phase 0 decisions & alternatives
├── data-model.md        # Schema & validation rules
├── quickstart.md        # End-to-end validation scenarios
├── contracts/
│   └── go-force-fallback-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks - not created here)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   └── 0017_go-force-wheel-fallback.sql        # New columns + RPCs
└── tests/database/
    └── go-force-wheel-fallback.test.sql        # pgTAP tests for queue & toggle

apps/web/src/
├── features/go-force/
│   ├── types.ts                                # wheel_fallback_enabled types
│   ├── admin-schemas.ts                        # wheelFallbackEnabled validation
│   ├── admin-actions.ts                        # saveGoForceVotingSettings / fallback setting
│   ├── session-actions.ts                      # setGoForceWheelFallback action
│   ├── game-actions.ts                         # drawGoForceSelection fallback & auto-fallback
│   ├── admin-queries.ts                        # include wheel_fallback_enabled in settings query
│   └── session-queries.ts                      # include wheel_fallback_enabled (omit fallback_queue)
└── components/go-force/
    ├── admin-controls.tsx                      # Admin settings toggle
    └── facilitator-session.tsx                 # Pre-game & mid-game toggle + fallback notice

apps/web/tests/
├── unit/go-force-wheel-fallback.test.ts        # Unit tests for fallback & auto-fallback
└── e2e/go-force-wheel-fallback.spec.ts         # E2E tests for toggle & unreachable fallback
```

**Structure Decision**: Extends the existing `apps/web/src/features/go-force/`, `apps/web/src/components/go-force/`, and `supabase/` structure without introducing new packages or services.

## Complexity Tracking

> No Constitution Check violations; table intentionally omitted.
