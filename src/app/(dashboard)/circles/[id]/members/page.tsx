"use client"

import React, { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Users, Inbox, Hash, Search, SlidersHorizontal, X } from "lucide-react"
import { useCircleMembers } from "@/hooks/use-circles"
import { useAuth } from "@/hooks/use-auth"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button, ButtonLink } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { CopyButton } from "@/components/shared/copy-button"
import { formatAddress } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import type { MemberStatus } from "@/types"
import { filterCircleMembers, type JoinedFilter } from "./member-filters"

const statusVariantMap: Record<
  MemberStatus,
  { variant: "success" | "warning" | "info" | "destructive" | "default" | "outline"; label: string }
> = {
  active: { variant: "success", label: "Active" },
  pending: { variant: "warning", label: "Pending" },
  invited: { variant: "info", label: "Invited" },
  defaulter: { variant: "destructive", label: "Defaulter" },
  left: { variant: "default", label: "Left" },
  removed: { variant: "destructive", label: "Removed" },
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const memberItem = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
}

export default function CircleMembersPage() {
  const params = useParams()
  const circleId = params.id as string

  const { user } = useAuth()
  const { data: members = [], isLoading, isError } = useCircleMembers(circleId)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [position, setPosition] = useState("")
  const [joined, setJoined] = useState<JoinedFilter>("")

  const statusOptions = useMemo(
    () => [
      { label: "All statuses", value: "" },
      ...Array.from(new Set(members.map((member) => member.status))).map((value) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
      })),
    ],
    [members],
  )
  const positionOptions = useMemo(
    () => [
      { label: "All positions", value: "" },
      ...Array.from(new Set(members.map((member) => member.position)))
        .sort((a, b) => a - b)
        .map((value) => ({ label: `Position #${value}`, value: String(value) })),
    ],
    [members],
  )
  const filteredMembers = useMemo(
    () => filterCircleMembers(members, { search, status, position, joined }),
    [members, search, status, position, joined],
  )
  const hasFilters = Boolean(search || status || position || joined)

  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setPosition("")
    setJoined("")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Members"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Members" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </ButtonLink>
          }
        />
        <div className="glass-premium rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="50%" />
                </div>
                <Skeleton variant="text" width={80} />
                <Skeleton variant="text" width={60} />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Members" />
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Failed to load members"
          description="Something went wrong. Please try again."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length} member${members.length !== 1 ? "s" : ""} in this circle`}
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: "Circle", href: `/circles/${circleId}` },
          { label: "Members" },
        ]}
        action={
          <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Circle
            </ButtonLink>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No members yet"
          description="This circle has no members."
        />
      ) : (
        <>
          <div className="border-y border-border/70 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4 text-aurora-violet" />
                Member filters
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {filteredMembers.length} of {members.length}
              </span>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search by user ID or position"
                  placeholder="Search user ID or position..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[34rem]">
                <Select label="Member status" options={statusOptions} value={status} onChange={setStatus} />
                <Select label="Member position" options={positionOptions} value={position} onChange={setPosition} />
                <Select
                  label="Joined period"
                  options={[
                    { label: "Joined anytime", value: "" },
                    { label: "Joined in 7 days", value: "7d" },
                    { label: "Joined in 30 days", value: "30d" },
                    { label: "Joined this year", value: "1y" },
                  ]}
                  value={joined}
                  onChange={(value) => setJoined(value as JoinedFilter)}
                />
              </div>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  leftIcon={<X className="h-4 w-4" />}
                  className="self-start lg:self-center"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No matching members"
              description="Try changing or clearing the current filters."
              action={{ label: "Clear filters", onClick: clearFilters }}
            />
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="overflow-hidden border-l-4 border-l-aurora-violet bg-card/40"
            >
              <div className="divide-y divide-border">
                {filteredMembers.map((member) => {
              const isCurrentUser = member.userId === user?.id
              const displayName = member.userName || "Anonymous"
              const statusCfg =
                statusVariantMap[member.status] || statusVariantMap.left

              return (
                <motion.div
                  key={member.id}
                  variants={memberItem}
                  className={cn(
                    "flex items-center justify-between p-4 transition-colors hover:glass-whisper",
                    isCurrentUser && "glass-strong",
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar
                      fallback={displayName}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-heading font-semibold text-foreground dark:text-white truncate text-sm">
                          {displayName}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] font-medium gradient-text bg-white/5 dark:bg-white/10 rounded-full px-2 py-0.5">
                            You
                          </span>
                        )}
                      </div>
                      {member.userAddress && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatAddress(member.userAddress)}
                          </span>
                          <CopyButton text={member.userAddress} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="inline-flex items-center gap-1 glass rounded-full px-2.5 py-1 text-xs font-heading font-medium text-foreground dark:text-white">
                      <Hash className="h-3 w-3 gradient-text" />
                      #{member.position}
                    </span>
                    <Badge variant={statusCfg.variant} size="sm">
                      {statusCfg.label}
                    </Badge>
                  </div>
                </motion.div>
              )
                })}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
