# Bug Verification: Google Signup Available from Sign-In Page

- **Slug**: signin-google-signup
- **Tested**: 2026-11-22
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The post-fix sign-in page no longer renders the Google button, and the account-creation link is visible with the new underline styling. The targeted browser test, typecheck, lint, and diff check passed; the broader reader-auth flow that creates a persistent local account was not run.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Open local `/sign-in`, submit invalid credentials, inspect the OAuth button and account link | pass | The updated Playwright case confirmed no “Continue with Google” button, and the create-account link has the dedicated class and underline. |
| New / updated tests | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/reader-auth.spec.ts --grep 'sign-in failures remain generic and retryable'` | pass | 1 Chromium test passed. The test uses a nonexistent username and invalid password; it does not create or modify an account. |
| Regression suite | Full `tests/e2e/reader-auth.spec.ts` | skipped | It includes account registration and would create a persistent local auth account. |
| Lint / type-check | `npx eslint src/app/sign-in/page.tsx src/components/auth/auth-form.tsx tests/e2e/reader-auth.spec.ts`; `npm run typecheck` | pass | Both exited successfully. |
| Diff whitespace | `git diff --check` | pass | No whitespace errors. |

## Output Excerpts

- Playwright: `1 passed (3.8s)`.
- Typecheck: `tsc --noEmit` exited successfully.
- Targeted ESLint and `git diff --check` exited successfully.
- Read-only local page check: `StatusCode 200`, `HasCreateAccount True`, `HasGoogleButton False`.

## Residual Risks

- The OAuth callback error state and account creation path were not exercised in this verification run. The Google action and callback remain unchanged by design; the sign-in route only removes the button.
- This verifies the page in Chromium at the available local server. Other browsers and viewport sizes were not checked.

## Recommendation

Close the bug. The requested sign-in UI behavior is verified in the browser, while the broader account-creation flow was skipped because it writes persistent local auth data.
