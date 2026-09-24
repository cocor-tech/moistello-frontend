import type { TestRunnerConfig } from "@storybook/test-runner";

/**
 * Storybook test-runner configuration (run with `npm run test:storybook`).
 *
 * With @storybook/addon-a11y installed, test-runner automatically performs an
 * axe a11y scan on every story and fails on any detected violation
 * (configured in preview.ts via `a11y.test: "error"`). Interaction tests
 * declared with `play` in stories run here too.
 *
 * Pixel-level visual regression is covered separately by the Playwright spec
 * in e2e/storybook-visual.spec.ts (`npm run test:visual`), which screenshots
 * the built Storybook against committed baselines.
 */
const config: TestRunnerConfig = {};

export default config;