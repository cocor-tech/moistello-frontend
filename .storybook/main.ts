import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../src/components/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../src/components/**/*.mdx",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
  ],
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
  docs: {
    autodocs: "tag",
  },
};

export default config;