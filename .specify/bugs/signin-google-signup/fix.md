# Bug Fix: Remove Google Button from Sign-In Page

- **Slug**: signin-google-signup
- **Fixed**: 2026-11-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Removed the Google OAuth button from the sign-in page and gave the account-creation link a distinct, high-contrast callout style. Per the user's clarification, the `startGoogleSignIn` server action remains in place.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/app/sign-in/page.tsx` | modified | Removed the Google button and its UI imports; retained OAuth callback error handling with copy that points to username/password sign-in. |
| `apps/web/src/components/auth/auth-form.tsx` | modified | Styled the account creation prompt as a distinct callout with a bold, underlined link. |
| `apps/web/src/app/globals.css` | modified | Added responsive callout and theme-token-based link styles. |
| `apps/web/tests/e2e/reader-auth.spec.ts` | modified | Asserts the Google button is absent, the create-account link is visibly styled, and callback error recovery remains available. |

## Tests Added or Updated

- `tests/e2e/reader-auth.spec.ts` — updated sign-in assertions for the removed button, visible signup callout, and OAuth callback error state.

## Local Verification

- `npm run typecheck` → passed (`tsc --noEmit`).
- `npx eslint src/app/sign-in/page.tsx src/components/auth/auth-form.tsx tests/e2e/reader-auth.spec.ts` → passed.
- `git diff --check` → passed.
- Reader-auth Playwright E2E → not run; the suite creates a local account, and the user did not authorize running a test that writes account data.

## Deviations from Assessment

- User clarification: remove only the Google button and keep the Google sign-in function in place. The UI entry point was removed; `startGoogleSignIn` and the OAuth callback route were left unchanged.

## Follow-ups

- If desired, run the reader-auth E2E suite against a disposable local auth database to exercise the updated browser assertions.
