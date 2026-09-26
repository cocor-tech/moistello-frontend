"use client";

import type { CommandGroupResult } from "@/hooks/use-command-search";
import { CommandRow } from "./CommandRow";

export interface CommandResultsProps {
  groups: CommandGroupResult[];
  activeIndex: number;
  onSelect: (flatIndex: number) => void;
  onHover: (flatIndex: number) => void;
  isLoading: boolean;
}

/**
 * Renders the grouped result list as a single `listbox`.
 *
 * A single listbox (rather than one per group) is what lets the combobox
 * input drive `aria-activedescendant` across group boundaries. `activeIndex`
 * is a flat cursor over all rows, so this component tracks the running offset
 * as it maps groups onto rows.
 */
export function CommandResults({
  groups,
  activeIndex,
  onSelect,
  onHover,
  isLoading,
}: CommandResultsProps) {
  if (groups.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">
        {isLoading ? "Loading circles…" : "No matching commands"}
      </p>
    );
  }

  let offset = 0;

  return (
    <ul
      role="listbox"
      aria-label="Commands"
      className="max-h-[min(24rem,55vh)] overflow-y-auto overscroll-contain py-2"
    >
      {groups.map((group) => {
        const rows = group.hits.map((hit) => {
          const flatIndex = offset;
          offset += 1;
          return (
            <CommandRow
              key={hit.command.id}
              hit={hit}
              isActive={flatIndex === activeIndex}
              onSelect={() => onSelect(flatIndex)}
              onHover={() => onHover(flatIndex)}
            />
          );
        });

        return (
          <li key={group.id} role="group" aria-label={group.label} className="list-none">
            <div className="flex items-center gap-3 px-4 pb-1 pt-3 first:pt-1">
              <span className="text-2xs font-heading uppercase tracking-[0.2em] text-muted-foreground">
                {group.label}
              </span>
              <span
                className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"
                aria-hidden="true"
              />
            </div>
            <ul role="presentation" className="m-0 list-none p-0">
              {rows}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
