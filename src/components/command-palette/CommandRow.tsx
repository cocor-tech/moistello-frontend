"use client";

import { memo } from "react";
import { CornerDownLeft } from "lucide-react";

import { cn } from "@/lib/cn";
import type { CommandHit } from "@/hooks/use-command-search";

/** Split a label into matched / unmatched runs for highlighting. */
function highlight(label: string, indices: number[]) {
  if (indices.length === 0) return label;

  const matched = new Set(indices);
  const parts: Array<{ text: string; hit: boolean }> = [];
  let buffer = "";
  let bufferHit = matched.has(0);

  for (let i = 0; i < label.length; i += 1) {
    const isHit = matched.has(i);
    if (isHit !== bufferHit) {
      parts.push({ text: buffer, hit: bufferHit });
      buffer = "";
      bufferHit = isHit;
    }
    buffer += label[i];
  }
  parts.push({ text: buffer, hit: bufferHit });

  return parts.map((part, index) =>
    part.hit ? (
      <mark
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className="bg-transparent font-bold text-aurora-violet"
      >
        {part.text}
      </mark>
    ) : (
      // eslint-disable-next-line react/no-array-index-key
      <span key={index}>{part.text}</span>
    ),
  );
}

export interface CommandRowProps {
  hit: CommandHit;
  isActive: boolean;
  onSelect: () => void;
  onHover: () => void;
}

function CommandRowBase({ hit, isActive, onSelect, onHover }: CommandRowProps) {
  const { command, indices } = hit;
  const Icon = command.icon;

  return (
    <li role="option" aria-selected={isActive} className="list-none">
      <button
        type="button"
        id={`command-${command.id}`}
        // `onMouseMove` rather than `onMouseEnter` so the active row keeps
        // tracking the pointer while the list scrolls under a stationary cursor.
        onMouseMove={onHover}
        onClick={onSelect}
        tabIndex={-1}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          isActive
            ? "bg-aurora-violet/12 text-foreground"
            : "text-foreground/80 hover:bg-white/5",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center border",
            isActive
              ? "border-aurora-violet/40 text-aurora-violet"
              : "border-white/10 text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <span className="min-w-0 flex-1 truncate text-sm">{highlight(command.label, indices)}</span>

        {command.hint && (
          <kbd className="shrink-0 border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
            {command.hint}
          </kbd>
        )}

        {isActive && (
          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

export const CommandRow = memo(CommandRowBase);
