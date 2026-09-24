"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
import {
  ArrowRight,
  Landmark,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useGovernanceProposals } from "@/hooks/use-governance"
import type { ProposalStatus } from "@/lib/governance-api"

const statusTabs: { label: string; value: ProposalStatus }[] = [
  { label: "All Proposals", value: "all" },
  { label: "Active", value: "active" },
  { label: "Passed", value: "passed" },
  { label: "Defeated", value: "defeated" },
]

export default function GovernancePage() {
  const [selectedStatus, setSelectedStatus] = useState<ProposalStatus>("all")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"newest" | "votes" | "oldest">("newest")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 3

  const { data: proposals = [], isLoading, isError, refetch } = useGovernanceProposals(selectedStatus)

  const filteredProposals = useMemo(() => {
    let result = [...proposals]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)),
      )
    }

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category?.toLowerCase() === categoryFilter.toLowerCase())
    }

    result.sort((a, b) => {
      if (sortBy === "votes") {
        const totalA = a.votesFor + a.votesAgainst
        const totalB = b.votesFor + b.votesAgainst
        return totalB - totalA
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    return result
  }, [proposals, search, categoryFilter, sortBy])

  const totalPages = Math.ceil(filteredProposals.length / pageSize) || 1
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProposals.slice(start, start + pageSize)
  }, [filteredProposals, currentPage, pageSize])

  const handleClearFilters = () => {
    setSearch("")
    setCategoryFilter("all")
    setSortBy("newest")
    setSelectedStatus("all")
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-aurora-violet/30 bg-aurora-violet/10 px-2.5 py-0.5 text-xs text-aurora-violet font-semibold">
            <Clock className="h-3 w-3" /> Active
          </span>
        )
      case "passed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Passed
          </span>
        )
      case "defeated":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400 font-semibold">
            <XCircle className="h-3 w-3" /> Defeated
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-xs text-muted-foreground font-semibold">
            <FileText className="h-3 w-3" /> {status}
          </span>
        )
    }
  }

  return (
    <div className="relative overflow-hidden space-y-8" data-testid="governance-page">
      <div className="pointer-events-none absolute right-8 top-4 text-[11rem] font-heading font-black leading-none text-aurora-violet/5 select-none">
        GOV
      </div>

      <header className="relative border-l-4 border-l-aurora-violet py-3 pl-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-aurora-violet">
          On-Chain Governance
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground">Governance</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Propose and vote on parameter changes, treasury disbursements, and community rules.
            </p>
          </div>
          <ButtonLink href="/governance/create"  leftIcon={<Plus className="h-4 w-4" />} variant="primary">
              Create proposal
            </ButtonLink>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-6 border-b border-white/10 overflow-x-auto" aria-label="Proposal status">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={selectedStatus === tab.value}
            onClick={() => {
              setSelectedStatus(tab.value)
              setCurrentPage(1)
            }}
            className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              selectedStatus === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`status-tab-${tab.value}`}
          >
            {tab.label}
            {selectedStatus === tab.value && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-aurora-violet" />
            )}
          </button>
        ))}
      </nav>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-white/10 rounded-xl p-4 bg-white/[0.02]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals by title or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 bg-white/5 border-white/10"
            data-testid="governance-search-input"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-aurora-violet" />
            <select
              aria-label="Proposal category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="category-filter-select"
            >
              <option value="all" className="bg-background">All Categories</option>
              <option value="circle parameter" className="bg-background">Circle Parameter</option>
              <option value="treasury release" className="bg-background">Treasury Release</option>
              <option value="rule amendment" className="bg-background">Rule Amendment</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select
              aria-label="Sort proposals"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "votes" | "oldest")}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="governance-sort-select"
            >
              <option value="newest" className="bg-background">Newest</option>
              <option value="votes" className="bg-background">Most Votes</option>
              <option value="oldest" className="bg-background">Oldest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content / List */}
      {isLoading ? (
        <div className="space-y-4" data-testid="governance-loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border border-white/10 rounded-xl p-6 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-8 text-center space-y-3" role="alert">
          <p className="text-sm text-red-400">Governance proposals could not be loaded. Try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="border border-white/10 rounded-xl py-12 text-center space-y-4" data-testid="governance-empty-state">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-aurora-violet">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No proposals found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              There are no {selectedStatus !== "all" ? selectedStatus : ""} proposals matching your filter parameters.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-4" data-testid="proposals-list">
          {paginatedProposals.map((proposal) => {
            const totalVotes = proposal.votesFor + proposal.votesAgainst
            const forPercent = totalVotes > 0 ? Math.round((proposal.votesFor / totalVotes) * 100) : 0

            return (
              <div
                key={proposal.id}
                className="group border border-white/10 rounded-xl p-6 hover:border-aurora-violet/30 hover:bg-white/[0.02] transition-all space-y-4"
                data-testid={`proposal-card-${proposal.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(proposal.status)}
                    {proposal.category && (
                      <span className="text-xs font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                        {proposal.category}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">ID: #{proposal.id}</span>
                </div>

                <Link href={`/governance/${proposal.id}`} className="block">
                  <h2 className="font-heading text-xl font-bold text-foreground group-hover:text-aurora-violet transition-colors">
                    {proposal.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{proposal.description}</p>
                </Link>

                {/* Vote breakdown bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-emerald-400 font-medium">For: {proposal.votesFor} ({forPercent}%)</span>
                    <span className="text-red-400 font-medium">Against: {proposal.votesAgainst} ({100 - forPercent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-red-500/20 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${forPercent}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-xs text-muted-foreground">
                    Total Votes: <strong className="text-foreground">{totalVotes}</strong>
                  </span>

                  <ButtonLink href={`/governance/${proposal.id}`}  variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                      View & Vote
                    </ButtonLink>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && filteredProposals.length > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4" data-testid="governance-pagination">
          <p className="text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="text-foreground font-medium">
              {Math.min(currentPage * pageSize, filteredProposals.length)}
            </span>{" "}
            of <span className="text-foreground font-medium">{filteredProposals.length}</span> proposals
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Previous proposals page"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              data-testid="gov-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Next proposals page"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              data-testid="gov-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
