# Dependency audit notes

## Storybook addon-essentials

`@storybook/addon-essentials` remains on the compatible Storybook 8.6.14
release. The npm advisory currently reports every Storybook 8 release in the
affected range and recommends 7.0.6, but `@storybook/nextjs@7.0.6` does not
support this project's Next.js 14 dependency. Downgrading only the addon also
produces an incompatible Storybook dependency tree.

The Storybook 8.6.14 suite builds successfully and remains aligned across the
Storybook packages. Revisit this exception when a patched Storybook release
compatible with Next.js 14 is published.
