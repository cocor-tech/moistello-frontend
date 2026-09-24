import { expect, test } from "@playwright/test";

interface StoryEntry {
  id: string;
  title: string;
  type: string;
}

interface StorybookIndex {
  entries?: Record<string, StoryEntry>;
}

/**
 * Visual regression suite for Storybook UI components.
 *
 * Uses the Storybook static index (index.json) to discover every story whose
 * title starts with "UI/", renders each inside the built iframe.html and
 * compares a screenshot against the committed baseline under
 * `.storybook/__visual-snapshots__`.
 *
 * Regenerate baselines after intentional changes:
 *   npm run test:visual:update
 */
test("Storybook visual regression: UI stories", async ({ page }) => {
  test.setTimeout(180_000);

  const index: StorybookIndex = await page.request
    .get("/index.json")
    .then((res) => res.json());

  const stories: StoryEntry[] = Object.values(index.entries ?? {}).filter(
    (entry) => entry.type === "story" && entry.title.startsWith("UI/"),
  );

  expect(stories.length).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const story of stories) {
    await test.step(story.title, async () => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`, {
        waitUntil: "networkidle",
      });

      const root = page.locator("#storybook-root");
      await root.waitFor({ state: "visible" });
      await expect(root.locator(":scope > *").first()).toBeVisible({
        timeout: 20_000,
      });

      // Let framer-motion / portal mounted effects settle.
      await page.waitForTimeout(400);

      // Screenshot <body> so portal-rendered content (toasts, dialogs) is
      // captured too.
      await expect(page.locator("body")).toHaveScreenshot(
        `${story.id}.png`,
        {
          animations: "disabled",
          maxDiffPixelRatio: 0.02,
          timeout: 20_000,
        },
      );
    });
  }
});