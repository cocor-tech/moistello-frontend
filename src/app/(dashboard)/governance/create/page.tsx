"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FileCode2, Send, ArrowLeft, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCreateProposal } from "@/hooks/use-governance"

export default function CreateProposalPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Circle Parameter")
  const [votingPeriodDays, setVotingPeriodDays] = useState("7")
  const [executionPayload, setExecutionPayload] = useState("")
  const [error, setError] = useState("")
  const createProposal = useCreateProposal()

  async function submit() {
    if (!title.trim()) {
      setError("Proposal title is required.")
      return
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Proposal description must be at least 20 characters long.")
      return
    }

    setError("")
    try {
      const proposal = await createProposal.mutateAsync({
        title,
        description,
        executionPayload,
        category,
      })
      router.push(`/governance/${proposal.id}`)
    } catch {
      setError("Proposal could not be submitted to the governance contract. Please try again.")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8" data-testid="create-proposal-page">
      <Link
        href="/governance"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Governance
      </Link>

      <header>
        <p className="font-mono text-xs text-aurora-violet uppercase tracking-widest font-semibold">
          NEW ON-CHAIN ACTION
        </p>
        <h1 className="mt-1 font-heading text-4xl font-bold text-foreground">Create Proposal</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Submit a new governance proposal for community voting and automated smart contract execution.
        </p>
      </header>

      <form
        className="space-y-6 border border-white/10 rounded-2xl p-6 sm:p-8 bg-white/[0.02]"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        data-testid="create-proposal-form"
      >
        {/* Category & Voting Period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="proposal-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Proposal Category
            </label>
            <select
              id="proposal-category"
              aria-label="Proposal category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="category-select"
            >
              <option value="Circle Parameter" className="bg-background">Circle Parameter</option>
              <option value="Treasury Release" className="bg-background">Treasury Release</option>
              <option value="Rule Amendment" className="bg-background">Rule Amendment</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="voting-period" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Voting Period
            </label>
            <select
              id="voting-period"
              aria-label="Voting period"
              value={votingPeriodDays}
              onChange={(e) => setVotingPeriodDays(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-aurora-violet"
              data-testid="voting-period-select"
            >
              <option value="3" className="bg-background">3 Days (Fast track)</option>
              <option value="7" className="bg-background">7 Days (Standard)</option>
              <option value="14" className="bg-background">14 Days (Major changes)</option>
            </select>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Input
            label="Proposal Title"
            placeholder="e.g. MIP-16: Adjust Grace Period for Active Circles"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base font-medium"
            data-testid="title-input"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="proposal-description" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Description & Rationale
          </label>
          <textarea
            id="proposal-description"
            aria-label="Proposal description and rationale"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the motivation, background, parameters, and intended impact of this proposal in detail..."
            className="mt-1 min-h-36 w-full rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-foreground focus:border-aurora-violet focus:outline-none placeholder:text-muted-foreground/50"
            data-testid="description-textarea"
          />
        </div>

        {/* Execution Payload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="proposal-execution-payload" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Smart Contract Execution Payload (Optional)
            </label>
            <span className="text-xs text-muted-foreground font-mono">JSON / Soroban Call</span>
          </div>
          <textarea
            id="proposal-execution-payload"
            aria-label="Smart contract execution payload"
            value={executionPayload}
            onChange={(e) => setExecutionPayload(e.target.value)}
            placeholder={`{\n  "target": "CircleFactory",\n  "action": "setFeeBps",\n  "value": 250\n}`}
            className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-xs text-foreground focus:border-aurora-violet focus:outline-none placeholder:text-muted-foreground/40"
            data-testid="payload-textarea"
          />
        </div>

        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={createProposal.isPending}
            leftIcon={<Send className="h-4 w-4" />}
            rightIcon={<FileCode2 className="h-4 w-4" />}
            data-testid="submit-proposal-button"
          >
            Submit Proposal
          </Button>
        </div>
      </form>
    </div>
  )
}
