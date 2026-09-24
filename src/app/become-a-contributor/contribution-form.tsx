"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { getCsrfHeaders } from "@/lib/auth/csrf"

interface FormData {
  name: string
  github: string
  contribution: string
  bio: string
}

const contributionAreas = [
  "Frontend Development (TypeScript/Next.js)",
  "Backend Development (Go/Rust)",
  "Smart Contracts (Soroban/Rust)",
  "Design & UI/UX",
  "Documentation & Tutorials",
  "Community Management",
  "Content Creation (Blog/Videos)",
  "Testing & Quality Assurance",
  "DevOps & Infrastructure",
  "Other",
]

export function ContributionForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    github: "",
    contribution: "",
    bio: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [formError, setFormError] = useState<string | null>(null)

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = "Name is required"
    if (!formData.github.trim()) errors.github = "GitHub profile is required"
    else if (!formData.github.startsWith("https://github.com/"))
      errors.github = "Please enter a valid GitHub URL"
    if (!formData.contribution) errors.contribution = "Select an area"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setFormState("submitting")
    setFormError(null)

    try {
      const res = await fetch("/api/contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit")
      }
      setFormState("success")
      setFormData({ name: "", github: "", contribution: "", bio: "" })
    } catch (err) {
      setFormState("error")
      setFormError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  if (formState === "success") {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mb-4">
          <CheckCircleIcon />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Application Sent</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Thank you! We&apos;ll review your application and respond within 3-5 business days.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-aurora-cyan hover:text-aurora-cyan"
          onClick={() => setFormState("idle")}
        >
          Submit another
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="app-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
            Name
          </label>
          <input
            id="app-name"
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value })
              if (formErrors.name) setFormErrors({ ...formErrors, name: "" })
            }}
            className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${formErrors.name ? "border-red-400/50" : "border-white/10"}`}
            placeholder="Your name"
          />
          {formErrors.name && <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="app-github" className="block text-xs font-medium text-muted-foreground mb-1.5">
          GitHub Profile
        </label>
        <input
          id="app-github"
          type="text"
          value={formData.github}
          onChange={(e) => {
            setFormData({ ...formData, github: e.target.value })
            if (formErrors.github) setFormErrors({ ...formErrors, github: "" })
          }}
          className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${formErrors.github ? "border-red-400/50" : "border-white/10"}`}
          placeholder="https://github.com/username"
        />
        {formErrors.github && <p className="text-xs text-red-400 mt-1">{formErrors.github}</p>}
      </div>

      <div>
        <label htmlFor="app-area" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Contribution Area
        </label>
        <select
          id="app-area"
          value={formData.contribution}
          onChange={(e) => {
            setFormData({ ...formData, contribution: e.target.value })
            if (formErrors.contribution) setFormErrors({ ...formErrors, contribution: "" })
          }}
          className={`w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${formErrors.contribution ? "border-red-400/50" : "border-white/10"}`}
        >
          <option value="">Select area</option>
          {contributionAreas.map((area) => (
            <option key={area} value={area} className="bg-card">
              {area}
            </option>
          ))}
        </select>
        {formErrors.contribution && <p className="text-xs text-red-400 mt-1">{formErrors.contribution}</p>}
      </div>

      <div>
        <label htmlFor="app-bio" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Bio
        </label>
        <textarea
          id="app-bio"
          rows={4}
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-y min-h-[80px]"
          placeholder="Tell us about yourself..."
        />
      </div>

      {formState === "error" && formError && (
        <div role="alert" className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3">
          <AlertCircleIcon />
          <span>{formError}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={formState === "submitting"}
        disabled={formState === "submitting"}
        leftIcon={<SendIcon />}
      >
        {formState === "submitting" ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  )
}

function CheckCircleIcon() {
  return <svg className="h-8 w-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
}

function AlertCircleIcon() {
  return <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
}

function SendIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
}