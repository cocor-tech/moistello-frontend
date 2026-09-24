import type { Meta, StoryObj } from "@storybook/react";
import {
  SkeletonScreen,
  SkeletonStatCards,
  SkeletonCardGrid,
  SkeletonListRows,
  SkeletonTable,
  SkeletonHero,
} from "@/components/skeletons/skeleton-primitives";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { MarketingSkeleton } from "@/components/skeletons/marketing-skeleton";

const meta: Meta = {
  title: "UI/Skeleton",
  parameters: {
    docs: {
      description: {
        component:
          "Loading placeholders with a shimmer animation, used by the app's Suspense `loading.tsx` boundaries. Variants mirror real layout: stat cards, content grids, list rows, tables and heroes — so first paint never causes layout shift.",
      },
    },
    a11y: { disable: true },
  },
};

export default meta;

export const StatCards: StoryObj = {
  render: () => (
    <SkeletonScreen className="p-4">
      <SkeletonStatCards count={3} />
    </SkeletonScreen>
  ),
};

export const CardGrid: StoryObj = {
  render: () => (
    <SkeletonScreen className="p-4">
      <SkeletonCardGrid count={3} />
    </SkeletonScreen>
  ),
};

export const ListRows: StoryObj = {
  render: () => (
    <SkeletonScreen className="p-4">
      <SkeletonListRows count={4} />
    </SkeletonScreen>
  ),
};

export const Table: StoryObj = {
  render: () => (
    <SkeletonScreen className="p-4">
      <SkeletonTable rows={4} columns={4} />
    </SkeletonScreen>
  ),
};

export const Hero: StoryObj = {
  render: () => (
    <SkeletonScreen className="p-4">
      <SkeletonHero />
    </SkeletonScreen>
  ),
};

export const DashboardPage: StoryObj = {
  render: () => <DashboardSkeleton />,
};

export const MarketingPage: StoryObj = {
  render: () => <MarketingSkeleton />,
};