import { developerStats } from "../data/developer-content"

export function DeveloperStats() {
  return (
    <section className="container-premium py-12 md:py-20" aria-label="Developer platform statistics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {developerStats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card/60 border border-white/10 p-6 md:p-8 text-center">
            <stat.icon className={`h-6 w-6 md:h-8 md:w-8 ${stat.color} mx-auto mb-3`} aria-hidden="true" />
            <div className={`font-heading text-2xl md:text-3xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
