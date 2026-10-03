/**
 * Theme preference helpers.
 *
 * The preference is device-local and non-sensitive. Light is the default for a
 * first-time visitor regardless of the operating system's color setting; only an
 * explicit stored choice overrides it. All storage access is guarded so a blocked
 * or unavailable store fails safe to the default instead of throwing.
 */

export type Theme = "light" | "dark";

/** Fixed device-local storage key for the visitor's explicit theme choice. */
export const THEME_STORAGE_KEY = "game-ako-theme";

/** Appearance used when no valid stored choice exists. */
export const DEFAULT_THEME: Theme = "light";

/** Narrow an unknown value to a supported theme. */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Read the stored theme preference.
 * Returns `null` for a missing, invalid, or unreadable value.
 */
export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Apply a theme to the root document element. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.theme = theme;
  notifyThemeListeners();
}

/** Persist an explicit theme choice, ignoring unavailable storage. */
export function persistTheme(theme: Theme): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage is unavailable (e.g. private mode); the theme still applies for the session.
  }
}

type ThemeListener = () => void;

const themeListeners = new Set<ThemeListener>();

function notifyThemeListeners(): void {
  for (const listener of themeListeners) {
    listener();
  }
}

/**
 * Subscribe to theme changes for `useSyncExternalStore`. Same-tab changes notify
 * listeners directly via `applyTheme`; cross-tab changes arrive through the
 * storage event.
 */
export function subscribeTheme(listener: ThemeListener): () => void {
  themeListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    themeListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

/** Current theme from the live document (client snapshot). */
export function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return DEFAULT_THEME;
  }
  return document.documentElement.dataset.theme === "dark" ? "dark" : DEFAULT_THEME;
}

/** Server/hydration snapshot: always the light default. */
export function getServerThemeSnapshot(): Theme {
  return DEFAULT_THEME;
}
