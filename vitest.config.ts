import { defineConfig } from "vitest/config"
import { fileURLToPath } from "url"
import { createRequire } from "module"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

// Load the react plugin via require to avoid the rolldown onLog issue
// that occurs when the plugin is imported as an ES module during config bundling.
// The plugin itself is CJS-compatible and works fine via require().
// eslint-disable-next-line @typescript-eslint/no-var-requires
const react = require("@vitejs/plugin-react")
const reactPlugin = typeof react.default === "function" ? react.default : react

export default defineConfig({
  plugins: [reactPlugin()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/setupTests.ts"],

    // ── Coverage configuration ──────────────────────────────────────────────
    // Run with: npx vitest run --coverage
    //
    // Critical paths (auth, wallet, crypto, verification) target 80% coverage.
    // Non-critical paths (UI pages, layout, locale helpers, animation constants)
    // are excluded so noise doesn't hide regressions in business logic.
    //
    // ## Exclusion rationale
    //
    // | Pattern              | Reason                                              |
    // |----------------------|-----------------------------------------------------|
    // | src/app/**           | Next.js page/layout files — covered by Playwright   |
    // | src/components/**    | Presentational — covered by e2e + component tests  |
    // | src/providers/**     | React context wrappers — integration-tested          |
    // | src/lib/locale/**    | Translation data — not business logic               |
    // | src/lib/motion/**    | Animation variant constants only                    |
    // | **/*.d.ts            | Type declaration files                              |
    // | **/index.ts          | Re-export barrels add noise to line counts          |
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      enabled: false, // enabled when running: vitest run --coverage

      include: ["src/**/*.{ts,tsx}"],

      exclude: [
        "src/app/**",
        "src/components/**",
        "src/providers/**",
        "src/lib/locale/**",
        "src/lib/motion/**",
        "**/*.d.ts",
        "**/index.ts",
        "src/setupTests.ts",
      ],

      // ── Global minimum thresholds ──────────────────────────────────────
      // CI runs: npx vitest run --coverage
      // These thresholds gate PRs. Critical path targets (auth/wallet/crypto)
      // are documented in .github/workflows/ci.yml as:
      //   lines: 80, functions: 80, branches: 80, statements: 80
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
      "next/dist/server/web/spec-extension/request": path.resolve(
        __dirname,
        "./node_modules/next/dist/server/web/spec-extension/request.js"
      ),
      "next/dist/server/web/spec-extension/response": path.resolve(
        __dirname,
        "./node_modules/next/dist/server/web/spec-extension/response.js"
      ),
      "next/dist/server/web/spec-extension/image-response": path.resolve(
        __dirname,
        "./node_modules/next/dist/server/web/spec-extension/image-response.js"
      ),
      "next/dist/server/web/spec-extension/user-agent": path.resolve(
        __dirname,
        "./node_modules/next/dist/server/web/spec-extension/user-agent.js"
      ),
      "next/dist/server/web/spec-extension/url-pattern": path.resolve(
        __dirname,
        "./node_modules/next/dist/server/web/spec-extension/url-pattern.js"
      ),
    },
  },
})
