"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useCommandCommands } from "@/hooks/use-command-commands";
import { useCommandSearch } from "@/hooks/use-command-search";
import { useUIStore } from "@/stores/ui-store";
import { CommandResults } from "./CommandResults";

/**
 * Cmd+K / Ctrl+K command palette.
 *
 * Keyboard-only by construction: the dialog is a combobox over a listbox, so
 * focus lands in the search field on open, arrows drive the active row, Enter
 * runs it, and `useFocusTrap` supplies Escape-to-close, Tab wrapping and
 * focus restoration. Outside clicks land on the backdrop, which closes too.
 */
export function CommandPalette() {
  const isOpen = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const { commands, recentCommands, runCommand, isLoadingCircles } =
    useCommandCommands(isOpen);
  const { query, setQuery, groups, hits, activeIndex, move, moveTo, reset } =
    useCommandSearch(commands, recentCommands);

  const titleId = useId();
  const listId = `${titleId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen, () => setOpen(false));

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [setOpen, reset]);

  const select = useCallback(
    (flatIndex: number) => {
      const hit = hits[flatIndex];
      if (hit) runCommand(hit.command);
    },
    [hits, runCommand],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          move(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          move(-1);
          break;
        case "House":
          if (hits.length === 0) return;
          event.preventDefault();
          moveTo(0);
          break;
        case "End":
          if (hits.length === 0) return;
          event.preventDefault();
          moveTo(hits.length - 1);
          break;
        case "Enter":
          event.preventDefault();
          select(activeIndex);
          break;
        default:
          break;
      }
    },
    [move, moveTo, hits.length, select, activeIndex],
  );

  // Mirror the browser's find bar: Cmd/Ctrl+K toggles, including while the
  // search field already has focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!event.metaKey && !event.ctrlKey) return;
      event.preventDefault();
      const next = !useUIStore.getState().commandPaletteOpen;
      useUIStore.getState().setCommandPaletteOpen(next);
      if (!next) reset();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [reset]);

  // Reset the query each time the palette opens so it never reopens showing
  // the previous session's stale filter.
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]"
      onKeyDown={handleKeyDown}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative flex w-full max-w-xl flex-col overflow-hidden",
          "border border-white/12 bg-[rgb(var(--card))] shadow-2xl",
        )}
      >
        <h2 id={titleId} className="sr-only">
          Command palette
        </h2>

        <div className="flex items-center gap-3 border-b border-white/10 px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={
              hits[activeIndex] ? `command-${hits[activeIndex].command.id}` : undefined
            }
            aria-autocomplete="list"
            placeholder="Search pages, circles and settings…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="hidden shrink-0 border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        <div id={listId}>
          <CommandResults
            groups={groups}
            activeIndex={activeIndex}
            onSelect={select}
            onHover={moveTo}
            isLoading={isLoadingCircles}
          />
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-2xs text-muted-foreground">
          <kbd className="font-mono">↑↓</kbd> navigate ·{" "}
          <kbd className="font-mono">↵</kbd> select ·{" "}
          <kbd className="font-mono">Esc</kbd> close
        </p>
      </motion.div>
    </div>,
    document.body,
  );
}
