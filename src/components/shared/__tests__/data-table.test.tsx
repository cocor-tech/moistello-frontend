import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  DataTable,
  type DataTableColumn,
  type DataTablePagination,
} from "../data-table";

interface Tx {
  id: string;
  description: string;
  amount: number;
  status: string;
}

const rows: Tx[] = [
  { id: "tx-1", description: "Monthly contribution", amount: 25, status: "settled" },
  { id: "tx-2", description: "Late fee", amount: 5, status: "pending" },
];

const columns: DataTableColumn<Tx>[] = [
  { id: "description", header: "Description", accessor: (tx) => tx.description, sortable: true },
  { id: "amount", header: "Amount", accessor: (tx) => tx.amount, sortable: true },
  { id: "status", header: "Status", accessor: (tx) => tx.status },
];

type Overrides = {
  data?: Tx[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onSortChange?: (columnId: string, direction: "asc" | "desc") => void;
  pagination?: DataTablePagination;
};

/** The sort pill shown at narrow widths, scoped so it is not confused with the header button. */
function narrowSortButton(label: string) {
  const group = screen.getByRole("group", { name: "Sort wallet transactions" });
  return within(group).getByRole("button", { name: `Sort by ${label}` });
}

/**
 * The sort button inside the (clipped below `sm`) header strip.
 *
 * The header is addressed by its own name — the column — not by the button's
 * `aria-label`. A `<th>` names itself from its contents, and the sort button
 * supplies the visual column text plus a decorative icon, so the header reads
 * as "Amount" and the button inside it as "Sort by Amount".
 */
function headerSortButton(label: string) {
  const header = screen.getByRole("columnheader", { name: label });
  return within(header).getByRole("button", { name: `Sort by ${label}` });
}

function renderTable(overrides: Overrides = {}) {
  return render(
    <DataTable
      caption="Wallet transactions"
      columns={columns}
      data={rows}
      getRowId={(tx) => tx.id}
      {...overrides}
    />
  );
}

describe("DataTable accessibility", () => {
  it("gives the table a caption and a matching named scroll region", () => {
    renderTable();

    expect(screen.getByRole("table")).toHaveAccessibleName("Wallet transactions");
    expect(
      screen.getByRole("region", { name: "Wallet transactions table" })
    ).toBeInTheDocument();
  });

  it("marks every column header with scope", () => {
    renderTable();

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3);
    headers.forEach((header) => expect(header).toHaveAttribute("scope", "col"));
  });

  it("keeps the header row in the accessibility tree at narrow widths", () => {
    renderTable();

    const thead = screen.getByRole("table").querySelector("thead");

    // Clipped, not removed: `hidden` / `display:none` here would strip the
    // header association and leave a stacked card with an unlabelled value.
    expect(thead).not.toHaveClass("hidden");
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();
  });

  it("labels every cell with its column so stacked cards stay readable", () => {
    renderTable();

    const firstRow = screen.getAllByRole("row")[1];
    const cells = within(firstRow).getAllByRole("cell");

    expect(cells.map((cell) => cell.getAttribute("data-label"))).toEqual([
      "Description",
      "Amount",
      "Status",
    ]);
  });

  it("does not leave an invisible focus stop inside the clipped header", () => {
    renderTable();

    const headerCell = screen.getByRole("columnheader", { name: "Description" });

    expect(headerCell).toHaveClass("responsive-table__head-cell");

    // The header strip is visually clipped below `sm`, so its button is hidden
    // there and the pill takes over — Tab must never land on invisible UI.
    const sortButton = within(headerCell).getByRole("button");
    expect(sortButton.className).toContain("hidden");
    expect(sortButton.className).toContain("sm:inline-flex");
  });

  it("offers a visible sort control at narrow widths", () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange });

    fireEvent.click(narrowSortButton("Amount"));

    expect(onSortChange).toHaveBeenCalledWith("amount", "asc");
  });

  it("reflects the active sort direction on the column header", () => {
    renderTable();

    fireEvent.click(headerSortButton("Amount"));

    expect(screen.getByRole("columnheader", { name: /amount/i })).toHaveAttribute(
      "aria-sort",
      "ascending"
    );

    fireEvent.click(headerSortButton("Amount"));

    expect(screen.getByRole("columnheader", { name: /amount/i })).toHaveAttribute(
      "aria-sort",
      "descending"
    );
  });

  it("sorts rows without mutating the source array", () => {
    renderTable();

    fireEvent.click(headerSortButton("Amount"));

    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("Late fee")).toBeInTheDocument();
    expect(rows[0].description).toBe("Monthly contribution");
  });

  it("names the pagination navigation", () => {
    renderTable({
      pagination: { page: 1, pageSize: 1, total: 2, onPageChange: vi.fn() },
    });

    const nav = screen.getByRole("navigation", { name: "Wallet transactions pagination" });
    expect(within(nav).getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("renders the empty state inside the table when there are no rows", () => {
    renderTable({ data: [], emptyState: <p>No transactions</p> });

    expect(screen.getByText("No transactions")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("marks the table busy while loading", () => {
    renderTable({ isLoading: true });

    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });
});
