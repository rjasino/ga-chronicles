"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  getServerThemeSnapshot,
  getThemeSnapshot,
  persistTheme,
  subscribeTheme,
  type Theme,
} from "@/features/theme/theme";

/**
 * Header control that switches the whole site between the light and dark themes.
 *
 * The server renders the light default (it cannot know the device-local choice).
 * `useSyncExternalStore` serves that light snapshot during hydration and then
 * reconciles with the theme already applied to the document, so an explicit
 * stored choice is reflected without a hydration mismatch or a cascading effect.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isDark = theme === "dark";

  function toggleTheme() {
    const next: Theme = isDark ? "light" : "dark";
    applyTheme(next);
    persistTheme(next);
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__text">Dark mode</span>
    </button>
  );
}
