import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const articleId = "20000000-0000-4000-8000-000000000001";
const readerId = "10000000-0000-4000-8000-000000000001";

async function signIn(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("moderation threshold, admin bypass, article removal, and comment toggle are enforced", async ({ page }) => {
  const body = `Threshold review ${crypto.randomUUID()}`;
  const commentId = crypto.randomUUID();
  await service.from("comments").insert({ id: commentId, article_id: articleId, author_id: readerId, body });
  await service.from("reports").insert([
    { comment_id: commentId, reporter_id: "10000000-0000-4000-8000-000000000002" },
    { comment_id: commentId, reporter_id: "10000000-0000-4000-8000-000000000004" },
  ]);

  await signIn(page, "localmoderator", "local-moderator-password");
  await page.goto("/admin/moderation");
  const review = page.locator(".review-item").filter({ hasText: body });
  await expect(review).toContainText("2 of 3 reports");
  await expect(review.getByRole("button", { name: "Remove comment" })).toHaveCount(0);
  await service.from("reports").insert({ comment_id: commentId, reporter_id: "10000000-0000-4000-8000-000000000005" });
  await page.reload();
  await page.locator(".review-item").filter({ hasText: body }).getByRole("button", { name: "Remove comment" }).click();
  await expect.poll(async () => (await service.from("comments").select("status").eq("id", commentId).single()).data?.status).toBe("deleted");

  const articleSlug = `moderation-test-${crypto.randomUUID()}`;
  const { data: removableArticle } = await service.from("articles").insert({
    title: "Temporary moderation test article", slug: articleSlug, body: "Local test article.", type: "news", status: "published", author_id: "10000000-0000-4000-8000-000000000002",
  }).select("id").single();
  await page.goto("/admin/moderation");
  await page.locator(".admin-list li").filter({ hasText: "Temporary moderation test article" }).getByRole("button", { name: "Remove article" }).click();
  await expect.poll(async () => (await service.from("articles").select("status").eq("id", removableArticle!.id).single()).data?.status).toBe("removed");

  const adminCommentId = crypto.randomUUID();
  await service.from("comments").insert({ id: adminCommentId, article_id: articleId, author_id: readerId, body: `Admin bypass ${crypto.randomUUID()}` });
  await service.from("reports").insert({ comment_id: adminCommentId, reporter_id: "10000000-0000-4000-8000-000000000002" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "localadmin", "local-admin-password");
  await page.goto("/admin/moderation");
  await expect(page.locator(".review-item").filter({ hasText: "Admin bypass" }).getByRole("button", { name: "Remove comment" })).toBeVisible();
  await page.locator(".review-item").filter({ hasText: "Admin bypass" }).getByRole("button", { name: "Remove comment" }).click();
  await expect.poll(async () => (await service.from("comments").select("status").eq("id", adminCommentId).single()).data?.status).toBe("deleted");

  await page.goto("/articles/a-new-chapter-for-independent-games");
  await page.getByLabel("Your comment").fill("Composed before the comments switch changes.");
  await service.from("site_settings").update({ comments_enabled: false }).eq("id", true);
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.locator(".form-error")).toContainText(/turned off/i);
  await expect(page.getByLabel("Your comment")).toHaveValue("Composed before the comments switch changes.");
  await service.from("site_settings").update({ comments_enabled: true }).eq("id", true);
});
