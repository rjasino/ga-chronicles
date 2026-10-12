# Quickstart: Site-Wide UI Consistency

This guide validates the migration end to end. It does not contain implementation code; see `contracts/ui-components.md` and `data-model.md`.

## Prerequisites

- Node.js 24 (`apps/web` engines: `>=24 <25`)
- Docker running (for local Supabase)
- Dependencies installed: `cd apps/web && npm install`

## 1. Capture the pre-migration visual baseline

Do this before any styling change, on the current code.

```powershell
npx supabase start
npx supabase db reset
cd apps/web
npm run dev
```

In another terminal, run the screenshot baseline (added by this feature):

```powershell
npx playwright test tests/e2e/visual-consistency.spec.ts --update-snapshots
```

Expected: baseline screenshots for the key pages in light and dark at 390 px and 1440 px are written under `tests/e2e/visual-consistency.spec.ts-snapshots/`.

## 2. Install Tailwind and confirm the build

```powershell
cd apps/web
npm install -D tailwindcss@^4.3 @tailwindcss/postcss@^4.3
npm run typecheck
npm run build
```

Expected: build succeeds with the PostCSS plugin active. `npm run build` output lists the stylesheet.

## 3. Unit tests for shared elements

```powershell
npm run test:unit
```

Expected: `tests/unit/ui/*.test.tsx` pass. They cover:

- Each button purpose renders its purpose class and passes native props through.
- `pending` disables the button.
- A text field with `error` sets `aria-invalid` and links the message.
- A checkbox toggles from its label.
- A message uses `role="alert"` for error and `role="status"` for success and notice.

Existing unit tests (including `article-content.test.tsx`) must still pass.

## 4. Lint and typecheck

```powershell
npm run lint
npm run typecheck
```

## 5. End-to-end and accessibility

```powershell
npm run test:e2e
npm run test:a11y
```

Expected: all existing e2e tests pass unchanged (test hooks are retained), and axe reports zero violations for the migrated pages in both appearances, including the new success green.

## 6. Visual comparison against the baseline

```powershell
npx playwright test tests/e2e/visual-consistency.spec.ts
```

Expected: differences are only the intended changes (spacing from preflight, button and field styling). Review each diff. Unexpected layout breaks must be fixed before merge.

## 7. Manual check

1. Open the home page, an article, sign-in, the article editor, the moderation page, and the people list.
2. Toggle the theme. Confirm every element, focus ring, and message is legible in both appearances.
3. Resize to 390 px. Confirm no horizontal scrolling and that buttons are at least 44 px tall.
4. Confirm the five button purposes look distinct: primary (blue solid), secondary (blue outline), error (red solid), success (green solid), text (underlined).

## 8. Performance and dependency checks (before merge)

```powershell
npm run build
npm run start   # in a separate terminal, or use another port
npm run performance
npm audit
```

Compare the result against `docs/operations/performance-baseline.md`. Record LCP, CLS, and CSS size in the PR description (Principle V). Review `npm audit` results for the new dev dependencies (Principle IV).
