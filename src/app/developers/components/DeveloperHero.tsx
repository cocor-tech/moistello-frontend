import { Code } from "lucide-react"

export function DeveloperHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5" aria-labelledby="developer-platform-title">
      <div className="absolute inset-0 bg-gradient-to-br from-aurora-indigo/8 via-transparent to-aurora-violet/5 pointer-events-none" />
      <div className="container-premium pt-24 pb-16 md:pt-32 md:pb-24 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aurora-violet/10 border border-aurora-violet/20 text-xs text-violet-700 dark:text-violet-300 font-medium mb-6">
            <Code className="h-3.5 w-3.5" aria-hidden="true" />
            Developer Platform
          </div>
          <h1 id="developer-platform-title" className="font-heading text-4xl md:text-6xl font-black mb-4">
            Build on <span className="gradient-text-extended">Moistello</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-lg mx-auto">
            Complete API documentation, smart contracts, and resources for building decentralized savings on Stellar.
          </p>
        </div>
      </div>
    </section>
  )
}
