"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Award,
  Send,
  ShieldCheck,
  Zap,
  TrendingUp,
  CircleDot,
  ExternalLink,
  Calendar,
  Globe,
} from "lucide-react"
import { ButtonLink } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { CopyButton } from "@/components/shared/copy-button"
import { MOCK_PEOPLE } from "../page"

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>()

  const person = MOCK_PEOPLE.find((p) => p.id === id) || {
    id: id || "usr_1",
    displayName: "Community Member",
    username: `@user_${id?.slice(0, 6)}`,
    walletAddress: "GCX4B3YJ2W...7H9K",
    moiScore: 780,
    tier: "Builder" as const,
    activeCircles: 3,
    totalSavings: 1500,
    country: "Global",
    bio: "Active participant in Soroban community savings pools.",
    joinedDate: "2024-01-01",
  }

  return (
    <div className="space-y-8" data-testid="person-profile-page">
      <Link
        href="/people"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to People Directory
      </Link>

      {/* Header Banner */}
      <div className="relative border border-white/10 rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-aurora-violet/15 via-background to-emerald-500/10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={person.displayName} size="lg" className="border-2 border-aurora-violet/30" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold text-foreground">{person.displayName}</h1>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-aurora-violet/10 text-aurora-violet border border-aurora-violet/20">
                  <Award className="h-3 w-3" />
                  {person.tier}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{person.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <CopyButton text={person.walletAddress} label={person.walletAddress} />
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${person.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-aurora-cyan transition-colors"
                  title="View on Stellar.Expert"
                  aria-label="Open wallet address in Stellar.Expert"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <ButtonLink href={`/wallet/transfer?recipient=${encodeURIComponent(person.walletAddress)}`}  variant="primary" size="md" leftIcon={<Send className="h-4 w-4" />}>
              Send Funds
            </ButtonLink>
        </div>

        <p className="text-sm text-muted-foreground max-w-2xl">{person.bio}</p>

        <div className="flex flex-wrap gap-6 text-xs text-muted-foreground border-t border-white/10 pt-4">
          {person.country && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-aurora-cyan" />
              {person.country}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-aurora-violet" />
            Joined {new Date(person.joinedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Verified Soroban Participant
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>MoiScore Reputation</span>
            <Zap className="h-4 w-4 text-aurora-violet" />
          </div>
          <p className="text-3xl font-bold font-heading text-aurora-violet">{person.moiScore}</p>
          <p className="text-xs text-muted-foreground mt-1">Top 15% community percentile</p>
        </div>

        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Active Circles</span>
            <CircleDot className="h-4 w-4 text-aurora-cyan" />
          </div>
          <p className="text-3xl font-bold font-heading text-foreground">{person.activeCircles}</p>
          <p className="text-xs text-muted-foreground mt-1">100% on-time contribution rate</p>
        </div>

        <div className="border border-white/10 rounded-xl p-5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Total Savings Volume</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold font-heading text-emerald-400">${person.totalSavings}</p>
          <p className="text-xs text-muted-foreground mt-1">Accumulated across circles</p>
        </div>
      </div>
    </div>
  )
}
