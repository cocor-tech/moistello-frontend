import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignPrompt } from "../sign-prompt";

vi.mock("@/hooks/use-multi-wallet", () => ({
  useMultiWallet: () => ({
    activeWallet: null,
    detectedWallets: [],
  }),
}));

describe("SignPrompt", () => {
  it("does not retain dangling dialog references after signing succeeds", async () => {
    const onClose = vi.fn();
    const onSign = vi.fn().mockResolvedValue("signature");
    render(
      <SignPrompt
        isOpen
        onClose={onClose}
        onSign={onSign}
        title="Sign transaction"
        description="Review before signing"
      />,
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-describedby");

    fireEvent.click(screen.getByRole("button", { name: "Sign" }));
    await waitFor(() => expect(screen.getByText("Signed Successfully")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", "Transaction signed");
    expect(dialog).not.toHaveAttribute("aria-labelledby");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });
});
