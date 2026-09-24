"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getCsrfHeaders } from "@/lib/auth/csrf"

interface FormData {
  name: string
  subject: string
  category: string
  message: string
  priority: string
}

const categories = [
  "Account & Wallet",
  "Circle Management",
  "Payments & Withdrawals",
  "Passkey & Security",
  "MoiScore & Reputation",
  "Governance & Voting",
  "Bug Report",
  "Feature Request",
  "Other",
]

export function TicketForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    subject: "",
    category: "",
    message: "",
    priority: "medium",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = "Name is required"
    if (!formData.subject.trim()) errors.subject = "Subject is required"
    if (!formData.category) errors.category = "Select a category"
    if (!formData.message.trim()) errors.message = "Describe your issue"
    else if (formData.message.trim().length < 20)
      errors.message = "Please provide more detail (at least 20 characters)"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setFormState("submitting")
    setFormError(null)

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit ticket")
      }
      setFormState("success")
      setFormData({ name: "", subject: "", category: "", message: "", priority: "medium" })
    } catch (err) {
      setFormState("error")
      setFormError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  if (formState === "success") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 mb-3">
          <CheckCircleIcon />
        </div>
        <h3 className="font-heading text-base font-semibold text-foreground mb-1">
          Ticket Submitted
        </h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
          We&apos;ll respond within 24 hours.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-aurora-cyan hover:text-aurora-cyan"
          onClick={() => { setFormState("idle"); setShowSubmitForm(false) }}
        >
          Close
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!showSubmitForm ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full bg-aurora-violet/10 text-aurora-violet hover:bg-aurora-violet/20"
          leftIcon={<SendIcon />}
          onClick={() => setShowSubmitForm(true)}
        >
          Open Ticket Form
        </Button>
      ) : (
        <form onSubmit={handleSubmitTicket} className="space-y-3">
          <input
            aria-label="Your name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Name"
            className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${formErrors.name ? "border-red-400/50" : "border-white/10"}`}
          />
          <input
            aria-label="Ticket subject"
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Subject"
            className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${formErrors.subject ? "border-red-400/50" : "border-white/10"}`}
          />
          <select
            aria-label="Ticket category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-foreground focus:outline-none"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-card">{c}</option>
            ))}
          </select>
          <textarea
            aria-label="Describe your issue"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Describe your issue..."
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-y min-h-[80px]"
          />
          {formState === "error" && formError && (
            <div role="alert" className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2">{formError}</div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 border border-white/10"
              onClick={() => setShowSubmitForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={formState === "submitting"}
              disabled={formState === "submitting"}
            >
              Submit
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function CheckCircleIcon() {
  return <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
}

function SendIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
}