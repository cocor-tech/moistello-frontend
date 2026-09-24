import Link from "next/link"
import { Shield } from "lucide-react"

interface DeveloperContractsProps {
  mobile?: boolean
  headingId?: string
}

export function DeveloperContracts({ mobile = false, headingId = "contracts-title" }: DeveloperContractsProps) {
  return (
    <section className={`rounded-xl bg-card/60 border border-white/10 ${mobile ? "p-5" : "p-8"}`} aria-labelledby={headingId}>
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-cyan-700 dark:text-cyan-300">
          <Shield className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id={headingId} className="font-heading text-base md:text-xl font-semibold text-foreground">
          {mobile ? "Contracts" : "Smart Contracts"}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {mobile ? "Smart contracts on Stellar. See" : "Smart contracts deployed on Stellar Mainnet. See"}{" "}
        <Link href="/docs/contracts" className="text-cyan-700 underline decoration-cyan-700/50 underline-offset-2 hover:decoration-cyan-700 dark:text-cyan-300 dark:decoration-aurora-cyan/50" aria-label="Read smart contract documentation">
          {mobile ? "docs" : "documentation"}
        </Link>
        {!mobile && " for architecture overview."}
        {mobile && "."}
      </p>
    </section>
  )
}
