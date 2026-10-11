# Contract: Shared UI Elements

Location: `apps/web/src/components/ui/`. These components are the only supported way to render buttons, text fields, text areas, dropdowns, checkboxes, and status messages. Pages must not style these elements directly.

## Button

```ts
type ButtonPurpose = "primary" | "secondary" | "error" | "success" | "text";
type ButtonSize = "default" | "toolbar"; // "toolbar" is for the rich-text toolbar

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  purpose?: ButtonPurpose; // default "secondary"
  size?: ButtonSize;       // default "default"
  pending?: boolean;       // shows pending state; also disables the button
};
```

Behavior:

- Renders a native `<button>`. All native props (`type`, `name`, `value`, `disabled`, `aria-pressed`, `onClick`) pass through.
- `pending` disables the button and keeps its purpose styling.
- Height is at least 44 px at the `default` size on touch-sized screens (FR-013). `toolbar` size is exempt and is only used inside the rich-text toolbar.
- Keyboard focus shows the `--yellow` outline (FR-012).
- Does not change its label or behavior (FR-015).

Usage mapping (from the spec):

| Element | Purpose |
|---------|---------|
| Publish, Sign in, Post comment, Create account, Update password, Save settings | `primary` |
| Continue with Google, Apply filters, Sort, Save roles, Save draft, Create internal account | `secondary` |
| Remove comment, Remove article | `error` |
| Sign out, Report | `text` |

## TextField

```ts
type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;     // rendered in the shared label style
  hint?: React.ReactNode;     // optional helper text (field-hint)
  error?: string;             // when set, field is invalid and error is shown
};
```

Behavior:

- Renders a `<label>` wrapping the label text and the input, so the accessible name comes from the label (matches current forms).
- When `error` is set, the input gets `aria-invalid="true"` and `aria-describedby` points to the error message.
- Pending or disabled forms disable the input (`disabled`).

## TextArea and Select

Same contract as `TextField`, with element types `<textarea>` and `<select>`. The select keeps native options so `select[name="..."]` selectors still work.

## Checkbox

```ts
type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
};
```

Behavior:

- Renders `<label>` wrapping the native checkbox and its text, so clicking the text toggles it.
- Keeps `name`, `value`, and `defaultChecked` working for form submission.
- Checked state is visible in both appearances.

## Message

```ts
type MessageTone = "error" | "success" | "notice";
type MessageProps = React.HTMLAttributes<HTMLElement> & {
  tone: MessageTone;
};
```

Behavior:

- `error` renders with `role="alert"` by default; `success` and `notice` render with `role="status"`. Callers may override `role`.
- Renders with the existing class hook (`form-error`, `form-success`) so existing tests keep working.
- Placement: directly above the submit button of the form it describes.

## Compatibility

- Class names retained as test hooks are listed in `research.md` §5 and must stay on the markup.
- Existing labels, `name` attributes, and `aria-label` values are unchanged.
