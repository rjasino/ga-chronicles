# Data Model: Site-Wide UI Consistency

This feature changes no stored data. Its "entities" are design tokens and element states, which the spec calls Design Element and Appearance.

## Appearance

The active theme, stored as the `data-theme` attribute on `<html>`.

| Value | Set by | Default |
|-------|--------|---------|
| `light` | Server render and inline init script | Yes |
| `dark` | Theme toggle; stored under `game-ako-theme` | No |

Rules:

- Only `light` and `dark` are valid stored values. Anything else falls back to `light`.
- Every design token has a value for both appearances.

## Design tokens

Each token is a CSS custom property defined on `:root` (light) and `[data-theme="dark"]` (dark), and exposed to Tailwind through `@theme inline`.

| Token | Role | Light (current) | Dark (current) |
|-------|------|-----------------|----------------|
| `--blue` | Primary action, links, headings | `#123a72` | `#5fd8ff` |
| `--blue-hover` | Primary hover | `#1c4d8f` | `#8fe4ff` |
| `--red` | Error and destructive; accent text | `#c6363d` | `#ff6b7d` |
| `--yellow` | Focus indication and accents only | `#f4c84a` | `#ffd93d` |
| `--white` | Page background (light) | `#fffefa` | `#0a0f1c` |
| `--ink` | Body text | `#17263b` | `#e9eefc` |
| `--muted` | Secondary text | `#657184` | `#9aa7c2` |
| `--line` | Dividers and borders | `#d8dde3` | `#24314f` |
| `--paper` | Panels and quiet surfaces | `#f5f6f7` | `#111a2e` |
| `--card` | Card surface | `#ffffff` | `#101a30` |
| `--field-line` | Field borders | `#9aa5b3` | `#2c3c5e` |
| `--danger-bg`, `--danger-ink` | Error message surface and text | `#fff0f0`, `#812027` | `#2a1116`, `#ffb3ba` |
| `--success-bg`, `--success-ink`, `--success-line` | Success message and success button (FR-009) | `#edf7f0`, `#205c37`, `#287446` | `#0f2418`, `#9fe0b8`, `#35a866` |
| `--success` (new) | Matte green for the success button fill and success text | to choose; candidate `#2e6b4f` | to choose; candidate `#7fd1a3` |
| `--notice-bg` | Notice message surface | `#fff3c8` | `#2e2712` |

Rules:

- Yellow never fills a button or field (FR-008). It is used for focus outlines and accents.
- The new success token must pass the project contrast target as text on its surface in both appearances (verify with axe).
- Red and green must remain distinguishable for error and success in both appearances.

## Design element states

Every shared element defines the same state set (FR-003). "Applies" means the element has that state.

| State | Button | Text field, text area, dropdown | Checkbox | Message |
|-------|--------|----------------------------------|----------|---------|
| Default | Yes | Yes | Yes | Yes |
| Hover | Yes | Yes | Yes | No |
| Keyboard focus (visible outline in `--yellow`) | Yes | Yes | Yes | No |
| Pressed | Yes | No | No | No |
| Filled | No | Yes | No | No |
| Checked | No | No | Yes | No |
| Invalid | No | Yes | No | Yes (error) |
| Disabled | Yes | Yes | Yes | No |
| Pending (submitting) | Yes | No | No | No |

Rules:

- Disabled and pending buttons cannot be activated.
- Focus indicators remain visible in both appearances (FR-012).

## Button purposes

| Purpose | Fill or outline | Used for (examples from the spec) |
|---------|-----------------|-----------------------------------|
| `primary` | Solid `--blue`, text `--on-brand` | Publish, Sign in, Post comment, Create account, Save settings |
| `secondary` | Outline `--blue`, transparent fill | Continue with Google, Apply filters, Sort, Save roles, Save draft |
| `error` | Solid `--red` | Remove comment, Remove article |
| `success` | Solid `--success` | Confirmed outcome actions, if any; success messages use the success tokens |
| `text` | No fill, underlined `--blue`, hover `--red` | Sign out, Report |

Rules:

- Each form has at most one `primary` button (FR-014).
- Destructive actions use `error` (FR-010).

## Relationships

- Pages compose shared elements; no page sets a button or field color directly.
- Each shared element reads only design tokens; no element hard-codes a color value.
