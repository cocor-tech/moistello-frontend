"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface TicketStatus {
  id: string
  subject: string
  status: "open" | "in_progress" | "resolved" | "closed"
  priority: "low" | "medium" | "high" | "urgent"
  createdAt: string
  lastUpdated: string
}

const statusConfig = {
  open: { label: "Open", color: "text-amber-400 bg-amber-500/10" },
  in_progress: { label: "In Progress", color: "text-blue-400 bg-blue-500/10" },
  resolved: { label: "Resolved", color: "text-emerald-400 bg-emerald-500/10" },
  closed: { label: "Closed", color: "text-muted-foreground bg-white/5" },
}

export function TicketLookup() {
  const [ticketId, setTicketId] = useState("")
  const [ticketLookupState, setTicketLookupState] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle")
  const [lookedUpTicket, setLookedUpTicket] = useState<TicketStatus | null>(null)
  const [ticketLookupError, setTicketLookupError] = useState<string | null>(null)

  const handleLookupTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketId.trim()) return

    setTicketLookupState("loading")
    setTicketLookupError(null)
    setLookedUpTicket(null)

    try {
      const res = await fetch(`/api/support/tickets/${ticketId.trim()}`)
      if (res.status === 404) {
        setTicketLookupState("not_found")
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Lookup failed")
      }
      const data = await res.json()
      setLookedUpTicket(data.ticket as TicketStatus)
      setTicketLookupState("found")
    } catch (err) {
      setTicketLookupState("error")
      setTicketLookupError(err instanceof Error ? err.message : "Lookup failed")
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleLookupTicket} className="flex gap-2 mb-4">
        <input
          aria-label="Ticket ID"
          type="text"
          value={ticketId}
          onChange={(e) => {
            setTicketId(e.target.value)
            if (ticketLookupState !== "idle") {
              setTicketLookupState("idle")
              setLookedUpTicket(null)
            }
          }}
          placeholder="Ticket ID"
          className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
        />
        <Button
          type="submit"
          variant="ghost"
          className="w-auto bg-aurora-cyan/15 text-aurora-cyan hover:bg-aurora-cyan/25"
          isLoading={ticketLookupState === "loading"}
          disabled={!ticketId.trim() || ticketLookupState === "loading"}
        >
          Search
        </Button>
      </form>

      {ticketLookupState === "not_found" && (
        <p className="text-xs text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">Ticket not found</p>
      )}
      {ticketLookupState === "error" && (
        <p className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{ticketLookupError}</p>
      )}
      {ticketLookupState === "found" && lookedUpTicket && (
        <div className="rounded-xl border border-white/10 px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono text-muted-foreground">{lookedUpTicket.id}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[lookedUpTicket.status].color}`}>
              {statusConfig[lookedUpTicket.status].label}
            </span>
          </div>
          <p className="text-sm text-foreground">{lookedUpTicket.subject}</p>
        </div>
      )}
      {ticketLookupState === "idle" && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Enter the ticket ID emailed to you.
        </p>
      )}
    </div>
  )
}
