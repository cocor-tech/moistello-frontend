import { ChevronDown, Download, FileText } from "lucide-react"

interface SampleTemplatesProps {
  showSamples: boolean
  onToggle: () => void
}

export function SampleTemplates({ showSamples, onToggle }: SampleTemplatesProps) {
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={onToggle}
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
        aria-expanded={showSamples}
        aria-controls="sample-template-options"
        aria-label={showSamples ? "Hide sample templates" : "Show sample templates"}
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Sample Template
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showSamples ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {showSamples && (
        <div id="sample-template-options" className="mt-2 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            Download a sample file to see the expected format. Give it to your agent to prepare content.
          </p>
          <div className="flex gap-2">
            <a
              href="/samples/template.md"
              download="template.md"
              className="flex-1 bg-card/90 border border-white/10 rounded-lg px-3 py-2 text-sm font-medium text-center hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              aria-label="Download Markdown sample template"
            >
              <FileText className="h-4 w-4 text-aurora-cyan" aria-hidden="true" />
              .md Sample
            </a>
            <a
              href="/samples/template.html"
              download="template.html"
              className="flex-1 bg-card/90 border border-white/10 rounded-lg px-3 py-2 text-sm font-medium text-center hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              aria-label="Download HTML sample template"
            >
              <FileText className="h-4 w-4 text-aurora-amber" aria-hidden="true" />
              .html Sample
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
