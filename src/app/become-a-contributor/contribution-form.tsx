"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { contributorSchema, zodResolver, type ContributorInput } from "@/lib/validation"
import { Button } from "@/components/ui/button"
import { ErrorSummary } from "@/components/shared/error-summary"
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
    // react-hook-form focuses the first invalid field after a failed submit by
    // default, which runs *after* the invalid callback and so overrode the error
    // summary's focus. Two things grabbing focus means the screen reader lands
    // mid-form instead of on the alert that explains the failure, so the summary
    // owns focus and RHF is told to keep its hands off.
    shouldFocusError: false,
  })
  const [formState, setFormState] = useState<FormState>("idle")
  const [formError, setFormError] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const fieldConfig = [
    { name: "name" as const, label: "Name", id: "app-name" },
    { name: "github" as const, label: "GitHub profile", id: "app-github" },
    { name: "contribution" as const, label: "Contribution area", id: "app-area" },
    { name: "bio" as const, label: "Bio", id: "app-bio" },
  ]

  // Only summarise after a submit attempt: on first render this would list
  // every field as broken before the user has done anything.
  const errorEntries = submitAttempted
    ? fieldConfig
        .filter(({ name }) => errors[name])
        .map(({ name, label, id }) => ({
          fieldId: id,
          label,
          message: errors[name]?.message ?? "Invalid value",
        }))
    : []

  const onValid = async (values: ContributorInput) => {
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

  // Flip the flag before the invalid handler runs so the summary is rendered
  // in the same commit as the failed submit.
  const onInvalid = () => {
    setSubmitAttempted(true)
  }

  const handleFormSubmit = handleSubmit(onValid, onInvalid)

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
    `w-full h-11 rounded-xl bg-white/5 border px-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground ${hasError ? "border-red-400/50" : "border-white/10"}`

  const errorText = (message?: string, id?: string) =>
    message ? (
      <p id={id} className="text-xs text-red-400 mt-1">
        {message}
      </p>
    ) : null

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
      <ErrorSummary entries={errorEntries} />

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
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "app-name-error" : undefined}
            className={inputClass(Boolean(errors.name))}
          />
          {errorText(errors.name?.message, "app-name-error")}
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
          aria-invalid={errors.github ? true : undefined}
          aria-describedby={errors.github ? "app-github-error" : undefined}
          className={inputClass(Boolean(errors.github))}
        />
        {errorText(errors.github?.message, "app-github-error")}
      </div>

      <div>
        <label htmlFor="app-area" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Contribution Area
        </label>
        <select
          id="app-area"
          {...register("contribution")}
          aria-invalid={errors.contribution ? true : undefined}
          aria-describedby={errors.contribution ? "app-area-error" : undefined}
          className={inputClass(Boolean(errors.contribution))}
        >
          <option value="">Select area</option>
          {contributionAreas.map((area) => (
            <option key={area} value={area} className="bg-card">
              {area}
            </option>
          ))}
        </select>
        {errorText(errors.contribution?.message, "app-area-error")}
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
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={errors.bio ? "app-bio-error" : undefined}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-y min-h-[80px]"
        />
        {errorText(errors.bio?.message, "app-bio-error")}
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