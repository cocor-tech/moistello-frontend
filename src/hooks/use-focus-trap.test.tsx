import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFocusTrap } from "./use-focus-trap";

afterEach(cleanup);

function FocusTrapHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    onClose();
    setIsOpen(false);
  };
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, close);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open menu</button>
      {isOpen && (
        <div ref={trapRef} role="dialog" tabIndex={-1}>
          <button>First menu item</button>
          <a href="/second">Last menu item</a>
        </div>
      )}
      <button>Behind overlay</button>
    </>
  );
}

function DelayedFocusTrapHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, () => setIsOpen(false));

  const open = () => {
    setIsOpen(true);
    setTimeout(() => setIsReady(true), 10);
  };

  return (
    <>
      <button onClick={open}>Open delayed menu</button>
      {isOpen && isReady && (
        <div ref={trapRef} role="dialog" tabIndex={-1}>
          <button>Delayed first item</button>
        </div>
      )}
    </>
  );
}

function DelayedChildFocusTrapHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const [containerReady, setContainerReady] = useState(false);
  const [childReady, setChildReady] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen, () => setIsOpen(false));

  const open = () => {
    setIsOpen(true);
    setTimeout(() => setContainerReady(true), 5);
    setTimeout(() => setChildReady(true), 15);
  };

  return (
    <>
      <button onClick={open}>Open delayed child menu</button>
      {isOpen && containerReady && (
        <div ref={trapRef} role="dialog" tabIndex={-1}>
          {childReady && <button>Delayed child item</button>}
        </div>
      )}
    </>
  );
}

describe("useFocusTrap", () => {
  it("cycles Tab and Shift+Tab within the open menu", async () => {
    const user = userEvent.setup();
    render(<FocusTrapHarness />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const firstItem = screen.getByRole("button", { name: "First menu item" });
    const lastItem = screen.getByRole("link", { name: "Last menu item" });

    expect(document.activeElement).toBe(firstItem);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(lastItem);
    await user.tab();
    expect(document.activeElement).toBe(firstItem);
  });

  it("closes the menu on Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FocusTrapHarness onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the trigger when the menu closes", async () => {
    const user = userEvent.setup();
    render(<FocusTrapHarness />);
    const trigger = screen.getByRole("button", { name: "Open menu" });

    await user.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(trigger);
  });

  it("focuses a dialog that mounts after the trap is opened", async () => {
    const user = userEvent.setup();
    render(<DelayedFocusTrapHarness />);

    await user.click(screen.getByRole("button", { name: "Open delayed menu" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delayed first item" })));
  });

  it("keeps observing until asynchronously populated controls arrive", async () => {
    const user = userEvent.setup();
    render(<DelayedChildFocusTrapHarness />);

    await user.click(screen.getByRole("button", { name: "Open delayed child menu" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delayed child item" })));
  });

  it("redirects Tab focus when focus is moved outside the dialog", async () => {
    const user = userEvent.setup();
    render(<FocusTrapHarness />);

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const behindOverlay = screen.getByRole("button", { name: "Behind overlay" });
    behindOverlay.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First menu item" }));
  });
});
