import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Select } from "../select";

const OPTIONS = [
  { label: "All Circles", value: "" },
  { label: "Test Savings Circle", value: "circle-1" },
  { label: "Bonus Circle", value: "circle-2" },
];

describe("Select (accessible combobox)", () => {
  it("renders a combobox trigger with aria-expanded=false and listbox semantics", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
    expect(trigger).toHaveAttribute("aria-controls");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox on click and sets aria-expanded=true", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(OPTIONS.length);
  });

  it("selects an option on click and fires onChange", () => {
    const handleChange = vi.fn();
    render(<Select options={OPTIONS} value="" onChange={handleChange} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);

    const option = screen.getByRole("option", { name: "Test Savings Circle" });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith("circle-1");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the selected option with aria-selected=true", () => {
    render(<Select options={OPTIONS} value="circle-2" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);

    const selected = screen.getByRole("option", { name: "Bonus Circle" });
    expect(selected).toHaveAttribute("aria-selected", "true");

    const unselected = screen.getByRole("option", { name: "All Circles" });
    expect(unselected).toHaveAttribute("aria-selected", "false");
  });

  it("shows the selected label in the trigger", () => {
    render(<Select options={OPTIONS} value="circle-1" onChange={vi.fn()} placeholder="Circle" />);
    expect(screen.getByText("Test Savings Circle")).toBeInTheDocument();
  });

  it("shows placeholder when no value is selected", () => {
    const noEmptyOption = [
      { label: "Newest First", value: "date-desc" },
      { label: "Oldest First", value: "date-asc" },
    ];
    render(<Select options={noEmptyOption} value="" onChange={vi.fn()} placeholder="Sort by" />);
    expect(screen.getByText("Sort by")).toBeInTheDocument();
  });
});

describe("Select keyboard navigation", () => {
  it("opens on ArrowDown and moves the active option through the list", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();

    // First ArrowDown activates first enabled option
    let activeId = trigger.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).toHaveTextContent("All Circles");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("Test Savings Circle");
  });

  it("wraps around with ArrowDown from the last option and ArrowUp from the first", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    // Jump to the last option via End
    fireEvent.keyDown(trigger, { key: "End" });
    let activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("Bonus Circle");

    // Wrap to the first
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("All Circles");

    // Wrap from first back to last with ArrowUp
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("Bonus Circle");
  });

  it("selects the active option with Enter and closes the listbox", () => {
    const handleChange = vi.fn();
    render(<Select options={OPTIONS} value="" onChange={handleChange} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // -> Test Savings Circle

    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith("circle-1");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes with Escape and restores focus to the trigger", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("supports House / End to jump to first / last option", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.keyDown(trigger, { key: "End" });
    let activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("Bonus Circle");

    fireEvent.keyDown(trigger, { key: "House" });
    activeId = trigger.getAttribute("aria-activedescendant");
    expect(document.getElementById(activeId!)).toHaveTextContent("All Circles");
  });

  it("supports typeahead: typing a letter jumps to the matching option", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.keyDown(trigger, { key: "t" });

    const activeId = trigger.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).toHaveTextContent("Test Savings Circle");
  });

  it("closes on Tab without selecting", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "Tab" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when clicking outside the combobox", () => {
    render(
      <div>
        <button type="button">Outside</button>
        <Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" />
      </div>,
    );

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.mouseDown(screen.getByText("Outside"));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("skips disabled options during arrow navigation", () => {
    const withDisabled = [
      { label: "Option A", value: "a" },
      { label: "Option B (disabled)", value: "b", disabled: true },
      { label: "Option C", value: "c" },
    ];
    render(<Select options={withDisabled} value="" onChange={vi.fn()} placeholder="Pick" />);

    const trigger = screen.getByRole("combobox", { name: /pick/i });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(document.getElementById(trigger.getAttribute("aria-activedescendant")!)).toHaveTextContent("Option A");

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(document.getElementById(trigger.getAttribute("aria-activedescendant")!)).toHaveTextContent("Option C");
  });

  it("does not open or select when disabled", () => {
    render(<Select options={OPTIONS} value="" onChange={vi.fn()} placeholder="Circle" disabled />);

    const trigger = screen.getByRole("combobox", { name: /circle/i });
    expect(trigger).toBeDisabled();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
