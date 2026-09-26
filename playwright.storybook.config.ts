import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression runner for the built Storybook. Different from the main
 * playwright.config.ts (which targets the live app): this one boots Storybook
 * in CI and screenshots every UI story against committed baselines.
 *
 *   npm run build-storybook
 *   npm run test:visual
 *
 * Regenerate baselines after intentional UI changes with:
 *
 *   npm run test:visual:update
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/storybook-visual.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  snapshotDir: "./.storybook/__visual-snapshots__",
  use: {
    baseURL: "http://127.0.0.1:6100",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command:
      "npm run build-storybook && node scripts/serve-storybook.mjs 6100 ./storybook-static",
    url: "http://127.0.0.1:6100/index.json",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});