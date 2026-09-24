"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { escapeRegExp } from "@/lib/docs/search-utils"
import { searchSchema, zodResolver, type SearchInput } from "@/lib/validation"

interface SearchResult {
  title: string
  href: string
  snippet?: string
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; results: SearchResult[]; query: string }

export function SearchForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SearchInput>({
    resolver: zodResolver(searchSchema),
    mode: "onTouched",
    defaultValues: { query: "" },
  })
  const [state, setState] = useState<SearchState>({ status: "idle" })

  const searchQuery = watch("query", "")
  const terms = useMemo(
    () => searchQuery.trim().split(/\s+/).filter(Boolean),
    [searchQuery]
  )

  const handleSearch = async ({ query }: SearchInput) => {
    const q = query.trim()
    if (!q) {
      setState({ status: "idle" })
      return
    }

    setState({ status: "loading" })
    try {
      const res = await fetch(`/api/docs/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const results: SearchResult[] = data.results ?? []
      setState({ status: "done", results, query: q })
    } catch (err) {
      console.warn("[search] Failed to search docs:", err)
      setState({ status: "error" })
    }
  }

  const clearResults = () => {
    setValue("query", "")
    setState({ status: "idle" })
  }

  return (
    <div className="relative max-w-lg mx-auto">
      <form onSubmit={handleSubmit(handleSearch)} noValidate>
        <div className="relative">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search docs, FAQ, how-to guides..."
            aria-label="Search the documentation"
            aria-invalid={errors.query ? true : undefined}
            {...register("query", {
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                if (!event.target.value) setState({ status: "idle" })
              },
            })}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 focus:border-aurora-violet/40 text-base transition-all"
          />
        </div>
        {errors.query && (
          <p role="alert" className="mt-2 text-xs text-red-400">
            {errors.query.message}
          </p>
        )}
        {state.status !== "idle" && (
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
          >
            {state.status === "loading"
              ? "Searching documentation"
              : state.status === "done"
              ? `${state.results.length} result${state.results.length === 1 ? "" : "s"} for ${state.query}`
              : "Search failed"}
          </span>
        )}
      </form>

      {state.status === "loading" && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-4 max-w-lg mx-auto text-left" role="alert">
          <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            Searching is temporarily unavailable. Please try again in a moment
            or submit a ticket.
          </p>
        </div>
      )}

      {state.status === "done" && (
        <div className="mt-4 max-w-lg mx-auto text-left">
          {state.results.length === 0 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground bg-white/5 rounded-xl px-4 py-3">
                No results found for “{state.query}”. Try a different term or
                submit a ticket.
              </p>
              <button
                type="button"
                onClick={clearResults}
                className="text-xs text-aurora-violet hover:underline shrink-0"
              >
                Clear
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground/70">
                {state.results.length} result{state.results.length === 1 ? "" : "s"}
              </p>
              {state.results.map((result, i) => (
                <Link
                  key={`${result.href}-${i}`}
                  href={result.href}
                  className="flex items-start gap-3 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition-colors group"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-aurora-violet/10 text-aurora-violet shrink-0">
                    <LinkIcon />
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-foreground">
                      <Highlight text={result.title} terms={terms} />
                    </p>
                    {result.snippet && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        <Highlight text={result.snippet} terms={terms} />
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                      {result.href}
                    </p>
                  </div>
                  <ChevronRightIcon />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Wrap every query-term occurrence in a <mark>, case-insensitively. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const active = terms.filter((t) => t.length > 0)
  if (active.length === 0) return <>{text}</>

  const pattern = active.map((t) => escapeRegExp(t)).join("|")
  const parts = text.split(new RegExp(`(${pattern})`, "ig"))

  return (
    <>
      {parts.map((part, i) =>
        active.some(
          (t) => part.toLowerCase() === t.toLowerCase()
        ) ? (
          <mark
            key={i}
            className="bg-aurora-violet/30 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function SearchIcon() {
  return <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
}

function ChevronRightIcon() {
  return <svg className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
}

function LinkIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 7H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><path d="M17 2h5v5"/><path d="M21 2l-8 8-4-4-6 6 4 4 8-8 8 8"/></svg>
}