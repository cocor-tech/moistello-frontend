import type { Preview } from "@storybook/react";
import { DarkModeProvider } from "./decorators/DarkModeProvider";
import "../src/app/globals.css";
import "./preview-style.css";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";

const preview: Preview = {
  decorators: [DarkModeProvider],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#08080c" },
        { name: "light", value: "#ffffff" },
      ],
    },
    a11y: {
      test: "error",
    },
  },
  tags: ["autodocs"],
};

export default preview;