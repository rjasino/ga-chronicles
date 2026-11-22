# Bug Assessment: Google Signup Available from Sign-In Page

- **Slug**: signin-google-signup
- **Created**: 2026-11-22
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

“Fix the sign in page to remove sign up via google and make the create an account link more visible.”

## Symptom

The sign-in page presents a “Continue with Google” OAuth action that may also create an account, alongside username/password login. The “Create an account” link is rendered as a plain inline link after the submit button and receives no dedicated visual emphasis, making registration harder to discover.

## Reproduction

1. Open `/sign-in` while signed out.
2. Observe the “Continue with Google” button below the username/password form.
3. Observe “Create an account” as an unstyled inline link in the form footer.

These behaviors are directly present in the current route and component. Whether Google OAuth creates a new account depends on the configured Supabase provider behavior; the app starts an OAuth flow without an application-side existing-account check.

## Suspected Code Paths

- `apps/web/src/app/sign-in/page.tsx:1-8` — imports the Google OAuth action, renders the OAuth error message, and displays the “Continue with Google” form.
- `apps/web/src/components/auth/auth-form.tsx:15-20` — renders username/password inputs and the plain “Create an account” link.
- `apps/web/src/features/auth/actions.ts:61-75` — starts Google OAuth without checking whether the provider identity already belongs to an existing account.
- `apps/web/src/app/auth/callback/route.ts:1-21` — exchanges the OAuth callback and redirects failures back to `/sign-in?error=oauth`.
- `apps/web/tests/e2e/reader-auth.spec.ts:13-32` — covers OAuth cancellation and currently expects the Google button/error messaging to appear.

## Root Cause Hypothesis

The sign-in route intentionally exposes both credential and Google OAuth flows, and the account creation link has no specific class or style beyond the global inherited anchor color. This allows Google OAuth to be used as an account-entry path and leaves the credential signup path visually secondary. Confidence: high for the rendered UI; medium for whether OAuth creates new Supabase accounts in the current deployment, because that also depends on provider configuration.

## Proposed Remediation

**Preferred**: Update the sign-in route so its account creation behavior matches the intended policy, and make the “Create an account” link a clearly styled, underlined/high-contrast, keyboard-visible call to action. If Google should be removed entirely, remove its button/action entry point and update the OAuth cancellation UI/test accordingly. Keep the callback’s safe failure handling if an already-started OAuth attempt can still return. If Google sign-in should remain for existing accounts, enforce “existing account only” during the callback/provisioning flow rather than merely hiding a signup label; this avoids silently changing login availability while still blocking new Google registrations.

**Files likely to change**:
- `apps/web/src/app/sign-in/page.tsx`
- `apps/web/src/components/auth/auth-form.tsx`
- `apps/web/src/features/auth/actions.ts` and/or `apps/web/src/app/auth/callback/route.ts` if Google sign-in remains but signup must be blocked
- `apps/web/tests/e2e/reader-auth.spec.ts`
- `apps/web/src/app/globals.css` only if a reusable auth call-to-action style is needed

**Tests to add or update**:
- Assert the sign-in page no longer offers a Google signup path under the chosen policy.
- Assert “Create an account” is visibly styled and remains accessible by keyboard/focus.
- Update reader OAuth error/cancellation coverage to match whether Google sign-in is removed or retained for existing accounts.

## Risks & Considerations

- Removing the Google button entirely also removes Google sign-in for existing Google-linked accounts.
- Hiding only the button does not enforce an existing-account-only policy if another route or previously issued OAuth action remains reachable.
- Keep callback error handling usable for any in-flight OAuth request if the entry point is removed.
- No database migration is expected for a styling-only change; an existing-account-only OAuth policy may require auth-flow changes.

## Open Questions

- [NEEDS CLARIFICATION: Should Google OAuth be removed entirely from the sign-in page, including sign-in for existing Google-linked accounts, or should existing users keep Google sign-in while new Google-based account creation is blocked?]
