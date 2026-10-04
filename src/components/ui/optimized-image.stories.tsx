import type { Meta, StoryObj } from "@storybook/react";
import { OptimizedImage } from "./optimized-image";

const meta: Meta<typeof OptimizedImage> = {
  title: "UI/OptimizedImage",
  component: OptimizedImage,
  parameters: {
    docs: {
      description: {
        component:
          "Thin `next/image` wrapper. Defaults `loading` to `lazy` (unless `priority` is set, which is the correct way to flag an LCP image), defaults `sizes` to `100vw` to avoid layout-shift warnings, and supports `blurPlaceholder` for a soft blur-up while loading.",
      },
    },
  },
  argTypes: {
    priority: { control: "boolean" },
    blurPlaceholder: { control: "boolean" },
    loading: { control: "select", options: ["lazy", "eager"] },
  },
  args: {
    src: "/logo.jpg",
    alt: "Moistello logo",
    width: 320,
    height: 320,
  },
};

export default meta;
type Story = StoryObj<typeof OptimizedImage>;

export const Default: Story = {};

export const WithBlurPlaceholder: Story = {
  args: { blurPlaceholder: true },
  parameters: {
    docs: {
      description: {
        story:
          "`blurPlaceholder` requires explicit width and height to avoid CLS. It is ignored when `priority` is set, since priority images should not be blurred.",
      },
    },
  },
};

export const Priority: Story = {
  args: { priority: true },
  parameters: {
    docs: {
      description: {
        story:
          "Use `priority` for the LCP image so it loads eagerly and skips lazy loading.",
      },
    },
  },
};

export const Responsive: Story = {
  args: { sizes: "(max-width: 768px) 100vw, 50vw", width: 640, height: 360 },
  render: (args) => (
    <div className="w-64 rounded-xl overflow-hidden">
      <OptimizedImage {...args} className="h-auto w-full" />
    </div>
  ),
};

export const Rounded: Story = {
  render: (args) => (
    <OptimizedImage
      {...args}
      width={160}
      height={160}
      className="rounded-full border-2 border-aurora-violet/40"
    />
  ),
};
