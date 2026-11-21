# Bug Verification: Go Force admin settings and game saves

- **Slug**: go-force-admin-save
- **Tested**: 2026-11-21
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The local migration regression suite and Go Force admin E2E tests pass, including visibility state after save/reload, timer persistence, and game creation with and without cover art. The initial E2E attempt exposed a checkbox state issue, which was corrected; the rerun passed. The user confirmed migration 0012 was already applied when the test command was run.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `npx playwright test tests/e2e/go-force-admin.spec.ts` | pass | 2 tests; visibility and timer values persisted after reload, game creation without cover succeeded, and URL/upload paths passed locally. |
| New / updated tests | `npx supabase test db --local` | pass | 12 SQL files, 111 pgTAP tests, including the settings-backed final-ballot deadline backfill. |
| Regression suite | `npm run test:unit` | pass | 29 files, 193 tests. |
| Lint / type-check | `npm run lint` | pass | ESLint completed successfully. |
| Lint / type-check | `npm run typecheck` | pass | TypeScript completed successfully. |
| Migration status | User confirmation | pass (reported) | Migration 0012 was already up when the test command was run; no additional push was attempted in this workspace. |
| Diff whitespace | `git diff --check` | pass | Only line-ending notices were printed. |

## Output Excerpts

```text
All tests successful.
Files=12, Tests=111
```

```text
2 passed (35.6s)
```

The first E2E attempt failed because the checkbox still appeared checked after saving “hidden.” After switching it to use the action-returned persisted value, both admin E2E tests passed.

## Residual Risks

- Browser/database checks ran against the local Supabase project; no separate remote-project browser session was available.
- The E2E cover upload leaves a local storage object after deleting its temporary game row; successful cover objects are intentionally retained to avoid breaking existing session snapshots.

## Recommendation

Close the bug for the tested environment. The local E2E and pgTAP suites pass, and the user confirms migration 0012 was already applied at test time. If a separate production project still shows save errors, verify its migration history and storage policies there.
