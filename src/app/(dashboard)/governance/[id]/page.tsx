"use client"

import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import {
  ArrowLeft,
  ThumbsDown,
  ThumbsUp,
  CircleMinus,
  Clock,
  CircleCheckBig,
  CircleAlert,
  ShieldCheck,
  CodeXml,
  User,
  Vote,
} from "lucide-react"
import Link from "next/link"
import { Button, ButtonLink } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { useGovernanceProposal, useVoteOnProposal } from "@/hooks/use-governance"
import { QUORUM_THRESHOLD_VOTES, type VoteChoice } from "@/lib/governance-api"
import { useGovernanceVotes } from "@/stores/governance-votes-store"
import { cn } from "@/lib/cn"
import { useUIStore } from "@/stores/ui-store"

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const addToast = useUIStore((state) => state.addToast)

  const [voteChoice, setVoteChoice] = useState<boolean | VoteChoice | null>(null)
  const [voteReason, setVoteReason] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  /*
   * The user's own vote now comes from a persisted store rather than local
   * state, so the "You voted FOR" banner survives navigating away and reloading.
   * As local `useState` it reset on every route change, leaving a voter unable
   * to tell whether they had already voted — the one piece of state they
   * actually need. The write happens in the hook's `onSuccess`, so a failed vote
   * never leaves a marker behind.
   */
  const recordedVote = useGovernanceVotes((state) => state.votes[id]?.choice ?? null)

  const { data: proposal, isLoading } = useGovernanceProposal(id)
  const voteMutation = useVoteOnProposal(id)

  const totalVotes = (proposal?.votesFor ?? 0) + (proposal?.votesAgainst ?? 0) + (proposal?.votesAbstain ?? 0)
  const forPercent = totalVotes ? Math.round(((proposal?.votesFor ?? 0) / totalVotes) * 100) : 0
  const againstPercent = totalVotes ? Math.round(((proposal?.votesAgainst ?? 0) / totalVotes) * 100) : 0
  const abstainPercent = totalVotes ? Math.round(((proposal?.votesAbstain ?? 0) / totalVotes) * 100) : 0

  // Quorum progress: how much of the required participation has been reached.
  // Every vote counts toward quorum, so totalVotes is the numerator.
  //
  // Capped at 100 so the bar never overflows once quorum is comfortably passed,
  // and floored so a proposal one vote short of quorum does not round up to a
  // full bar that contradicts the "not reached" status next to it.
  const quorumReached = totalVotes >= QUORUM_THRESHOLD_VOTES
  const quorumPercent = quorumReached
    ? 100
    : Math.floor((totalVotes / QUORUM_THRESHOLD_VOTES) * 100)
  const votesToQuorum = Math.max(0, QUORUM_THRESHOLD_VOTES - totalVotes)

  const countdown = useMemo(() => {
    if (!proposal?.timelockEndsAt) return "No timelock active"
    const hours = Math.max(0, Math.ceil((new Date(proposal.timelockEndsAt).getTime() - Date.now()) / 3_600_000))
    if (hours === 0) return "Timelock expired (Ready to execute)"
    return `${hours}h remaining`
  }, [proposal?.timelockEndsAt])

  const openVoteModal = (choice: boolean | VoteChoice) => {
    setVoteChoice(choice)
    setShowConfirmModal(true)
  }

  const handleConfirmVote = async () => {
    if (voteChoice === null) return
    try {
      // The hook records the vote in the persisted store on success, so there
      // is nothing to set here — doing it in both places would let the banner
      // claim a vote that the request never confirmed.
      await voteMutation.mutateAsync(voteChoice as boolean | VoteChoice)
      setShowConfirmModal(false)
      addToast({
        type: "success",
        title: "Vote Cast Successfully",
        description: `Your vote (${voteChoice === true ? "FOR" : voteChoice === false ? "AGAINST" : "ABSTAIN"}) was recorded on-chain.`,
      })
    } catch {
      addToast({
        type: "error",
        title: "Voting Error",
        description: "The vote could not be submitted. Check your wallet connection.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 py-12" data-testid="proposal-loading">
        <div className="h-8 w-48 bg-white/10 rounded animate-pulse" />
        <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="border border-white/10 rounded-2xl p-12 text-center space-y-4">
        <CircleAlert className="h-10 w-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Proposal Not Found</h3>
        <p className="text-xs text-muted-foreground">The proposal #{id} could not be retrieved.</p>
        <ButtonLink href="/governance" variant="outline" size="sm">Back to Governance</ButtonLink>
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="proposal-detail-page">
      <Link
        href="/governance"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Governance
      </Link>

      {/* Header Banner */}
      <section className="relative overflow-hidden border border-white/10 rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-aurora-violet/20 via-background to-emerald-400/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-aurora-violet/40 bg-aurora-violet/10 px-3 py-1 text-xs font-semibold text-aurora-violet uppercase">
              {proposal.status}
            </span>
            {proposal.category && (
              <span className="text-xs font-mono text-muted-foreground bg-white/5 px-2.5 py-1 rounded">
                {proposal.category}
              </span>
            )}
          </div>
          <span className="font-mono text-sm text-muted-foreground">Proposal #{proposal.id}</span>
        </div>

        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground max-w-3xl">
          {proposal.title}
        </h1>

        <p className="whitespace-pre-wrap text-sm text-muted-foreground max-w-3xl leading-relaxed">
          {proposal.description}
        </p>

        {proposal.proposer && (
          <div className="pt-2 text-xs text-muted-foreground flex items-center gap-2 border-t border-white/10">
            <User className="h-3.5 w-3.5 text-aurora-violet" />
            <span>Proposed by: <code className="font-mono text-foreground">{proposal.proposer}</code></span>
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Voting & Tally Area */}
        <section className="lg:col-span-2 space-y-6 border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
              <Vote className="h-5 w-5 text-aurora-violet" />
              Voting Tally
            </h3>
            <span className="text-xs text-muted-foreground font-mono">Total: {totalVotes} votes</span>
          </div>

          {/* Breakdown progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-emerald-400">For: {proposal.votesFor} ({forPercent}%)</span>
              <span className="text-red-400">Against: {proposal.votesAgainst} ({againstPercent}%)</span>
              {proposal.votesAbstain !== undefined && (
                <span className="text-muted-foreground">Abstain: {proposal.votesAbstain} ({abstainPercent}%)</span>
              )}
            </div>

            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${forPercent}%` }} />
              <div className="h-full bg-red-400 transition-all duration-300" style={{ width: `${againstPercent}%` }} />
              <div className="h-full bg-muted-foreground/40 transition-all duration-300" style={{ width: `${abstainPercent}%` }} />
            </div>
          </div>

          {/* Quorum progress */}
          <div
            className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-4"
            data-testid="quorum-progress"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck
                  className={cn(
                    "h-3.5 w-3.5",
                    quorumReached ? "text-emerald-400" : "text-amber-400",
                  )}
                  aria-hidden="true"
                />
                Quorum
              </span>
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  quorumReached ? "text-emerald-400" : "text-amber-400",
                )}
                data-testid="quorum-status"
              >
                {quorumReached
                  ? "Reached"
                  : `${totalVotes.toLocaleString()} / ${QUORUM_THRESHOLD_VOTES.toLocaleString()}`}
              </span>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Quorum progress"
              aria-valuenow={quorumPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${quorumPercent}% of quorum reached, ${totalVotes} of ${QUORUM_THRESHOLD_VOTES} votes`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  quorumReached
                    ? "bg-emerald-400"
                    : "bg-gradient-to-r from-amber-400 to-aurora-violet",
                )}
                style={{ width: `${quorumPercent}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {quorumReached
                ? "Quorum reached. The outcome of this vote is binding."
                : `${votesToQuorum.toLocaleString()} more ${votesToQuorum === 1 ? "vote" : "votes"} needed to reach quorum.`}
            </p>
          </div>

          {/* User Voting Status */}
          {recordedVote ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CircleCheckBig className="h-4 w-4 shrink-0" />
              <span>
                You voted <strong>{recordedVote.toUpperCase()}</strong> on this proposal.
              </span>
            </div>
          ) : proposal.status === "active" ? (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cast Your Vote
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => openVoteModal(true)}
                  leftIcon={<ThumbsUp className="h-4 w-4" />}
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  data-testid="vote-for-button"
                >
                  Vote For
                </Button>
                <Button
                  onClick={() => openVoteModal(false)}
                  leftIcon={<ThumbsDown className="h-4 w-4" />}
                  variant="destructive"
                  data-testid="vote-against-button"
                >
                  Vote Against
                </Button>
                <Button
                  onClick={() => openVoteModal("abstain")}
                  leftIcon={<CircleMinus className="h-4 w-4" />}
                  variant="outline"
                  data-testid="vote-abstain-button"
                >
                  Abstain
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Voting is closed for this proposal.</p>
          )}

          {/* Payload Inspection */}
          {proposal.executionPayload && (
            <div className="border-t border-white/10 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <CodeXml className="h-4 w-4 text-aurora-cyan" />
                Execution Payload
              </div>
              <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto">
                {proposal.executionPayload}
              </pre>
            </div>
          )}
        </section>

        {/* Sidebar Info */}
        <aside className="space-y-6">
          <div className="border-l-4 border-l-amber-400 border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-3">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" /> Timelock Status
            </p>
            <p className="font-mono text-2xl font-bold text-foreground">{countdown}</p>
            <p className="text-xs text-muted-foreground">
              Passed proposals require a mandatory timelock window before execution on Soroban smart contracts.
            </p>
          </div>

          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.02] space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Voting Requirements
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Min MoiScore: 100
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Quorum threshold: {QUORUM_THRESHOLD_VOTES.toLocaleString()} votes
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Simple majority (&gt;50%) required to pass
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Vote Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Governance Vote"
        data-testid="vote-confirm-modal"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are about to cast your vote on proposal <strong className="text-foreground">#{proposal.id}</strong>:
          </p>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Selection</p>
            <p
              className={`text-xl font-bold font-heading mt-1 ${
                voteChoice === true
                  ? "text-emerald-400"
                  : voteChoice === false
                  ? "text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              VOTE {voteChoice === true ? "FOR" : voteChoice === false ? "AGAINST" : "ABSTAIN"}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="vote-reason" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reason / Comment (Optional)
            </label>
            <textarea
              id="vote-reason"
              aria-label="Reason or comment for your vote"
              value={voteReason}
              onChange={(e) => setVoteReason(e.target.value)}
              placeholder="Provide context for your vote..."
              className="w-full min-h-20 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-foreground focus:border-aurora-violet focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="md" onClick={() => setShowConfirmModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmVote}
              isLoading={voteMutation.isPending}
              className="flex-1"
              data-testid="submit-confirm-vote"
            >
              Confirm & Sign Vote
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
