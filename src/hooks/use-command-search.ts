"use client";

import { useEffect, useMemo, useState } from "react";

import { fuzzyRank } from "@/lib/fuzzy";
import { commandSearchText } from "@/components/command-palette/commands";
import { COMMAND_GROUPS, type ResolvedCommand } from "@/hooks/use-command-commands";

/** A command paired with the character offsets to highlight. */
export interface CommandHit {
  command: ResolvedCommand;
  indices: number[];
}

export interface CommandGroupResult {
  id: string;
  label: string;
  hits: CommandHit[];
}

/** Hard cap so a one-character query cannot render hundreds of rows. */
const MAX_RESULTS = 40;

function group(hits: CommandHit[]): CommandGroupResult[] {
  return COMMAND_GROUPS.map((groupMeta) => ({
    id: groupMeta.id,
    label: groupMeta.label,
    hits: hits.filter((hit) => hit.command.group === groupMeta.id),
  })).filter((entry) => entry.hits.length > 0);
}

/**
 * Ranks and groups palette results, and owns the active-row cursor.
 *
 * Empty query  -> recents first, then the rest of the registry (recent ids are
 *                 filtered out of their home group to avoid duplicates).
 * Typed query  -> one globally ranked list, no separate recents section.
 */
export function useCommandSearch(
  commands: ResolvedCommand[],
  recentCommands: ResolvedCommand[],
) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const groups = useMemo<CommandGroupResult[]>(() => {
    if (!query.trim()) {
      const recentIds = new Set(recentCommands.map((command) => command.id));
      const rest = commands.filter((command) => !recentIds.has(command.id));
      return group([
        ...recentCommands.map((command) => ({ command, indices: [] })),
        ...rest.map((command) => ({ command, indices: [] })),
      ]);
    }

    const ranked = fuzzyRank(query, commands, commandSearchText).slice(0, MAX_RESULTS);
    return group(
      ranked.map(({ item, indices }) => ({ command: item, indices })),
    );
  }, [query, commands, recentCommands]);

  /** Flattened view used for arrow-key navigation. */
  const hits = useMemo(() => groups.flatMap((entry) => entry.hits), [groups]);

  // Any change to the result set invalidates the cursor; clamp rather than
  // reset so a shrinking list never leaves the index dangling.
  useEffect(() => {
    setActiveIndex((current) => (current >= hits.length ? 0 : current));
  }, [hits.length]);

  const move = (delta: number) => {
    setActiveIndex((current) => {
      if (hits.length === 0) return 0;
      return (current + delta + hits.length) % hits.length;
    });
  };

  const moveTo = (index: number) => {
    setActiveIndex(index);
  };

  const reset = () => {
    setQuery("");
    setActiveIndex(0);
  };

  return { query, setQuery, groups, hits, activeIndex, move, moveTo, reset };
}
