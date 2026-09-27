import { defineConfig, devices } from "@playwright/test"

/**
 * Target viewport for the mobile smoke suite: iPhone 12/13/14 class, which is
 * the narrowest width the app claims to support. Kept as a named constant so
 * the spec and any future mobile regression test agree on the exact size.
 */
export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const

/**
 * Escape hatch for environments where `playwright install` cannot provide a
 * browser (unsupported distro, air-gapped runner). Set
 * PLAYWRIGHT_BROWSER_CHANNEL=chrome to drive the system Chrome instead.
 * Unset in CI, which uses the pinned `playwright install --with-deps` build.
 */
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "*.spec.ts"],
  testIgnore: [
    /hmac\.spec\.ts/,
    /[/\\](network|realtime|security|load)[/\\]/,
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: "list",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1110",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:1110",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(browserChannel ? { channel: browserChannel } : {}) },
      testIgnore: [
        /mobile-smoke\.spec\.ts/,
        /hmac\.spec\.ts/,
        /[/\\](network|realtime|security|load)[/\\]/,
      ],
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        // Pixel 5 ships 393x851; pin the exact size the app targets instead.
        viewport: { ...MOBILE_VIEWPORT },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
      testMatch: /mobile-smoke\.spec\.ts/,
    },
  ],
})
