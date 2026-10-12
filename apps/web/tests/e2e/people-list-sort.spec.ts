import { expect, test } from "@playwright/test";
import { createManyPeople, createPerson, deletePeople } from "./support/people";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function names(page: import("@playwright/test").Page) {
  return page.locator(".admin-list li strong").allTextContents();
}

test("the default view is sorted by username ascending", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users?q=local");
  const order = await names(page);
  expect(order).toEqual(["localadmin", "localcontributor", "localmoderator", "localmulti", "localreader"]);
});

test("role sorting follows the fixed hierarchy and stays stable", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users?q=local&sort=role&dir=asc");
  const asc = await names(page);
  expect(asc[0]).toBe("localreader");
  expect(asc[asc.length - 1]).toBe("localadmin");
  expect(asc.indexOf("localmoderator")).toBeGreaterThan(asc.indexOf("localcontributor"));
  expect(asc.indexOf("localmoderator")).toBeLessThan(asc.indexOf("localmulti")); // username tie-break
  expect(asc.indexOf("localadmin")).toBeGreaterThan(asc.indexOf("localmulti")); // modals group before admin

  await page.goto("/admin/users?q=local&sort=role&dir=desc");
  const desc = await names(page);
  expect(desc[0]).toBe("localadmin");
  expect(desc[desc.length - 1]).toBe("localreader");

  // Re-fetching the same role-sorted page returns the identical stable order.
  await page.goto("/admin/users?q=local&sort=role&dir=asc");
  expect(await names(page)).toEqual(asc);
});

test("email sorting places accounts with no email last in both directions", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const prefix = `srt${suffix}`;
  const ids = await Promise.all([
    createPerson({ username: `${prefix}a`, email: `${prefix}a@example.test` }),
    createPerson({ username: `${prefix}b`, email: `${prefix}b@example.test` }),
    createPerson({ username: `${prefix}c`, email: `${prefix}c@example.test`, withEmail: false }),
  ]);
  try {
    await signIn(page);
    await page.goto(`/admin/users?q=${prefix}&sort=email&dir=asc`);
    const asc = await names(page);
    expect(asc).toEqual([`${prefix}a`, `${prefix}b`, `${prefix}c`]);

    await page.goto(`/admin/users?q=${prefix}&sort=email&dir=desc`);
    const desc = await names(page);
    expect(desc[desc.length - 1]).toBe(`${prefix}c`);
  } finally {
    await deletePeople(ids);
  }
});

test("sorting by account creation date orders oldest and newest first", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const prefix = `crt${suffix}`;
  const ids = await Promise.all([
    createPerson({ username: `${prefix}old`, email: `${prefix}old@example.test`, createdAt: "2020-01-01T00:00:00Z" }),
    createPerson({ username: `${prefix}new`, email: `${prefix}new@example.test`, createdAt: "2021-01-01T00:00:00Z" }),
  ]);
  try {
    await signIn(page);
    await page.goto(`/admin/users?q=${prefix}&sort=created&dir=asc`);
    expect(await names(page)).toEqual([`${prefix}old`, `${prefix}new`]);

    await page.goto(`/admin/users?q=${prefix}&sort=created&dir=desc`);
    expect(await names(page)).toEqual([`${prefix}new`, `${prefix}old`]);
  } finally {
    await deletePeople(ids);
  }
});

test("role ordering stays deterministic across page turns with a large list", async ({ page }) => {
  const prefix = `rol${Date.now().toString().slice(-6)}`;
  const ids = await createManyPeople(25, prefix);
  const adminId = await createPerson({ username: `${prefix}admin`, email: `${prefix}a@example.test`, roles: ["admin"] });
  ids.push(adminId);
  try {
    await signIn(page);
    const href = `/admin/users?sort=role&dir=asc&page=1`;
    await page.goto(href);
    const firstPass = await names(page);
    await page.goto(href);
    const secondPass = await names(page);
    expect(secondPass).toEqual(firstPass);
  } finally {
    await deletePeople(ids);
  }
});