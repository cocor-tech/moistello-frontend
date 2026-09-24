import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { ToastProvider } from "@/providers/toast-provider";
import { useToast } from "@/hooks/use-toast";

/**
 * Demo harness: renders the real ToastProvider and drives it through the
 * `useToast` hook, proving the four variants, stacking and manual dismiss in
 * one glance.
 */
function ToastDemo() {
  const toast = useToast();

  useEffect(() => {
    toast.success("Payout sent", "500 USDC released to your wallet");
    toast.info("New invite", "Aya invited you to join 'Savings Squad'");
  }, [toast]);

  return (
    <div className="flex flex-wrap gap-3 p-6">
      <button
        className="rounded-xl bg-emerald-500/15 px-4 py-2 text-sm text-emerald-400"
        onClick={() => toast.success("Saved", "Changes were saved successfully")}
      >
        Success
      </button>
      <button
        className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-400"
        onClick={() => toast.error("Withdrawal failed", "Insufficient balance")}
      >
        Error
      </button>
      <button
        className="rounded-xl bg-amber-500/15 px-4 py-2 text-sm text-amber-400"
        onClick={() => toast.warning("Low balance", "Top up before the next round")}
      >
        Warning
      </button>
      <button
        className="rounded-xl bg-blue-500/15 px-4 py-2 text-sm text-blue-400"
        onClick={() => toast.info("Heads up", "New governance vote is open")}
      >
        Info
      </button>
    </div>
  );
}

const meta: Meta = {
  title: "UI/Toast",
  parameters: {
    docs: {
      description: {
        component:
          "Toast notification system mounted once in the root layout. Rendered through a portal with auto-dismiss (5s default), manual dismiss, four variants and a hard cap of five stacked toasts so the corner never overflows.",
      },
    },
  },
};

export default meta;

export const AllVariants: StoryObj = {
  render: () => (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  ),
};