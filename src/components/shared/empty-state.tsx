"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PlusCircle, Bookmark, Users, Compass } from "lucide-react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-premium rounded-3xl p-8 md:p-12 max-w-md mx-auto flex flex-col items-center text-center",
        className,
      )}
    >
      <div
        className="flex h-14 w-14 items-center justify-center gradient-bg rounded-2xl p-3 text-white"
        aria-hidden="true"
      >
        <span className="w-8 h-8 [&>*]:w-full [&>*]:h-full">{icon}</span>
      </div>
      <h3 className="font-heading text-xl md:text-2xl text-foreground mt-6">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="outline"
          size="md"
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

export interface PresetEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

export function CircleListEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Compass className="h-6 w-6" />}
      title="No circles found"
      description="Start your financial ROSCA journey by exploring public circles or creating your own."
      action={
        onAction
          ? { label: "Create a Circle", onClick: onAction }
          : undefined
      }
      className={className}
    />
  );
}

export function SavedCirclesEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Bookmark className="h-6 w-6" />}
      title="No saved circles"
      description="Bookmark public circles you are interested in joining to easily find them later."
      action={
        onAction
          ? { label: "Browse Circles", onClick: onAction }
          : undefined
      }
      className={className}
    />
  );
}

export function MemberTabsEmptyState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={<Users className="h-6 w-6" />}
      title="No members in this tab"
      description="Invite friends and colleagues to join this circle and build your savings pool together."
      action={
        onAction
          ? { label: "Invite Members", onClick: onAction }
          : undefined
      }
      className={className}
    />
  );
}

