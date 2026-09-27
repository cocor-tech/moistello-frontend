import { GitBranch, Globe, Mail, Users } from "lucide-react"

const contributorLinks = [
  { href: "https://nekwasar.com", label: "nekwasar.com", Icon: Globe },
  { href: "https://github.com/nekwasar", label: "github.com/nekwasar", Icon: GitBranch },
  { href: "https://linkedin.com/in/nekwasar", label: "linkedin.com/in/nekwasar", Icon: null },
  { href: "https://x.com/nekwasar", label: "@nekwasar", Icon: null },
  { href: "mailto:hello@nekwasar.com", label: "hello@nekwasar.com", Icon: Mail },
]

export function DeveloperContributors() {
  return (
    <section className="border-t border-white/5" aria-labelledby="contributors-title">
      <div className="container-premium py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-cyan-700 dark:text-cyan-300">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="contributors-title" className="font-heading text-xl md:text-2xl font-semibold text-foreground">
              Contributors
            </h2>
          </div>
          <div className="rounded-xl bg-card/60 border border-white/10 p-6 md:p-8">
            <p className="text-sm text-muted-foreground mb-4">
              <span className="text-cyan-700 dark:text-cyan-300 font-medium">@nekwasar</span> · v1 Sole Author & Architect
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-xs">
              <div className="space-y-2">
                <p><span className="text-foreground font-medium">Full Name:</span> Nekwasachukwu Ucheokoye</p>
                <p><span className="text-foreground font-medium">Role:</span> Founder, Agentic & Systems Engineer</p>
                <p><span className="text-foreground font-medium">Organization:</span> O4A Innovations</p>
                <p><span className="text-foreground font-medium">Location:</span> Awka, Nigeria (UTC +01:00)</p>
              </div>
              <nav className="space-y-2" aria-label="Contributor links">
                {contributorLinks.map(({ href, label, Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1 text-cyan-700 dark:text-cyan-300 hover:underline"
                    aria-label={`Visit ${label}${href.startsWith("http") ? " (opens in a new tab)" : ""}`}
                  >
                    {href.includes("linkedin") ? (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5V5c0-2.761-2.238-5-5-5zm-11 19h-3v-9h3v9zm-1.5-10.268c-.966 0-1.718-.759-1.718-1.725s.752-1.725 1.718-1.725c.967 0 1.72.759 1.72 1.725s-.753 1.725-1.72 1.725zm13.5 10.268h-3v-4.5c0-1.083-.024-2.484-1.512-2.484-.773 0-1.283.446-1.283 1.02v4.632h-3v-9h2.881v1.233h.041c.2-.386.767-.75 1.512-.75 1.512 0 2.095.995 2.095 2.484v5.516z" />
                      </svg>
                    ) : href.includes("x.com") ? (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.22-6.819L4.99 22.5H1.68l7.73-8.845L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 5.134H5.117z" />
                      </svg>
                    ) : Icon ? (
                      <Icon className="h-3 w-3" aria-hidden="true" />
                    ) : null}
                    {label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-xs text-muted-foreground mb-3">
                <span className="text-foreground font-medium">Contributions:</span> Architected full Moistello (frontend, backend, 5 Soroban contracts on Mainnet)
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">Stack:</span> TypeScript · Node.js · Next.js · React · Soroban · PostgreSQL · Docker
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
