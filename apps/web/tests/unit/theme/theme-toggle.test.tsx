import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";
import { THEME_STORAGE_KEY } from "@/features/theme/theme";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders an accessible control that is not pressed in the light theme", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark mode/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("switches to the dark theme and persists the choice when activated", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark mode/i });

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("switches back to the light theme when activated again", () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: /dark mode/i });

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("reflects a theme already applied to the document on mount", () => {
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /dark mode/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
