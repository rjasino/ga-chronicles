# Decision: Game Ako GOTY selection

- **Slug**: go-force-goty
- **Decided**: 2026-11-20
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md, .specify/memory/constitution.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | adequate | Game Ako has no existing GOTY process, and the owner directly identifies an annual live-content goal and a results portfolio to share next year. |
| Evidence strength | adequate | The owner’s intent, deadline, current lack of a process, account model, and admin/editorial context are direct evidence for this owner-led content investment. Broader fan interest remains unmeasured and is not a prerequisite by the owner’s choice. |
| Value vs. inaction | adequate | Proceeding creates the planned event and a reusable post-event portfolio; inaction misses the stated December content window. Audience impact remains unmeasured. |
| Feasibility / appetite | adequate | The recommended guided module fits the medium appetite and existing Next.js/Supabase stack; database-backed admin patterns exist, while live realtime updates are new and require rehearsal. |
| Strategic fit | adequate | The user explicitly wants this as Game Ako content and accepts that the feature may create demand rather than respond to measured demand. |
| Risk posture | weak | The user-reported deadline is about 20 days after the research date, the official schedule could not be independently verified, and the project has no prior realtime feature. A focused release and live rehearsal are needed to manage delivery risk. |

## Verdict & Rationale

The verdict is **go** for the guided live-session module. This is an owner-directed content investment, not a demand-validated audience product; the owner has explicitly chosen to proceed and create demand. Problem validity, owner-level evidence, value versus inaction, and a credible medium-appetite concept meet the gate. The low overall research confidence still applies to broader fan demand and the external event date, and the compressed delivery window remains a material risk.

## If go — Handoff to `$speckit-specify`

- **Problem**: Game Ako has no community GOTY process; the owner wants a live selection event and results portfolio ready before the user-reported December 10, 2026 event date.
- **Chosen approach**: Option C — Guided live-session module.
- **In scope / out of scope**: Three live voting rounds, admin-maintained annual eligible list and page visibility, fixed account-based roster, final GOTY ballot with tied co-winners, and post-event results page. Out of scope: video-game functionality, automatic curation, async play, late joining, and requiring proof of pre-existing audience demand.
- **Success metrics**: Ready before the stated event date; at least 80% of expected vote opportunities submitted; each completed session has one or more GOTY winners and a post-session results page.
- **Carried-forward open questions**: None from user clarifications. The event date remains user-reported, and wider audience demand is unmeasured by choice.
- **Current status**: A feature spec and plan exist at `specs/009-go-force-goty/` and now include the owner-reported December 10 readiness target.