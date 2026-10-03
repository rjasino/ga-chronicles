import { expect, test } from "@playwright/test";

test("a first visit opens in the light theme", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: /dark mode/i })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("the toggle switches the whole site between light and dark without reloading", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /dark mode/i });

  await page.evaluate(() => {
    (window as unknown as { __survivedToggle?: boolean }).__survivedToggle = true;
  });

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => page.evaluate(() => document.body.style.backgroundColor || getComputedStyle(document.body).backgroundColor))
    .toContain("rgb(10, 15, 28)");

  expect(
    await page.evaluate(
      () => (window as unknown as { __survivedToggle?: boolean }).__survivedToggle,
    ),
  ).toBe(true);

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test.describe("theme persistence", () => {
  test("a first visit stays light even when the device prefers dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("the chosen theme is remembered across a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /dark mode/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: /dark mode/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("a stored theme is applied before the document finishes loading (no flash)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /dark mode/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Record the document readyState at the moment the theme is first set to dark.
    await page.addInitScript(() => {
      const globalWindow = window as unknown as { __themeReadyState?: string };
      const proto = Element.prototype as unknown as {
        setAttribute: (name: string, value: string) => void;
      };
      const originalSetAttribute = proto.setAttribute;
      proto.setAttribute = function (this: Element, name: string, value: string) {
        if (name === "data-theme" && value === "dark" && !globalWindow.__themeReadyState) {
          globalWindow.__themeReadyState = document.readyState;
        }
        return originalSetAttribute.call(this, name, value);
      };
    });

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () => (window as unknown as { __themeReadyState?: string }).__themeReadyState,
      ),
    ).toBe("loading");
  });
});
