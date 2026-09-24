"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { Search, Users, Plus, Sparkles, TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Input } from "@/components/ui/input"
import { Button, ButtonLink } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { get } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { Routes } from "@/lib/constants"
import { useTranslate } from "@/lib/locale/context"

interface CommunitySummary {
  id: string
  name: string
  slug: string
  description: string
  category: string
  tags: string[]
  memberCount: number
  totalSaved: number
  isFeatured: boolean
  createdAt: string
}

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "finance", label: "Finance" },
  { value: "tech", label: "Tech" },
  { value: "community", label: "Community" },
  { value: "social_impact", label: "Social Impact" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
]

export default function CommunitiesPage() {
  const { t } = useTranslate()
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)

  const load = useCallback(async (pageNum = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (category) params.set("category", category)
      params.set("page", String(pageNum))
      params.set("limit", "20")
      const res = await get<unknown>(`/communities?${params.toString()}`)
      const raw = res as Record<string, unknown>
      const data = (raw.data ?? raw) as Record<string, unknown>
      const list = (data.communities ?? []) as CommunitySummary[]
      const meta = data.meta as Record<string, unknown> | undefined
      if (pageNum === 1) {
        setCommunities(list)
      } else {
        setCommunities((prev) => [...prev, ...list])
      }
      setHasNext(meta ? Number(meta.page) < Number(meta.totalPages) : false)
    } catch (e) {
      logger.error("[communities] Failed to load communities:", e)
      if (pageNum === 1) setCommunities([])
    } finally {
      setLoading(false)
    }
  }, [search, category])

  useEffect(() => {
    setPage(1)
    load(1)
  }, [load])

  const handleSearch = () => {
    setPage(1)
    load(1)
  }

  const featured = communities.filter((c) => c.isFeatured)
  const regular = communities.filter((c) => !c.isFeatured)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("comm.title")}
        description="Discover communities and find your people."
        action={
          <ButtonLink href={`${Routes.COMMUNITIES}/create`} variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            {t("comm.create")}
          </ButtonLink>
        }
      />

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="Search communities..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => { setSearch(e.target.value) }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
          />
          <Button variant="primary" size="md" onClick={handleSearch} isLoading={loading}>
            Search
          </Button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            aria-pressed={category === cat.value}
            onClick={() => { setCategory(cat.value); setPage(1) }}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all",
              category === cat.value
                ? "bg-aurora-violet/15 text-aurora-violet border border-aurora-violet/30"
                : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && communities.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-48 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && communities.length === 0 && (
        <div className="text-center py-12">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No communities found"
            description={search || category ? "Try a different search or filter." : "Be the first to create a community."}
          />
          <ButtonLink href={`${Routes.COMMUNITIES}/create`}  variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />} className="mt-4">
              Create Community
            </ButtonLink>
        </div>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-amber-400" />
            Featured Communities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </div>
      )}

      {/* All Communities */}
      {regular.length > 0 && (
        <div>
          {featured.length > 0 && (
            <h3 className="font-heading text-sm font-semibold text-foreground mb-4">All Communities</h3>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regular.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        </div>
      )}

      {hasNext && (
        <div className="flex justify-center">
          <Button variant="outline" size="md" onClick={() => { const p = page + 1; setPage(p); load(p) }} isLoading={loading}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

function CommunityCard({ community }: { community: CommunitySummary }) {
  const initial = community.name.charAt(0).toUpperCase()

  return (
    <Link href={`${Routes.COMMUNITIES}/${community.id}`}>
      <div className="glass-premium rounded-2xl p-5 hover:glass-strong transition-all cursor-pointer h-full flex flex-col group">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg text-white font-mono text-sm font-bold shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-sm font-semibold text-foreground truncate group-hover:gradient-text transition-all">
              {community.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" size="sm" className="text-[10px]">
                {community.category}
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {community.description || "No description"}
        </p>

        {community.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {community.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground/60">#{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06] text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {community.memberCount}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            ${community.totalSaved.toFixed(2)} saved
          </span>
        </div>
      </div>
    </Link>
  )
}
