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
      className="theme-toggle inline-flex min-h-11 cursor-pointer items-center gap-1.5 border border-line bg-transparent px-2 py-1 text-[.8rem] font-semibold text-ink hover:border-blue hover:text-blue focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-gold"
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      <span className="theme-toggle__track relative flex h-[18px] w-[34px] flex-none rounded-full border border-field-line bg-paper" aria-hidden="true">
        <span className="theme-toggle__thumb absolute top-0.5 left-0.5 size-3 rounded-full bg-muted transition-transform duration-200 [[aria-pressed=true]_&]:translate-x-4 [[aria-pressed=true]_&]:bg-blue" />
      </span>
      <span className="theme-toggle__text whitespace-nowrap">Dark mode</span>
    </button>
  );
}
