import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  TableCaption,
  TableCell,
  TableHeadCell,
  TableRow,
} from "../responsive-table";

describe("responsive table primitives", () => {
  it("labels each cell with its column so it survives the stacked layout", () => {
    render(
      <table>
        <caption>Contributions</caption>
        <thead>
          <tr>
            <TableHeadCell label="Contributor">Contributor</TableHeadCell>
            <TableHeadCell label="Amount">Amount</TableHeadCell>
          </tr>
        </thead>
        <tbody>
          <TableRow>
            <TableCell label="Contributor" primary>
              abc123
            </TableCell>
            <TableCell label="Amount">$25.00</TableCell>
          </TableRow>
        </tbody>
      </table>
    );

    expect(screen.getByRole("columnheader", { name: "Contributor" })).toHaveAttribute("scope", "col");

    const cells = screen.getAllByRole("cell");
    expect(cells[0]).toHaveAttribute("data-label", "Contributor");
    expect(cells[1]).toHaveAttribute("data-label", "Amount");
  });

  it("clips rather than removes header cells so screen readers keep the association", () => {
    render(
      <table>
        <TableCaption>Round 3 contributions</TableCaption>
        <thead>
          <tr>
            <TableHeadCell label="Status">Status</TableHeadCell>
          </tr>
        </thead>
        <tbody>
          <TableRow>
            <TableCell label="Status">confirmed</TableCell>
          </TableRow>
        </tbody>
      </table>
    );

    const header = screen.getByRole("columnheader", { name: "Status" });

    expect(header).toHaveClass("responsive-table__head-cell");
    // `hidden` / `display:none` would take the header out of the accessibility
    // tree and leave every stacked value unlabelled.
    expect(header.className).not.toContain("hidden");
    expect(screen.getByRole("table")).toHaveAccessibleName("Round 3 contributions");
  });

  it("falls back to the header text when no explicit label is given", () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHeadCell label="Ignored">Amount</TableHeadCell>
          </tr>
        </thead>
        <tbody>
          <TableRow>
            <TableCell label="Amount">$5.00</TableCell>
          </TableRow>
        </tbody>
      </table>
    );

    // Children win for the visible header, so a label/content mismatch is
    // visible in review rather than silently shipping a mismatched card.
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.getByRole("cell")).toHaveAttribute("data-label", "Amount");
  });
});
