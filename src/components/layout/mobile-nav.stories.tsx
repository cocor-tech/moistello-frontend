import type { Meta, StoryObj } from "@storybook/react";
import { MobileNav } from "./mobile-nav";

/**
 * Real iPhone 14 / 15 inset values, in CSS pixels.
 *
 * Storybook's browser viewport is a plain desktop window, so `env(safe-area-
 * inset-*)` always resolves to 0px here — the notch cannot be emulated by
 * resizing the canvas. What *can* be emulated is the custom property the
 * utilities are built on: `--safe-area-inset-*` is declared once in
 * `@layer base` of `globals.css` and read by every `*-safe` class, so pinning
 * that variable to a real device's numbers on a wrapper element reproduces
 * exactly what iOS computes. That is what `DeviceFrame` below does, and it is
 * also what makes this story a genuine regression test: a utility that stops
 * reading the token shows up here as a nav pill sitting back down under the
 * home-indicator bar.
 */
const IPHONE_14_PORTRAIT = {
  top: "59px", // Dynamic Island + status bar
  bottom: "34px", // home indicator
  left: "0px",
  right: "0px",
};

const IPHONE_14_LANDSCAPE = {
  top: "0px",
  bottom: "21px", // home indicator moves to the long edge
  left: "59px", // notch moves to the left
  right: "59px",
};

/** The strip of screen the home indicator physically occupies. */
const HOME_INDICATOR_LABEL = "Home indicator";

/**
 * Renders a child in a fixed phone-shaped frame with the safe-area tokens
 * pinned to real device values, and draws the inset regions as visible bands so
 * a reviewer can see at a glance whether UI is intruding into them.
 */
function DeviceFrame({
  insets,
  width,
  height,
  label,
  children,
}: {
  insets: { top: string; bottom: string; left: string; right: string };
  width: number;
  height: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="m-0 flex flex-col items-start gap-3">
      <figcaption className="font-mono text-xs text-muted-foreground">
        {label} — {width}×{height}, insets {insets.top} / {insets.right} / {insets.bottom} /{" "}
        {insets.left}
      </figcaption>

      <div
        className="relative overflow-hidden rounded-[2.75rem] border-4 border-zinc-700 bg-[rgb(var(--background))] shadow-2xl"
        style={{ width, height }}
      >
        {/*
          The token overrides. Scoped to this wrapper so they cascade down to
          MobileNav's `bottom-nav-safe` exactly as the :root values do in the
          real app, without leaking into sibling stories.
        */}
        <div
          className="absolute inset-0"
          style={
            {
              "--safe-area-inset-top": insets.top,
              "--safe-area-inset-right": insets.right,
              "--safe-area-inset-bottom": insets.bottom,
              "--safe-area-inset-left": insets.left,
            } as React.CSSProperties
          }
        >
          {/* Inset bands. `pointer-events-none` so they never eat a click. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 bg-red-500/15"
            style={{ height: insets.top }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-red-500/15"
            style={{ height: insets.bottom }}
          />

          {/*
            The scrolling-content padding the dashboard applies alongside the
            nav (`pb-nav-safe`). Shown as a hatched block so "does the last card
            clear the pill AND the indicator" is answerable by eye.
          */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
            <div
              className="border-t-2 border-dashed border-emerald-400/40"
              style={{ height: "6rem", marginBottom: insets.bottom }}
            >
              <span className="px-2 font-mono text-[10px] text-emerald-400">
                pb-nav-safe (6rem + inset) — last card must land above this line
              </span>
            </div>
          </div>

          <div className="relative h-full">{children}</div>
        </div>

        {/* The home indicator itself, for orientation. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 flex justify-center"
          style={{ bottom: Math.max(parseInt(insets.bottom, 10) / 2 - 2, 4) }}
        >
          <span className="h-1 w-32 rounded-full bg-white/70" />
        </div>
      </div>

      <p className="m-0 max-w-sm text-xs text-muted-foreground">
        {HOME_INDICATOR_LABEL} region is tinted red. The nav pill must sit entirely
        above it, and the dashed content line marks the minimum scroll extent of
        the page body.
      </p>
    </figure>
  );
}

const meta: Meta<typeof MobileNav> = {
  title: "UI/MobileNav",
  component: MobileNav,
  parameters: {
    // The component calls usePathname(), which the Next.js framework mock
    // resolves from these params. Without them the active-route highlight has
    // nothing to match and no item renders as current.
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/" },
    },
    viewport: {
      // A tall, phone-shaped canvas. The frame below does the real sizing; this
      // just stops the desktop-width canvas from adding side padding that would
      // make the fixed nav look misaligned in the docs panel.
      viewports: {
        phone: {
          name: "Phone",
          styles: { width: "100%", height: "100%", padding: "1rem" },
        },
      },
    },
    docs: {
      description: {
        component: [
          "Fixed bottom navigation shown below the `lg` breakpoint.",
          "",
          "### Safe-area handling",
          "",
          "The nav is anchored with `bottom-nav-safe` (see `globals.css`), which",
          "resolves to `calc(1rem + env(safe-area-inset-bottom))`. The bare `env()`",
          "call is only non-zero because the root layout's `viewport` export sets",
          "`viewportFit: \"cover\"` — without it the browser letterboxes the viewport",
          "and the nav renders underneath the iOS home indicator.",
          "",
          "The two rules to keep when touching this component:",
          "",
          "1. **Add to the inset, never replace it.** The 1rem lift is design; the",
          "   inset is a hardware allowance. Overlapping them would leave the pill",
          "   flush against the screen edge on a notched device.",
          "2. **The scroll container is a second site.** `DashboardLayout` applies",
          "   `pb-nav-safe` to `<main>`. The nav moving up without the content",
          "   padding moving with it strands the last card behind the pill.",
          "",
          "`--safe-area-inset-*` collapses to `0px` on every device without a",
          "notch, so these classes are applied unconditionally rather than behind a",
          "user-agent sniff.",
        ].join("\n"),
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MobileNav>;

export const NotchedDevice: Story = {
  name: "iPhone 14 — notched portrait",
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/" } },
  },
  render: () => (
    <DeviceFrame
      insets={IPHONE_14_PORTRAIT}
      width={390}
      height={844}
      label="iPhone 14 Pro"
    >
      <MobileNav />
    </DeviceFrame>
  ),
};

export const NotchedDeviceLandscape: Story = {
  name: "iPhone 14 — notched landscape",
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: "/circles" } },
    viewport: { defaultViewport: "phone" },
  },
  render: () => (
    <DeviceFrame
      insets={IPHONE_14_LANDSCAPE}
      width={844}
      height={390}
      label="iPhone 14 Pro landscape"
    >
      <MobileNav />
    </DeviceFrame>
  ),
};

export const UnnotchedDevice: Story = {
  name: "iPhone SE — no inset (regression baseline)",
  parameters: {
    // iPhone SE has no notch and no home indicator: both insets are genuinely
    // 0px, which is the pre-change rendering this branch must not disturb.
    nextjs: { appDirectory: true, navigation: { pathname: "/circles" } },
  },
  render: () => (
    <DeviceFrame
      insets={{ top: "20px", bottom: "0px", left: "0px", right: "0px" }}
      width={375}
      height={667}
      label="iPhone SE (no notch)"
    >
      <MobileNav />
    </DeviceFrame>
  ),
};
