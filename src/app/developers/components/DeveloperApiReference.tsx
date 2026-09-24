import { Terminal } from "lucide-react"
import { apiEndpointGroups } from "../data/developer-content"

export function DeveloperApiReference() {
  return (
    <section className="rounded-xl bg-card/60 border border-white/10 p-8" aria-labelledby="api-reference-title">
      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora-cyan/15 text-cyan-700 dark:text-cyan-300">
          <Terminal className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="api-reference-title" className="font-heading text-xl font-semibold text-foreground">API Reference</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {apiEndpointGroups.map((group) => (
          <div key={group.category} className="bg-white/5 border border-white/10 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <group.icon className={`h-4 w-4 ${group.color}`} aria-hidden="true" />
              <h3 className="font-heading text-sm font-semibold text-foreground">{group.category}</h3>
            </div>
            <ul className="space-y-2">
              {group.endpoints.map((endpoint) => (
                <li key={`${endpoint.method}-${endpoint.path}`} className="flex items-center gap-2 text-xs">
                  <span className={`font-mono ${endpoint.method === "GET" ? "text-emerald-700 dark:text-emerald-300" : endpoint.method === "POST" ? "text-violet-700 dark:text-violet-300" : "text-amber-700 dark:text-amber-300"}`}>
                    {endpoint.method}
                  </span>
                  <code className="text-cyan-700 dark:text-cyan-300 font-mono flex-1 truncate">{endpoint.path}</code>
                  <span className="text-muted-foreground">{endpoint.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
