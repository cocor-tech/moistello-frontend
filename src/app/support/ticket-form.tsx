"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { ticketSchema, zodResolver, type TicketInput } from "@/lib/validation"
import { Button } from "@/components/ui/button"

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

type FormState = "idle" | "submitting" | "success" | "error"

export function TicketForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketInput>({
    resolver: zodResolver(ticketSchema),
    mode: "onTouched",
    defaultValues: { name: "", subject: "", category: "", message: "", priority: "medium" },
  })
  const [formState, setFormState] = useState<FormState>("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)

  const handleSubmitTicket = async (values: TicketInput) => {
    setFormState("submitting")
    setFormError(null)

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit ticket")
      }
      setFormState("success")
      reset({ name: "", subject: "", category: "", message: "", priority: "medium" })
    } catch (err) {
      setFormState("error")
      setFormError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  const closeSuccess = () => {
    setFormState("idle")
    setShowSubmitForm(false)
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
          onClick={closeSuccess}
        >
          Close
        </Button>
      </div>
    )
  }

  const inputClass = (hasError: boolean) =>
    `w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${hasError ? "border-red-400/50" : "border-white/10"}`

  const errorText = (message?: string) =>
    message ? <p className="mt-1 text-xs text-red-400" role="alert">{message}</p> : null

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
        <form onSubmit={handleSubmit(handleSubmitTicket)} className="space-y-3" noValidate>
          <div>
            <input
              type="text"
              placeholder="Name"
              aria-label="Name"
              {...register("name")}
              className={inputClass(Boolean(errors.name))}
            />
            {errorText(errors.name?.message)}
          </div>
          <div>
            <input
              type="text"
              placeholder="Subject"
              aria-label="Subject"
              {...register("subject")}
              className={inputClass(Boolean(errors.subject))}
            />
            {errorText(errors.subject?.message)}
          </div>
          <div>
            <select
              aria-label="Category"
              {...register("category")}
              className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground focus:outline-none ${errors.category ? "border-red-400/50" : "border-white/10"}`}
            >
              <option value="">Category</option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-card">{c}</option>
              ))}
            </select>
            {errorText(errors.category?.message)}
          </div>
          <div>
            <textarea
              rows={4}
              placeholder="Describe your issue..."
              aria-label="Message"
              {...register("message")}
              className={`w-full rounded-xl bg-white/5 border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-y min-h-[80px] ${errors.message ? "border-red-400/50" : "border-white/10"}`}
            />
            {errorText(errors.message?.message)}
          </div>
          {formState === "error" && formError && (
            <div className="text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2" role="alert">{formError}</div>
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