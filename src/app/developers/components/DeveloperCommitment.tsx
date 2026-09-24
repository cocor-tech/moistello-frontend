import { developerCommitments } from "../data/developer-content"

export function DeveloperCommitment() {
  return (
    <section className="border-t border-white/5" aria-labelledby="developer-commitment-title">
      <div className="container-premium py-10 md:py-14">
        <div className="max-w-2xl mx-auto text-center">
          <h2 id="developer-commitment-title" className="font-heading text-lg md:text-xl font-semibold text-foreground mb-3">
            Developer Commitment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 text-left">
            {developerCommitments.map((item) => (
              <div key={item.title} className="text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 mx-auto mb-2">
                  <item.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <p className="text-xs font-medium text-foreground mb-1">{item.title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
