"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CircleDot } from "lucide-react";

import { Routes } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useCommandCircles } from "@/hooks/use-command-circles";
import { useRecentCommands } from "@/hooks/use-recent-commands";
import {
  ACTION_COMMANDS,
  NAVIGATION_COMMANDS,
  type ActionCommandSpec,
  type BaseCommand,
  type NavigationCommand,
  type SettingsActionApi,
} from "@/components/command-palette/commands";

/** A registry entry with its side effect bound and ready to invoke. */
export interface ResolvedCommand extends BaseCommand {
  run: () => void;
}

/** Display order and headings for the grouped result list. */
export const COMMAND_GROUPS = [
  { id: "recent", label: "Recent" },
  { id: "page", label: "Pages" },
  { id: "action", label: "Actions" },
] as const;

/**
 * Builds the palette's searchable command list.
 *
 * Circles are only fetched while the palette is open (see
 * `useCommandCircles`) so the dashboard shell never pays for the request.
 */
export function useCommandCommands(isOpen: boolean) {
  const router = useRouter();
  const setTheme = useUIStore((s) => s.setTheme);
  const setDensity = useUIStore((s) => s.setDensity);
  const setFontSize = useUIStore((s) => s.setFontSize);
  const logout = useAuthStore((s) => s.logout);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const { data: circles, isLoading: isLoadingCircles } = useCommandCircles(isOpen);
  const { recentIds, recordUse } = useRecentCommands();

  const actionApi = useMemo<SettingsActionApi>(
    () => ({ setTheme, setDensity, setFontSize, logout }),
    [setTheme, setDensity, setFontSize, logout],
  );

  const commands = useMemo<ResolvedCommand[]>(() => {
    const pages: ResolvedCommand[] = NAVIGATION_COMMANDS.map(
      (command: NavigationCommand) => ({
        ...command,
        run: () => router.push(command.href),
      }),
    );

    const circleCommands: ResolvedCommand[] = (circles ?? []).map((circle) => ({
      id: `circle.${circle.id}`,
      label: circle.name,
      group: "page" as const,
      icon: CircleDot,
      hint: circle.status ?? "Circle",
      keywords: "circle savings pool",
      run: () => router.push(Routes.CIRCLE_DETAIL(circle.id)),
    }));

    const actions: ResolvedCommand[] = ACTION_COMMANDS.map(
      (command: ActionCommandSpec) => ({
        ...command,
        run: () => command.apply(actionApi),
      }),
    );

    return [...pages, ...circleCommands, ...actions];
  }, [router, actionApi, circles]);

  /** Invoke a command and close the palette. */
  const runCommand = useCallback(
    (command: ResolvedCommand) => {
      recordUse(command.id);
      setCommandPaletteOpen(false);
      command.run();
    },
    [recordUse, setCommandPaletteOpen],
  );

  /**
   * Most-recently-used commands that still exist in the registry, so a stale
   * stored id can never surface a dead row.
   */
  const recentCommands = useMemo<ResolvedCommand[]>(
    () =>
      recentIds
        .map((id) => commands.find((command) => command.id === id))
        .filter((command): command is ResolvedCommand => command !== undefined),
    [recentIds, commands],
  );

  return { commands, recentCommands, runCommand, isLoadingCircles };
}
