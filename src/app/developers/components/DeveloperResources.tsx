import Link from "next/link"
import { ExternalLink, Package } from "lucide-react"
import { developerResources } from "../data/developer-content"

interface DeveloperResourcesProps {
  mobile?: boolean
  headingId?: string
}

export function DeveloperResources({ mobile = false, headingId = "resources-title" }: DeveloperResourcesProps) {
  return (
    <section className={`rounded-xl bg-card/60 border border-white/10 ${mobile ? "p-5" : "p-8"}`} aria-labelledby={headingId}>
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-indigo/15 text-aurora-indigo">
          <Package className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id={headingId} className="font-heading text-base md:text-xl font-semibold text-foreground">Resources</h2>
      </div>
      <div className={mobile ? "space-y-2" : "space-y-3"}>
        {developerResources.map((resource) => {
          const isExternal = resource.href.startsWith("http")
          const content = (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded bg-aurora-violet/10">
                <resource.icon className={`h-4 w-4 ${resource.iconClass}`} aria-hidden="true" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-medium text-foreground">{resource.title}</span>
                <span className="block text-xs text-muted-foreground">{resource.description}</span>
              </span>
              {(!mobile || isExternal) && <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            </>
          )
          const className = mobile
            ? "flex items-center gap-2 text-sm text-foreground"
            : "flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
          const label = `${resource.title}: ${resource.description}`

          return isExternal ? (
            <a key={resource.href} href={resource.href} target="_blank" rel="noopener noreferrer" className={className} aria-label={`${label} (opens in a new tab)`}>
              {content}
            </a>
          ) : (
            <Link key={resource.href} href={resource.href} className={className} aria-label={label}>
              {content}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
