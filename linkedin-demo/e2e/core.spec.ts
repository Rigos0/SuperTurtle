import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsGuest } from "./helpers";

async function waitForFeedPosts(page: Page) {
  await expect(page.locator('[id^="post-"]').first()).toBeVisible({ timeout: 15_000 });
}

async function getVisibleLikeCount(post: Locator) {
  const countLabels = post.locator("h4").filter({ hasText: /^\d+$/ });
  const visibleCountLabels = await countLabels.all();

  for (const label of visibleCountLabels) {
    if (await label.isVisible()) {
      const countText = (await label.textContent())?.trim() ?? "0";
      return Number.parseInt(countText, 10);
    }
  }

  return 0;
}

test("Guest login", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Continue as Guest/i })).toBeVisible();
  await page.getByRole("button", { name: /Continue as Guest/i }).click();

  await expect(page.getByPlaceholder("Start a post")).toBeVisible();
  await expect(page.getByRole("button", { name: "Post" })).toBeVisible();
  await waitForFeedPosts(page);

  expect(await page.locator('[id^="post-"]').count()).toBeGreaterThan(0);
});

test.describe("Feed", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsGuest(page);
  });

  test("Feed loads posts", async ({ page }) => {
    await waitForFeedPosts(page);

    const posts = page.locator('[id^="post-"]');
    expect(await posts.count()).toBeGreaterThanOrEqual(2);

    const firstPost = posts.first();
    await expect(firstPost.getByRole("heading").first()).toBeVisible();
    await expect(firstPost.getByText(/ago$/i).first()).toBeVisible();

    const firstPostDescription = (await firstPost.locator("p").nth(1).textContent())?.trim() ?? "";
    expect(firstPostDescription.length).toBeGreaterThan(0);
  });

  test("Like a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const firstPost = page.locator('[id^="post-"]').first();
    const likeAction = firstPost.getByText("Like", { exact: true });
    const initialLikeCount = await getVisibleLikeCount(firstPost);

    await likeAction.click();
    await expect(likeAction).toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => getVisibleLikeCount(firstPost), { timeout: 10_000 })
      .toBe(initialLikeCount + 1);

    await likeAction.click();
    await expect(likeAction).not.toHaveCSS("color", "rgb(46, 125, 50)");
    await expect
      .poll(async () => getVisibleLikeCount(firstPost), { timeout: 10_000 })
      .toBe(initialLikeCount);
  });

  test("Comment on a post", async ({ page }) => {
    await waitForFeedPosts(page);

    const firstPost = page.locator('[id^="post-"]').first();
    const commentBody = `Test comment from e2e ${Date.now()}`;

    await firstPost.getByText("Comment", { exact: true }).click();
    await firstPost.getByPlaceholder("Add a comment").fill(commentBody);
    await firstPost.getByRole("button", { name: "Send" }).click();

    const commentText = firstPost.getByText(commentBody, { exact: true });
    await expect(commentText).toBeVisible();

    const commentContent = commentText.locator("xpath=..");
    await expect(commentContent.getByRole("heading", { level: 5 })).toBeVisible();

    await commentContent.getByRole("img", { name: "Delete comment" }).click();
    await expect(commentText).toHaveCount(0);
  });
});
