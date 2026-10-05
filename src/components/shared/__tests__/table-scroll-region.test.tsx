import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { TableScrollRegion } from "../table-scroll-region";

/** Faked layout metrics — jsdom does no layout, so these stand in for it. */
interface Overflow {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft?: number;
}

/**
 * jsdom reports `clientWidth`/`scrollWidth` as 0 for everything, so overflow has
 * to be faked. Overriding the properties on the element prototype covers every
 * rendered instance without reaching into the component.
 */
function stubOverflow({ scrollWidth, clientWidth, scrollLeft = 0 }: Overflow) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
    configurable: true,
    get() {
      return scrollWidth;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return clientWidth;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
}

function resetOverflow() {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollLeft;
}

describe("TableScrollRegion", () => {
  afterEach(resetOverflow);

  it("exposes the scroll container as a named landmark", () => {
    render(
      <TableScrollRegion label="Wallet transactions table">
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    const region = screen.getByRole("region", { name: "Wallet transactions table" });
    expect(region).toBeInTheDocument();
    expect(region.tagName).toBe("DIV");
  });

  it("is reachable by keyboard in a single tab stop", () => {
    render(
      <TableScrollRegion label="Rounds table">
        <table>
          <tbody>
            <tr>
              <td>
                <a href="/rounds/1">Round 1</a>
              </td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    const region = screen.getByRole("region", { name: "Rounds table" });

    // One tab stop on the container itself — not one per scrollable axis, and
    // not a trap: focus continues into the table's own controls afterwards.
    expect(region).toHaveAttribute("tabindex", "0");
    expect(document.querySelectorAll('[tabindex="0"]')).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Round 1" })).toBeInTheDocument();
  });

  it("describes itself with the scroll hint", () => {
    render(
      <TableScrollRegion label="Rounds table" hint="Scroll sideways for more columns.">
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    const region = screen.getByRole("region", { name: "Rounds table" });
    const hintId = region.getAttribute("aria-describedby");

    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId as string)).toHaveTextContent(
      "Scroll sideways for more columns.",
    );
  });

  it("keeps the scroll controls out of the way when nothing overflows", () => {
    stubOverflow({ scrollWidth: 400, clientWidth: 400 });

    render(
      <TableScrollRegion label="Rounds table">
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    // Present in the DOM for stable layout, but display:none so they cannot
    // become invisible tab stops.
    const previous = screen.getByRole("button", { name: /to the left/i });
    expect(previous.closest("div")).toHaveClass("hidden");
    expect(previous).toBeDisabled();
  });

  it("reveals working scroll controls when the content overflows", () => {
    stubOverflow({ scrollWidth: 900, clientWidth: 300, scrollLeft: 0 });
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollBy", {
      configurable: true,
      value: scrollBy,
    });

    render(
      <TableScrollRegion label="Rounds table">
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    const previous = screen.getByRole("button", { name: "Scroll Rounds table to the left" });
    const next = screen.getByRole("button", { name: "Scroll Rounds table to the right" });

    expect(previous.closest("div")).not.toHaveClass("hidden");
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy.mock.calls[0][0]).toMatchObject({ left: expect.any(Number) });

    delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollBy;
  });

  it("honours showControls={false} by hiding the whole affordance", () => {
    stubOverflow({ scrollWidth: 900, clientWidth: 300, scrollLeft: 0 });

    render(
      <TableScrollRegion label="Rounds table" showControls={false}>
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    // The buttons and the hint line move together, so opting out never leaves a
    // visible "scroll sideways" prompt with no control to act on.
    expect(screen.getByRole("button", { name: /to the left/i }).closest("div")).toHaveClass(
      "hidden",
    );

    // `aria-describedby` still resolves — the text is kept for screen readers
    // and only hidden visually, so the region keeps describing itself.
    const region = screen.getByRole("region", { name: "Rounds table" });
    const hint = document.getElementById(region.getAttribute("aria-describedby")!);
    expect(hint).toHaveTextContent("Scroll sideways to see the remaining columns.");
    expect(hint!.parentElement).toHaveClass("sr-only");
  });

  it("renders an optional footer inside the bordered container", () => {
    render(
      <TableScrollRegion
        label="Rounds table"
        footer={<nav aria-label="Rounds pagination">pagination</nav>}
      >
        <table>
          <tbody>
            <tr>
              <td>1</td>
            </tr>
          </tbody>
        </table>
      </TableScrollRegion>
    );

    expect(screen.getByRole("navigation", { name: "Rounds pagination" })).toBeInTheDocument();
  });
});
