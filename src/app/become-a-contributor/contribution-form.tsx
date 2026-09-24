"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { contributorSchema, zodResolver, type ContributorInput } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { getCsrfHeaders } from "@/lib/auth/csrf"

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

type FormState = "idle" | "submitting" | "success" | "error"

export function ContributionForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContributorInput>({
    resolver: zodResolver(contributorSchema),
    mode: "onTouched",
    defaultValues: { name: "", github: "", contribution: "", bio: "" },
  })
  const [formState, setFormState] = useState<FormState>("idle")
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmitContribution = async (values: ContributorInput) => {
    setFormState("submitting")
    setFormError(null)

    try {
      const res = await fetch("/api/contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to submit")
      }
      setFormState("success")
      reset({ name: "", github: "", contribution: "", bio: "" })
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

  const inputClass = (hasError: boolean) =>
    `w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 ${hasError ? "border-red-400/50" : "border-white/10"}`

  const errorText = (message?: string) =>
    message ? <p className="text-xs text-red-400 mt-1" role="alert">{message}</p> : null

  return (
    <form onSubmit={handleSubmit(handleSubmitContribution)} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="app-name" className="block text-xs font-medium text-muted-foreground mb-1.5">
            Name
          </label>
          <input
            id="app-name"
            type="text"
            placeholder="Your name"
            {...register("name")}
            className={inputClass(Boolean(errors.name))}
          />
          {errorText(errors.name?.message)}
        </div>
      </div>

      <div>
        <label htmlFor="app-github" className="block text-xs font-medium text-muted-foreground mb-1.5">
          GitHub Profile
        </label>
        <input
          id="app-github"
          type="text"
          placeholder="https://github.com/username"
          {...register("github")}
          className={inputClass(Boolean(errors.github))}
        />
        {errorText(errors.github?.message)}
      </div>

      <div>
        <label htmlFor="app-area" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Contribution Area
        </label>
        <select
          id="app-area"
          {...register("contribution")}
          className={inputClass(Boolean(errors.contribution))}
        >
          <option value="">Select area</option>
          {contributionAreas.map((area) => (
            <option key={area} value={area} className="bg-card">
              {area}
            </option>
          ))}
        </select>
        {errorText(errors.contribution?.message)}
      </div>

      <div>
        <label htmlFor="app-bio" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Bio
        </label>
        <textarea
          id="app-bio"
          rows={4}
          placeholder="Tell us about yourself..."
          {...register("bio")}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-y min-h-[80px]"
        />
        {errorText(errors.bio?.message)}
      </div>

      {formState === "error" && formError && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-3" role="alert">
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