import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCommandSearch } from "../use-command-search";
import type { ResolvedCommand } from "../use-command-commands";

function cmd(id: string): ResolvedCommand {
  return { id, group: "page", label: id, run: () => {} } as ResolvedCommand;
}

describe("useCommandSearch", () => {
  it("puts recents first, deduped from the rest of the registry", () => {
    const commands = [cmd("a"), cmd("b"), cmd("c")];
    const { result } = renderHook(() => useCommandSearch(commands, [cmd("b")]));

    expect(result.current.hits.map((hit) => hit.command.id)).toEqual(["b", "a", "c"]);
  });

  it("wraps the active index around both ends via move()", () => {
    const commands = [cmd("a"), cmd("b")];
    const { result } = renderHook(() => useCommandSearch(commands, []));

    act(() => result.current.move(-1));
    expect(result.current.activeIndex).toBe(1);
  });
});
