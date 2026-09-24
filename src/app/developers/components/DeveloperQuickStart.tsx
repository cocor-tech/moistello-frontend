import Link from "next/link"
import { Zap } from "lucide-react"
import { quickStartSteps } from "../data/developer-content"

interface DeveloperQuickStartProps {
  mobile?: boolean
}

export function DeveloperQuickStart({ mobile = false }: DeveloperQuickStartProps) {
  if (mobile) {
    return (
      <div className="rounded-xl bg-card/60 border border-white/10 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="font-heading text-base font-semibold text-foreground">Quick Start</h2>
        </div>
        <ol className="space-y-2 text-sm" aria-label="Quick start steps">
          {quickStartSteps.map((step, index) => (
            <li key={step.title}>
              <span className="text-foreground font-medium">{index + 1}.</span>{" "}
              <span className="text-muted-foreground">{step.mobileDescription}</span>
            </li>
          ))}
        </ol>
        <Link href="/docs/api" className="block text-xs text-cyan-700 dark:text-cyan-300 mt-3" aria-label="View the full API documentation">
          Full docs →
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-card/60 border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-violet/15 text-aurora-violet">
          <Zap className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="font-heading text-xl font-semibold text-foreground">Quick Start</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {quickStartSteps.map((step, index) => (
          <div key={step.title} className="bg-white/5 border border-white/10 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">{index + 1}. {step.title}</h3>
            <code className="text-xs text-cyan-700 dark:text-cyan-300 font-mono">{step.endpoint}</code>
            <p className="text-xs text-muted-foreground mt-2">{step.description}</p>
          </div>
        ))}
      </div>
      <Link href="/docs/api" className="inline-block text-xs text-cyan-700 dark:text-cyan-300 hover:underline mt-6" aria-label="View the full API documentation">
        View full API docs →
      </Link>
    </div>
  )
}
