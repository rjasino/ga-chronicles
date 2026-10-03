# Theme Toggle Interaction Contract

This feature adds a visitor-facing appearance control and a dark presentation of the existing site. It does not change any content, navigation, editing, reading, or account behavior. This contract documents the observable behavior that [spec.md](spec.md) requires.

## Root theme state

- The root `<html>` element carries a theme attribute reflecting the effective theme: `light` or `dark`.
- Absent any stored choice, the effective theme is **light** for a first-time visitor, regardless of the operating system's light/dark setting.
- A valid stored choice (`light` or `dark`) overrides the default for that device until changed.
- An invalid, missing, or unreadable stored value resolves to light with no visible error.

## Toggle control

- The shared header exposes exactly one visible, clearly labeled control that switches the appearance between light and dark.
- The control has a clear accessible name and conveys its current state (an on/off toggle state) so assistive technology announces what it does and its current state.
- The control is reachable by keyboard, shows a visible focus indicator, and has an adequate activation target.
- Activating the control:
  - switches the entire site's appearance immediately, with no page reload;
  - preserves the visitor's scroll position and any in-progress input;
  - persists the new choice for the device; and
  - updates the announced state.

## Default and no-flash behavior

- On a first visit, the site presents light.
- On a return visit with a stored `dark` choice, the dark theme is applied as the page is presented — there is no visible frame of the light theme before it.
- If the saved preference cannot be read or applied, the site stays light and remains fully usable.

## Site-wide appearance

- The chosen theme applies consistently on every page sharing the header/footer: home, articles, sign-in, account, and signed-in/admin areas.
- Both themes use the same typography (Space Grotesk display, DM Sans body) and the same structural color roles; only the color values change.
- The dark theme's colors are derived from the neon "Game Ako" sign artwork: a deep blue-black backdrop with luminous cyan as the primary/accent, plus neon red, yellow, and magenta echoes.

## Home hero visual

- The home hero's right-hand visual is the neon "Game Ako" sign artwork (`/brand/neon-GA-01.png`).
- The artwork is presented in both themes within an intentional frame/panel so its dark photographic background reads as deliberate on the light theme.
- The artwork renders at a size that fits the hero column on desktop and stacks cleanly on mobile, with no horizontal scrolling at 390 px.
- The hero text (motto, headline, supporting line) remains readable in both themes.

## Accessibility and identity guardrails

- All theme-relevant text and controls are real text/controls, not images; the hero artwork is decorative and does not announce as meaningful content.
- Text, controls, focus indicators, and essential imagery meet the project accessibility contrast target (WCAG 2.1 AA) in both themes.
- Keyboard focus remains visible on the toggle and all existing interactive elements in both themes.
- No horizontal overflow is introduced at supported viewports (390 px, 768 px, 1440 px) in either theme.
- Any theme transition is brief and decorative; the state change does not depend on animation, and a reduced-motion preference is respected.

## Failure behavior

- If the hero artwork fails to load, the hero falls back to a branded treatment so the motto and headline remain intact and the layout does not break.
- If theme storage is unavailable, the toggle still works for the current session and the site defaults to light without an error.
