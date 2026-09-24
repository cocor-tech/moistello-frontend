import { AlertTriangle } from "lucide-react"
import { errorCodes } from "../data/developer-content"

export function DeveloperErrorCodes() {
  return (
    <section className="rounded-xl bg-card/60 border border-white/10 p-8" aria-labelledby="error-codes-title">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-700 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="error-codes-title" className="font-heading text-xl font-semibold text-foreground">Error Codes</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {errorCodes.map((error) => (
          <div key={error.code} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{error.code}</p>
            <p className="text-xs font-medium text-foreground">{error.desc}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{error.detail}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
