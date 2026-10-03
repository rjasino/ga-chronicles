# Branding Interaction Contract

This feature changes how the public brand surface presents content to visitors. It does not change any editing, reading, or account behavior; this contract documents the observable brand surface that [spec.md](spec.md) requires.

## Home hero

- The home page hero displays the channel motto `#fortheloveofgaming` as a readable brand/motto line within the hero text, in the established display face and sentence case.
- The hero's right-side visual is the transparent neon "GA" logo (not the previous abstract circular mark), shown at a size that fits the hero column on desktop and stacks cleanly on mobile.
- The hero remains legible at 390 px width with no horizontal scrolling; the logo is decorative and does not announce itself as meaningful content.

## Header wordmark

- Every page's header shows the full wordmark "Game Ako Chronicles" with the logo positioned on the left of the banner.
- The brand link remains the home-page anchor and keeps its accessible name; the completed wordmark changes that name.

## Site footer (every page)

- The footer explains what Game Ako is in one short, plain-language sentence (no jargon, player-first tone).
- The footer also carries the `#fortheloveofgaming` motto.
- The footer lists three labeled social entries — **Facebook**, **YouTube**, and **Twitch** — each presented as a link.
- Until the publisher supplies real URLs, each social entry uses a harmless placeholder target and is clearly marked as forthcoming so it never looks broken or dead-end.
- The publisher can replace any placeholder URL by editing a single plain line (no code or release needed beyond a normal deployment roundtrip).

## Accessibility and identity guardrails

- All new brand text (motto, description, link labels) is real text read by assistive technology; no core text is baked into images.
- The hero logo and any other decorative imagery use `alt=""`/hidden semantics; the header logo keeps its empty-alternative role.
- Keyboard focus remains visible on all new links, and no horizontal overflow is introduced at supported viewports.
- The implementation keeps the existing flat, matte brand identity (blue/red/yellow/white palette and existing typefaces); no new palette or type is introduced.

## Rejection and failure behavior

- If the neon GA logo fails to load, the hero falls back to a branded placeholder so the motto and headline remain intact and the layout does not break.
- Destinations for placeholder socials must never be a live-but-wrong service; the forthcoming treatment makes the pending state intentional.