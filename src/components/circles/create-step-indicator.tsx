"use client"

import React from "react"

import { Check, CircleCheck } from "lucide-react"
import { cn } from "@/lib/cn"

type Variant = "default" | "auth" | "compact"

interface Step {
  key?: string
  label: string
  number?: number
  optional?: boolean
}

interface StepIndicatorProps {
  currentStep: number
  steps: Step[]
  variant?: Variant
  className?: string
}

const variantClassNames: Record<Variant, { circle: string; label: string; connector: string }> = {
  default: {
    circle: "flex h-10 w-10 items-center justify-center rounded-full text-sm font-heading font-semibold",
    label: "mt-2 text-xs font-body font-medium",
    connector: "h-[2px] flex-1 mx-3",
  },
  auth: {
    circle: "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all",
    label: "text-2xs text-muted-foreground font-heading",
    connector: "w-8 h-px bg-gradient-to-r from-aurora-violet/50 to-aurora-cyan/30 mx-1",
  },
  compact: {
    circle: "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
    label: "mt-1.5 text-xs font-medium",
    connector: "h-0.5 flex-1 mx-2",
  },
}

function buildCircleClasses(variant: Variant, isCompleted: boolean, isCurrent: boolean) {
  const base = variantClassNames[variant].circle
  if (variant === "auth") {
    return cn(base, [
      isCompleted && "bg-emerald-500 text-white",
      isCurrent && ["gradient-bg text-white", "shadow-[0_0_16px_rgb(var(--aurora-violet)/0.4)]"],
      !isCompleted && !isCurrent && "bg-white/10 text-muted-foreground",
    ])
  }
  if (variant === "compact") {
    return cn(base, [
      isCompleted && "bg-primary text-primary-foreground",
      isCurrent && ["bg-primary text-primary-foreground", "ring-4 ring-primary/20"],
      !isCompleted && !isCurrent && "bg-gray-200 text-gray-500",
    ])
  }
  return cn(base, [
    isCompleted && "gradient-bg-extended text-white shadow-lg",
    isCurrent && "gradient-bg text-white shadow-xl",
    !isCompleted && !isCurrent && "glass text-muted-foreground",
  ])
}

function buildLabelClasses(variant: Variant, isCurrent: boolean) {
  const base = variantClassNames[variant].label
  if (variant === "auth") return base
  if (variant === "compact") return cn(base, isCurrent ? "text-primary" : "text-gray-500")
  return cn(base, isCurrent ? "gradient-text font-semibold" : "text-muted-foreground")
}

function buildConnectorClasses(variant: Variant, isCompleted: boolean) {
  const base = variantClassNames[variant].connector
  if (variant === "auth") return base
  if (variant === "compact") return cn(base, isCompleted ? "bg-primary" : "bg-gray-200")
  return cn(base, isCompleted ? "bg-gradient-to-r from-aurora-violet to-aurora-cyan" : "bg-white/5 dark:bg-white/[0.06]")
}

export function CreateStepIndicator({ currentStep, steps, variant = "default", className }: StepIndicatorProps) {
  return (
    <div className={cn("mb-10 px-4", className)}>
      <div className="flex items-center justify-between max-w-md mx-auto">
        {steps.map((step, index) => {
          const stepNumber = step.number ?? index + 1
          const isCompleted = stepNumber < currentStep
          const isCurrent = stepNumber === currentStep
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step.key ?? stepNumber}>
              <div className="flex flex-col items-center">
                <div className={buildCircleClasses(variant, isCompleted, isCurrent)}>
                  {isCompleted ? (
                    variant === "auth" ? <CircleCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />
                  ) : (
                    step.number ?? stepNumber
                  )}
                </div>
                <span className={buildLabelClasses(variant, isCurrent)}>
                  {step.label}
                  {step.optional && variant === "auth" && (
                    <span className="block text-[10px] italic opacity-60">(optional)</span>
                  )}
                </span>
              </div>
              {!isLast && <div className={buildConnectorClasses(variant, isCompleted)} />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export type { StepIndicatorProps, Step, Variant }
