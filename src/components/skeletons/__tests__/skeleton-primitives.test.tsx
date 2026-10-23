import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  SkeletonScreen,
  SkeletonText,
  SkeletonHeading,
  SkeletonHero,
  SkeletonStatCards,
  SkeletonCardGrid,
  SkeletonListRows,
  SkeletonTable,
} from "../skeleton-primitives";

describe("SkeletonScreen", () => {
  it("renders children with accessible loading attributes", () => {
    render(
      <SkeletonScreen data-testid="skeleton-screen">
        <div>Loading content...</div>
      </SkeletonScreen>
    );

    const screenEl = screen.getByTestId("skeleton-screen");
    expect(screenEl).toBeInTheDocument();
    expect(screenEl).toHaveAttribute("aria-busy", "true");
    expect(screenEl).toHaveAttribute("aria-label", "Loading");
    expect(screenEl).toHaveClass("w-full");
    expect(screen.getByText("Loading content...")).toBeInTheDocument();
  });

  it("merges custom className and forwards extra HTML attributes", () => {
    render(
      <SkeletonScreen
        className="custom-screen-class"
        data-testid="custom-shell"
        role="status"
        aria-label="Loading profile"
      >
        <span>Content</span>
      </SkeletonScreen>
    );

    const el = screen.getByTestId("custom-shell");
    expect(el).toHaveClass("w-full");
    expect(el).toHaveClass("custom-screen-class");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-label", "Loading profile");
  });

  it("handles user interaction via passed event handlers", () => {
    const handleClick = vi.fn();
    render(
      <SkeletonScreen onClick={handleClick} data-testid="interactive-skeleton">
        <span>Clickable placeholder</span>
      </SkeletonScreen>
    );

    fireEvent.click(screen.getByTestId("interactive-skeleton"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe("SkeletonText", () => {
  it("renders text skeleton with default w-full width", () => {
    const { container } = render(<SkeletonText />);
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("w-full");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
  });

  it("applies custom width and custom className", () => {
    const { container } = render(
      <SkeletonText width="w-1/2" className="custom-text-class" />
    );
    const skeleton = container.firstChild as HTMLElement;

    expect(skeleton).toHaveClass("w-1/2");
    expect(skeleton).toHaveClass("custom-text-class");
  });
});

describe("SkeletonHeading", () => {
  it("renders heading skeleton with default w-2/5 titleWidth and subtitle line", () => {
    const { container } = render(<SkeletonHeading />);
    const headingGroup = container.firstChild as HTMLElement;

    expect(headingGroup).toBeInTheDocument();
    expect(headingGroup).toHaveClass("space-y-3");

    const skeletons = headingGroup.querySelectorAll("div");
    expect(skeletons.length).toBe(2);
    expect(skeletons[0]).toHaveClass("w-2/5");
    expect(skeletons[1]).toHaveClass("w-3/4");
  });

  it("supports custom titleWidth and className", () => {
    const { container } = render(
      <SkeletonHeading titleWidth="w-4/5" className="custom-heading-class" />
    );
    const headingGroup = container.firstChild as HTMLElement;

    expect(headingGroup).toHaveClass("custom-heading-class");
    const firstSkeleton = headingGroup.querySelector("div");
    expect(firstSkeleton).toHaveClass("w-4/5");
  });
});

describe("SkeletonHero", () => {
  it("renders hero skeleton placeholder structure and supports custom className", () => {
    const { container } = render(<SkeletonHero className="custom-hero-class" />);
    const hero = container.firstChild as HTMLElement;

    expect(hero).toBeInTheDocument();
    expect(hero).toHaveClass("relative");
    expect(hero).toHaveClass("overflow-hidden");
    expect(hero).toHaveClass("custom-hero-class");

    const skeletons = hero.querySelectorAll("div[aria-hidden='true']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("SkeletonStatCards", () => {
  it("renders default of 3 stat cards", () => {
    render(<SkeletonStatCards />);

    expect(screen.getByTestId("skeleton-stat-cards")).toBeInTheDocument();
    const cards = screen.getAllByTestId("skeleton-stat");
    expect(cards).toHaveLength(3);
  });

  it("renders custom count of stat cards", () => {
    render(<SkeletonStatCards count={5} className="custom-stats-class" />);

    const container = screen.getByTestId("skeleton-stat-cards");
    expect(container).toHaveClass("custom-stats-class");
    const cards = screen.getAllByTestId("skeleton-stat");
    expect(cards).toHaveLength(5);
  });

  it("gracefully handles zero count boundary case", () => {
    render(<SkeletonStatCards count={0} />);

    expect(screen.getByTestId("skeleton-stat-cards")).toBeInTheDocument();
    expect(screen.queryAllByTestId("skeleton-stat")).toHaveLength(0);
  });
});

describe("SkeletonCardGrid", () => {
  it("renders default of 6 content card placeholders", () => {
    render(<SkeletonCardGrid />);

    expect(screen.getByTestId("skeleton-card-grid")).toBeInTheDocument();
    const cards = screen.getAllByTestId("skeleton-card");
    expect(cards).toHaveLength(6);
  });

  it("renders custom count of cards with custom className", () => {
    render(<SkeletonCardGrid count={2} className="custom-grid-class" />);

    const grid = screen.getByTestId("skeleton-card-grid");
    expect(grid).toHaveClass("custom-grid-class");
    expect(screen.getAllByTestId("skeleton-card")).toHaveLength(2);
  });

  it("gracefully handles zero count boundary case", () => {
    render(<SkeletonCardGrid count={0} />);

    expect(screen.getByTestId("skeleton-card-grid")).toBeInTheDocument();
    expect(screen.queryAllByTestId("skeleton-card")).toHaveLength(0);
  });
});

describe("SkeletonListRows", () => {
  it("renders default of 5 rows", () => {
    render(<SkeletonListRows />);

    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    const rows = screen.getAllByTestId("skeleton-row");
    expect(rows).toHaveLength(5);
  });

  it("renders custom count of rows with custom className", () => {
    render(<SkeletonListRows count={4} className="custom-list-class" />);

    const list = screen.getByTestId("skeleton-list");
    expect(list).toHaveClass("custom-list-class");
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(4);
  });

  it("gracefully handles zero count boundary case", () => {
    render(<SkeletonListRows count={0} />);

    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    expect(screen.queryAllByTestId("skeleton-row")).toHaveLength(0);
  });
});

describe("SkeletonTable", () => {
  it("renders default 5 rows with 4 columns each", () => {
    render(<SkeletonTable />);

    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
    const rows = screen.getAllByTestId("skeleton-table-row");
    expect(rows).toHaveLength(5);

    rows.forEach((row) => {
      const cells = row.querySelectorAll("div[aria-hidden='true']");
      expect(cells).toHaveLength(4);
    });
  });

  it("renders custom row and column counts with custom className", () => {
    render(<SkeletonTable rows={2} columns={3} className="custom-table-class" />);

    const table = screen.getByTestId("skeleton-table");
    expect(table).toHaveClass("custom-table-class");

    const rows = screen.getAllByTestId("skeleton-table-row");
    expect(rows).toHaveLength(2);

    rows.forEach((row) => {
      const cells = row.querySelectorAll("div[aria-hidden='true']");
      expect(cells).toHaveLength(3);
    });
  });

  it("gracefully handles zero rows and zero columns boundary case", () => {
    render(<SkeletonTable rows={0} columns={0} />);

    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
    expect(screen.queryAllByTestId("skeleton-table-row")).toHaveLength(0);
  });
});
