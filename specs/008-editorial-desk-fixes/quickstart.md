# Quickstart: Editorial Desk UI Fixes

Use this guide to validate the feature end to end after implementation.

## Prerequisites

- Local Supabase running (storage on `127.0.0.1:54321`).
- An account with the publish role (editor or admin).
- Dependencies installed in `apps/web`.

## Run the app

```bash
cd apps/web
npm run dev
```

## Automated checks

```bash
cd apps/web
npx vitest run tests/unit/articles tests/integration/article-body-cleanup.test.ts
npx playwright test tests/e2e/richtext-authoring.spec.ts tests/e2e/public-articles.spec.ts
```

Expected: all pass, including the new cases for card summaries, lists, link feedback, the upload modal, and the oversized image error.

## Manual validation

### 1. Story card previews (US1)

1. Open the home page or the latest stories list.
2. Find an article whose body has paragraphs and bold text.
3. **Expect**: the summary is plain text with the card's font and color. No `<p>` or `<strong>` text is visible.

### 2. Editorial desk heading (US2)

1. Sign in and open `/admin/articles/new`.
2. **Expect**: "Editorial desk" is the page heading. Open `/admin/articles/<id>/edit` and check the same.

### 3. Sticky toolbar (US3)

1. Open the new article page and paste or type enough text to exceed the screen height.
2. Scroll down.
3. **Expect**: the formatting toolbar stays visible below the site header. Clicking Bold applies to the current selection.

### 4. Link feedback (US4)

1. Type a word, select it, click Link, and enter `example.com`.
2. **Expect** before saving: the word shows link styling (blue, underlined).
3. Save and view the article. **Expect**: the link works and goes to `https://example.com`.

### 5. Lists (US5)

1. Type three lines and select them. Click "• List".
2. **Expect**: bullet markers appear.
3. Select three lines, click "1. List". **Expect**: numbers 1, 2, 3.
4. Click the same list button again. **Expect**: the list returns to paragraphs.
5. Save and view the public article. **Expect**: the same bullets or numbers appear.

### 6. Inline image loading modal (US6)

1. Click "Image" and choose a JPEG under 10 MiB.
2. **Expect**: a full-page overlay with a spinner appears. Clicking, typing, or pressing Tab behind it does nothing.
3. **Expect**: when the upload finishes, the overlay closes and the image appears in the body.

### 7. Oversized image error (US7)

1. Click "Image" and choose a JPEG larger than 10 MiB.
2. **Expect**: no overlay for the upload. An error appears: "Inline images must be 10 MiB or smaller. This image is X MiB." No image is inserted.
3. Choose a valid image. **Expect**: the error clears and the upload proceeds.

## Done when

- All automated checks pass.
- Every manual step matches its expected result.
- The contract in [contracts/body-image-upload.md](./contracts/body-image-upload.md) is honored.
