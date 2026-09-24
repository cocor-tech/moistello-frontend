"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Filter,
  Award,
  ChevronLeft,
  ChevronRight,
  Send,
  Users,
  ArrowRight,
  RotateCcw,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export interface Person {
  id: string
  displayName: string
  username: string
  walletAddress: string
  moiScore: number
  tier: "Legend" | "Builder" | "Rising" | "Starter"
  activeCircles: number
  totalSavings: number
  country?: string
  bio: string
  joinedDate: string
}

export const MOCK_PEOPLE: Person[] = [
  {
    id: "usr_1",
    displayName: "Amara Okonkwo",
    username: "@amara_o",
    walletAddress: "GCX4B3YJ2W...7H9K",
    moiScore: 840,
    tier: "Legend",
    activeCircles: 4,
    totalSavings: 2450,
    country: "Nigeria",
    bio: "Community lead for Lagos Savings Circle. Passionate about DeFi & ROSCAs.",
    joinedDate: "2024-01-15",
  },
  {
    id: "usr_2",
    displayName: "Carlos Silva",
    username: "@carlos_s",
    walletAddress: "GBV7N2M4P1...3X8L",
    moiScore: 760,
    tier: "Builder",
    activeCircles: 3,
    totalSavings: 1800,
    country: "Brazil",
    bio: "Fintech enthusiast and Stellar network contributor.",
    joinedDate: "2024-02-10",
  },
  {
    id: "usr_3",
    displayName: "Aisha Patel",
    username: "@aisha_p",
    walletAddress: "GDK9Q5R8W2...9M4K",
    moiScore: 680,
    tier: "Rising",
    activeCircles: 2,
    totalSavings: 950,
    country: "India",
    bio: "Building micro-savings groups for women entrepreneurs.",
    joinedDate: "2024-03-01",
  },
  {
    id: "usr_4",
    displayName: "David Chen",
    username: "@david_c",
    walletAddress: "GAP3T1L6M9...2K5N",
    moiScore: 910,
    tier: "Legend",
    activeCircles: 5,
    totalSavings: 4200,
    country: "Singapore",
    bio: "DeFi liquidity provider and community validator.",
    joinedDate: "2023-11-20",
  },
  {
    id: "usr_5",
    displayName: "Fatima Al-Mansoor",
    username: "@fatima_m",
    walletAddress: "GBS8K4P2L7...6W1J",
    moiScore: 620,
    tier: "Rising",
    activeCircles: 2,
    totalSavings: 820,
    country: "UAE",
    bio: "Exploring ethical finance and Stellar smart contracts.",
    joinedDate: "2024-03-18",
  },
  {
    id: "usr_6",
    displayName: "Kwame Mensah",
    username: "@kwame_m",
    walletAddress: "GCH2X9M3P6...8Y4T",
    moiScore: 540,
    tier: "Starter",
    activeCircles: 1,
    totalSavings: 450,
    country: "Ghana",
    bio: "New member exploring community savings pools.",
    joinedDate: "2024-04-05",
  },
]

export default function PeopleDirectoryPage() {
  const [search, setSearch] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"score" | "circles" | "savings">("score")
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 4

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const filteredPeople = useMemo(() => {
    let result = [...MOCK_PEOPLE]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          p.walletAddress.toLowerCase().includes(q) ||
          p.bio.toLowerCase().includes(q),
      )
    }

    if (tierFilter !== "all") {
      result = result.filter((p) => p.tier.toLowerCase() === tierFilter.toLowerCase())
    }

    result.sort((a, b) => {
      if (sortBy === "score") return b.moiScore - a.moiScore
      if (sortBy === "circles") return b.activeCircles - a.activeCircles
      if (sortBy === "savings") return b.totalSavings - a.totalSavings
      return 0
    })

    return result
  }, [search, tierFilter, sortBy])

  const totalPages = Math.ceil(filteredPeople.length / pageSize) || 1
  const paginatedPeople = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPeople.slice(start, start + pageSize)
  }, [filteredPeople, currentPage, pageSize])

  const handleClearFilters = () => {
    setSearch("")
    setTierFilter("all")
    setSortBy("score")
    setCurrentPage(1)
  }

  const getTierColor = (tier: Person["tier"]) => {
    switch (tier) {
      case "Legend":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "Builder":
        return "bg-aurora-violet/10 text-aurora-violet border-aurora-violet/20"
      case "Rising":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    }
  }

  return (
    <div className="space-y-8" data-testid="people-directory">
      <PageHeader
        title="People Directory"
        description="Discover community members, view on-chain reputation scores, and connect."
      />

      {/* Controls / Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-white/10 rounded-xl p-4 bg-white/[0.02]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 bg-white/5 border-white/10"
            data-testid="people-search-input"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-aurora-violet" />
            <select
              aria-label="Filter people by reputation tier"
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="tier-filter-select"
            >
              <option value="all" className="bg-background">All Tiers</option>
              <option value="legend" className="bg-background">Legend (800+)</option>
              <option value="builder" className="bg-background">Builder (700-799)</option>
              <option value="rising" className="bg-background">Rising (600-699)</option>
              <option value="starter" className="bg-background">Starter (&lt;600)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <select
              aria-label="Sort people"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "score" | "circles" | "savings")}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="sort-by-select"
            >
              <option value="score" className="bg-background">Reputation Score</option>
              <option value="circles" className="bg-background">Active Circles</option>
              <option value="savings" className="bg-background">Total Savings</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="people-loading-skeleton">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-8 text-center space-y-3" role="alert">
          <p className="text-sm text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setError(null); setLoading(true) }}>
            Retry
          </Button>
        </div>
      ) : filteredPeople.length === 0 ? (
        <div className="border border-white/10 rounded-xl py-12 text-center space-y-4" data-testid="people-empty-state">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-muted-foreground">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">No members found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No community members matched your search criteria. Try adjusting your query or tier filter.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="people-cards-grid">
          {paginatedPeople.map((person) => (
            <div
              key={person.id}
              className="group relative border border-white/10 rounded-xl p-5 hover:border-aurora-violet/30 hover:bg-white/[0.02] transition-all space-y-4"
              data-testid={`person-card-${person.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={person.displayName} size="md" className="border border-white/10" />
                  <div>
                    <h3 className="font-heading text-base font-semibold text-foreground group-hover:text-aurora-violet transition-colors">
                      {person.displayName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{person.username}</span>
                      <span>•</span>
                      <code className="font-mono text-[11px]">{person.walletAddress}</code>
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getTierColor(
                    person.tier,
                  )}`}
                >
                  <Award className="h-3 w-3" />
                  {person.tier}
                </span>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{person.bio}</p>

              {/* Stats pill bar */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-lg p-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">MoiScore</p>
                  <p className="text-sm font-bold text-aurora-violet font-heading">{person.moiScore}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Circles</p>
                  <p className="text-sm font-bold text-foreground font-heading">{person.activeCircles}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings</p>
                  <p className="text-sm font-bold text-emerald-400 font-heading">${person.totalSavings}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <ButtonLink
                  href={`/wallet/transfer?recipient=${encodeURIComponent(person.walletAddress)}`}
                  variant="outline"
                  size="sm"
                  leftIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Transfer
                </ButtonLink>

                <ButtonLink href={`/people/${person.id}`} variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                  View Profile
                </ButtonLink>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredPeople.length > 0 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4" data-testid="people-pagination">
          <p className="text-xs text-muted-foreground">
            Showing <span className="text-foreground font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="text-foreground font-medium">
              {Math.min(currentPage * pageSize, filteredPeople.length)}
            </span>{" "}
            of <span className="text-foreground font-medium">{filteredPeople.length}</span> members
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Previous people page"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              data-testid="prev-page-button"
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
              aria-label="Next people page"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              data-testid="next-page-button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
