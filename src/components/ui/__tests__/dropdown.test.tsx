import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Dropdown, DropdownItem } from "../dropdown";
import { Button } from "../button";

describe("Dropdown component", () => {
  it("renders trigger and opens menu on click", async () => {
    render(
      <Dropdown trigger={<span>Open Menu</span>}>
        <DropdownItem>Option 1</DropdownItem>
        <DropdownItem>Option 2</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByRole("button", { name: "Open Menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    expect(await screen.findByRole("menuitem", { name: "Option 1" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Option 2" })).toBeInTheDocument();
  });

  it("uses a supplied button as the single focusable trigger", async () => {
    render(
      <Dropdown trigger={<Button>Choose sort</Button>}>
        <DropdownItem>Newest</DropdownItem>
      </Dropdown>
    )

    const trigger = screen.getByRole("button", { name: "Choose sort" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("menuitem", { name: "Newest" })).toBeInTheDocument()
  })

  it("navigates options using ArrowDown and ArrowUp", async () => {
    render(
      <Dropdown trigger={<span>Open Menu</span>}>
        <DropdownItem>Option 1</DropdownItem>
        <DropdownItem>Option 2</DropdownItem>
        <DropdownItem>Option 3</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByRole("button", { name: "Open Menu" });
    fireEvent.click(trigger);

    await screen.findByRole("menuitem", { name: "Option 1" });
    const item2 = screen.getByRole("menuitem", { name: "Option 2" });
    const item3 = screen.getByRole("menuitem", { name: "Option 3" });

    // ArrowDown moves to Option 2
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(document.activeElement).toBe(item2);

    // ArrowDown moves to Option 3
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(document.activeElement).toBe(item3);

    // ArrowUp moves back to Option 2
    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    expect(document.activeElement).toBe(item2);
  });

  it("navigates radio menu items", async () => {
    render(
      <Dropdown trigger={<span>Sort circles</span>}>
        <DropdownItem role="menuitemradio" aria-checked="true">Newest</DropdownItem>
        <DropdownItem role="menuitemradio" aria-checked="false">Oldest</DropdownItem>
      </Dropdown>
    )

    const trigger = screen.getByRole("button", { name: "Sort circles" })
    fireEvent.click(trigger)
    const oldest = await screen.findByRole("menuitemradio", { name: "Oldest" })
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    expect(document.activeElement).toBe(oldest)
  })

  it("closes dropdown and restores focus to trigger on Escape key", async () => {
    render(
      <Dropdown trigger={<span>Open Menu</span>}>
        <DropdownItem>Option 1</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByRole("button", { name: "Open Menu" });
    fireEvent.click(trigger);

    await screen.findByRole("menuitem", { name: "Option 1" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(trigger, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("triggers item onClick and closes menu on selection", async () => {
    const handleSelect = vi.fn();
    render(
      <Dropdown trigger={<span>Open Menu</span>}>
        <DropdownItem onClick={handleSelect}>Option 1</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByRole("button", { name: "Open Menu" });
    fireEvent.click(trigger);

    const item1 = await screen.findByRole("menuitem", { name: "Option 1" });
    fireEvent.click(item1);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
