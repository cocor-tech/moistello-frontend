"use client"

import React from "react"
import { Users, Shield, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/cn"
import type { CircleFormData } from "@/types"

interface CommunityStepDetailsProps {
  formData: CircleFormData
  setFormData: React.Dispatch<React.SetStateAction<CircleFormData>>
  errors: Record<string, string>
}

const ACCESS_TYPES = [
  {
    value: "open" as const,
    label: "Community Open",
    description: "Anyone in the community can discover and join",
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "invite" as const,
    label: "Community Private",
    description: "Requires an invite code to join",
    icon: <Shield className="h-5 w-5" />,
  },
]

export function CommunityStepDetails({ formData, setFormData, errors }: CommunityStepDetailsProps) {
  const isInvite = formData.requiresInvite === true

  return (
    <div className="space-y-6">
      <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
        Circle Details
      </h3>
      <div className="space-y-4">
        <Input
          label="Circle Name"
          placeholder="e.g., Community Savings Pool"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
        />
        <Input
          label="Description (optional)"
          placeholder="Briefly describe the purpose of this circle"
          value={formData.description ?? ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div>
        <p id="access-type-label" className="mb-3 block font-heading text-sm text-muted-foreground">
          Access Type
        </p>
        <div role="group" aria-labelledby="access-type-label" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCESS_TYPES.map((at) => {
            const selected = at.value === "open" ? !isInvite : isInvite
            return (
              <button
                key={at.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFormData((prev) => ({ ...prev, requiresInvite: at.value === "invite" }))}
                className={cn(
                  "glass rounded-xl p-4 text-left transition-all duration-300",
                  selected
                    ? "glass-strong holo-border"
                    : "hover:glass-strong",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={selected ? "gradient-text" : "text-muted-foreground"}>
                    {at.icon}
                  </span>
                  <span className="font-heading font-semibold text-foreground dark:text-white text-sm">
                    {at.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{at.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Max Members"
          type="number"
          min={2}
          max={100}
          value={String(formData.maxMembers)}
          onChange={(e) => setFormData((prev) => ({ ...prev, maxMembers: Number(e.target.value) }))}
          error={errors.maxMembers}
        />
        <Input
          label="Start Date"
          type="datetime-local"
          value={formData.startDate}
          onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
          leftIcon={<Calendar className="h-4 w-4" />}
        />
      </div>
    </div>
  )
}
