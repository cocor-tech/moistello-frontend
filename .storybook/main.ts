import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/**/*.mdx",
  ],
  // Controls, actions, backgrounds, viewport and interactions are bundled into
  // Storybook core since v9. Docs and a11y are still standalone addons.
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs",
    options: {
      imageConfig: {
        // Match next.config.mjs remotePatterns so next/image in stories
        // does not throw during static builds and test-runner runs.
        remotePatterns: [
          { protocol: "https", hostname: "avatars.githubusercontent.com" },
          { protocol: "https", hostname: "images.unsplash.com" },
          { protocol: "https", hostname: "**" },
        ],
      },
    },
  },
  staticDirs: ["../public"],
};

export default config;