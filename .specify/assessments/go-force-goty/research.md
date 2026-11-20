# Idea Research: Game Ako GOTY selection

- **Slug**: go-force-goty
- **Created**: 2026-11-20
- **Evidence confidence (overall)**: low

## Users & Demand

- The user reports that Game Ako fans are looking forward to The Game Awards and are interested in which game wins Game of the Year. This is stated interest from the idea owner; no direct fan interviews, poll results, attendance figures, or observed voting behavior were supplied. — [source: user-provided context, 2026-11-20] (confidence: low)
- The user sees an opportunity for the Game Ako community to nominate a game outside the official award field and publish its own result as a portfolio to share at the next year's event. They state they intend to build the module and create demand whether or not current audience demand is demonstrated. This is a strategic intention, not observed fan behavior. — [source: user-provided context and clarification, 2026-11-20] (confidence: low)
- The affected group is a Game Ako audience and a variable-size set of players participating in a shared live session. The roster is fixed at session start. — [source: `.specify/assessments/go-force-goty/intake.md`] (confidence: high)

## Prior Art

- No Go Force or GOTY implementation was found in the repository source search; the assessment records that Game Ako currently has no GOTY selection process. — [source: repository search on 2026-11-20; `.specify/assessments/go-force-goty/problem.md`] (confidence: high)
- The existing site has database-backed admin settings, authenticated admin controls, and a public/published content pattern, but no existing GOTY-specific process or realtime session feature. — [source: `specs/009-go-force-goty/research.md`; `apps/web/src/features/moderation/settings-actions.ts`; `supabase/migrations/0001_core_schema.sql`] (confidence: high)
- The user identifies The Game Awards as the event that prompts community interest. After the user confirmed the host, a pinned HTTPS GET to its official root returned HTTP 403 with a browser challenge; no redirect was followed, and the page did not verify the event date or award process. — [source: user-provided context; confirmed host fetch result, 2026-11-20] (confidence: low)

## Market & Context

- The current alternative is no formal Game Ako GOTY selection process. If nothing changes, the community will not produce the vote-based award outcome and post-event record described by the user. — [source: `.specify/assessments/go-force-goty/problem.md`; user-provided context] (confidence: high for current process, low for audience impact)
- The user expects a separate post-result page to serve as a portfolio that can be shared at next year's event. This is an intended future use, not evidence of future traffic or engagement. — [source: user-provided context, 2026-11-20] (confidence: low)
- The user states that The Game Awards show is scheduled for December 10, 2026 and confirms Go Force must be ready before it. The date remains user-reported because the pinned official-site request returned HTTP 403. At the research date of November 20, that is about 20 days away. — [source: user-provided context and clarification; current client date 2026-11-20; official-site fetch result] (confidence: low)

## Data & Constraints

- The project uses Next.js with Supabase Postgres and has admin-only, database-backed settings suitable for changing page content without a code redeployment. — [source: `specs/009-go-force-goty/research.md`; `apps/web/src/features/moderation/settings-actions.ts`] (confidence: high)
- The repository has no existing Supabase Realtime channel implementation. A live multi-screen session would introduce a new realtime integration and authorization work; the planning research recommends private Broadcast channels, but that recommendation has not been validated in a live rehearsal. — [source: `specs/009-go-force-goty/research.md`] (confidence: high for repository state, medium for feasibility)
- The player count is variable, fixed at the start, and has no stated maximum. Players will use existing Game Ako accounts. The specified minimum vote-completion target is 80%, but no participation baseline exists. — [source: `.specify/assessments/go-force-goty/intake.md`; user clarification, 2026-11-20; `.specify/assessments/go-force-goty/problem.md`] (confidence: high)
- Go Force is expected to be ready before the December 10, 2026 show. The schedule date itself remains user-reported because the official site returned HTTP 403. — [source: user clarification, 2026-11-20; official-site fetch result] (confidence: medium)

## Evidence Against the Idea

- Fan enthusiasm is currently represented by the idea owner's report only; there is no direct evidence of how many fans or players would join, whether they want to vote, or whether they would use a post-event portfolio. — [source: no audience research, poll, or usage data supplied; `.specify/assessments/go-force-goty/decision.md`] (confidence: high)
- The user requires readiness before the stated December 10 show, leaving about 20 days from the research date. The project has no existing realtime integration, so the deadline and new integration create a delivery risk. The official date could not be verified. — [source: user clarification and current client date, 2026-11-20; `specs/009-go-force-goty/research.md`; official-site fetch result] (confidence: medium)
- With no prior process, there is no usage or participation baseline to show that a dedicated module would outperform a simpler community-organized event. — [source: `.specify/assessments/go-force-goty/problem.md`; `.specify/assessments/go-force-goty/concept.md`] (confidence: high)

## Gaps & Open Questions

- No unanswered clarification remains from the latest user answers. Direct fan behavior is still unmeasured; the user explicitly accepts that evidence gap and intends to create demand rather than treat prior demand as a build prerequisite.

## Sources

- User-provided context in this conversation (host: n/a; policy: not a URL).
- `.specify/assessments/go-force-goty/intake.md` (host: local repository; policy: internal source).
- `.specify/assessments/go-force-goty/problem.md` (host: local repository; policy: internal source).
- `.specify/assessments/go-force-goty/concept.md` (host: local repository; policy: internal source).
- `.specify/assessments/go-force-goty/decision.md` (host: local repository; policy: internal source).
- `specs/009-go-force-goty/research.md` (host: local repository; policy: internal source).
- [https://thegameawards.com/](https://thegameawards.com/) (host: `thegameawards.com`, policy: confirmed-by-user; pinned GET connected to the validated public address but returned HTTP 403 browser challenge; schedule remains unverified).