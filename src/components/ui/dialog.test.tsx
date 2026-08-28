import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Dialog from "./dialog";

afterEach(cleanup);

function DialogHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    onClose();
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open dialog</button>
      <Dialog isOpen={isOpen} onClose={close} ariaLabel="Test dialog">
        <div>
          <button>First action</button>
          <a href="/next">Last action</a>
        </div>
      </Dialog>
      <button>Outside</button>
    </>
  );
}

describe("Dialog", () => {
  it("cycles Tab and Shift+Tab within the open dialog", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("link", { name: "Last action" });

    expect(document.activeElement).toBe(first);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
    await user.tab();
    expect(document.activeElement).toBe(first);
  });

  it("closes the dialog on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<DialogHarness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the trigger when the dialog closes", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(document.activeElement).toBe(trigger);
  });
});
