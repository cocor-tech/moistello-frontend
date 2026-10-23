import eslintConfigNext from "eslint-config-next"

export default [
  ...eslintConfigNext,
  {
    rules: {
      "jsx-a11y/label-has-associated-control": "error",
    },
  },
  {
    files: ["src/**/*.stories.ts", "src/**/*.stories.tsx"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]