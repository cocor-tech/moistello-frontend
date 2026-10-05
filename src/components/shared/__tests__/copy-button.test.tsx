import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "../copy-button";

const mockCopyToClipboard = vi.fn();

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (text: string) => mockCopyToClipboard(text),
}));

const FULL = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567AB";
const SHORT = "GABCD…4567AB";

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom implements neither the clipboard API nor execCommand, so every test
  // declares the outcome it needs rather than inheriting jsdom's default.
  Object.defineProperty(navigator, "clipboard", {
    value: undefined,
    configurable: true,
  });
  document.execCommand = vi.fn().mockReturnValue(false);
});

describe("CopyButton", () => {
  it("copies the full text, not the truncated label", async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    render(<CopyButton text={FULL} label={SHORT} fullText={FULL} />);

    fireEvent.click(screen.getByRole("button"));

    expect(mockCopyToClipboard).toHaveBeenCalledWith(FULL);
    expect(mockCopyToClipboard).not.toHaveBeenCalledWith(SHORT);
  });

  it("exposes the full address as a tooltip and as the accessible name", () => {
    render(<CopyButton text={FULL} label={SHORT} fullText={FULL} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", FULL);
    // The visible text stays truncated, but the accessible name is not.
    expect(button).toHaveTextContent(SHORT);
    expect(button.getAttribute("aria-label")).toContain(FULL);
  });

  it("falls back to the label when no full text is supplied", () => {
    render(<CopyButton text={FULL} label={SHORT} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", FULL);
    expect(button.getAttribute("aria-label")).toContain(SHORT);
  });

  it("notifies the caller so it can raise a confirmation toast", async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    const onCopied = vi.fn();
    render(<CopyButton text={FULL} onCopied={onCopied} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(onCopied).toHaveBeenCalledWith(FULL));
  });

  it("reports a failed copy to the caller", async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    const onError = vi.fn();
    render(<CopyButton text={FULL} onError={onError} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error)));
  });

  it("falls back to a selectable input containing the full address when copying fails", async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<CopyButton text={FULL} label={SHORT} fullText={FULL} />);

    fireEvent.click(screen.getByRole("button"));

    const fallback = await screen.findByTestId("copy-fallback");
    const input = fallback.querySelector("input") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    // The truncated form would be useless to paste.
    expect(input.value).toBe(FULL);
    // Read-only so it cannot be edited into something wrong.
    expect(input).toHaveAttribute("readonly");
  });

  it("labels the fallback input so its purpose is clear to a screen reader", async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<CopyButton text={FULL} fullText={FULL} />);

    fireEvent.click(screen.getByRole("button"));

    expect(
      await screen.findByLabelText(new RegExp("select and copy this value manually", "i")),
    ).toBeInTheDocument();
  });

  it("re-selects the fallback text when it is focused", async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<CopyButton text={FULL} fullText={FULL} />);

    fireEvent.click(screen.getByRole("button"));
    const input = (await screen.findByTestId("copy-fallback")).querySelector(
      "input",
    ) as HTMLInputElement;

    const select = vi.spyOn(input, "select");
    fireEvent.focus(input);

    expect(select).toHaveBeenCalled();
  });

  it("can suppress the fallback for callers that handle failure themselves", async () => {
    mockCopyToClipboard.mockResolvedValue(false);
    render(<CopyButton text={FULL} showFallbackOnError={false} />);

    fireEvent.click(screen.getByRole("button"));

    // The accessible name flips to the error state, which is the signal that the
    // copy was attempted and failed.
    await waitFor(() =>
      expect(screen.getByRole("button").getAttribute("aria-label")).toMatch(/^Failed to copy/),
    );
    expect(screen.queryByTestId("copy-fallback")).not.toBeInTheDocument();
  });

  it("does not show the fallback after a successful copy", async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    render(<CopyButton text={FULL} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent(/copied/i));
    expect(screen.queryByTestId("copy-fallback")).not.toBeInTheDocument();
  });

  it("copies an empty string without crashing", async () => {
    mockCopyToClipboard.mockResolvedValue(true);
    render(<CopyButton text="" />);

    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
    expect(mockCopyToClipboard).toHaveBeenCalledWith("");
  });

  it("recovers when a later copy succeeds after an earlier failure", async () => {
    mockCopyToClipboard.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<CopyButton text={FULL} fullText={FULL} />);

    fireEvent.click(screen.getByRole("button"));
    await screen.findByTestId("copy-fallback");

    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.queryByTestId("copy-fallback")).not.toBeInTheDocument());
  });
});
