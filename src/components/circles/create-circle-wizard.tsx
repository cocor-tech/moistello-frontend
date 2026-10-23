"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCreateCircle } from "@/hooks/use-circles"
import { useAuth } from "@/hooks/use-auth"
import { type CreateCircleInput } from "@/lib/validators"
import { Button } from "@/components/ui/button"
import { CreateStepIndicator } from "@/components/circles/create-step-indicator"
import { CreateStepDetails } from "@/components/circles/create-step-details"
import { CommunityStepDetails } from "@/components/circles/community-step-details"
import { CreateStepFinancials } from "@/components/circles/create-step-financials"
import { CreateStepPayout } from "@/components/circles/create-step-payout"
import { CreateStepReview } from "@/components/circles/create-step-review"
import { useUIStore } from "@/stores/ui-store"
import type { CircleFormData } from "@/types"
import {
  initialCircleForm,
  buildCircleFormData,
  validateCircleStep,
} from "@/lib/circles/circle-creation"

const STEP_LABELS = ["Details", "Financials", "Payout", "Review"]

function getSteps(communityId?: string) {
  return communityId
    ? [CommunityStepDetails, CreateStepFinancials, CreateStepPayout, CreateStepReview] as const
    : [CreateStepDetails, CreateStepFinancials, CreateStepPayout, CreateStepReview] as const
}

interface CreateCircleWizardProps {
  communityId?: string
  onSubmit?: (data: CreateCircleInput) => void
  isPending?: boolean
}

import { useSubmitGuard } from "@/hooks/use-submit-guard"

export default function CreateCircleWizard({
  communityId,
  onSubmit,
  isPending,
}: CreateCircleWizardProps) {
  const router = useRouter()
  const createCircle = useCreateCircle()
  const { user } = useAuth()
  const addToast = useUIStore((s) => s.addToast)
  const { guard, isPending: isGuarded } = useSubmitGuard()

  const STEPS = getSteps(communityId)

  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<CircleFormData>(initialCircleForm(communityId))

  const onSuccessPath = communityId
    ? `/communities/${communityId}/circles`
    : "/circles"

  const go = (step: number) => { setCurrentStep(step) }

  const handleNext = () => {
    const { success, errors: stepErrors } = validateCircleStep(currentStep, formData, user?.moiScore ?? 0, communityId)
    setErrors(stepErrors)
    if (success) go(Math.min(4, currentStep + 1))
  }
  const handleBack = () => { setErrors({}); go(Math.max(1, currentStep - 1)) }
  const handleSubmit = guard(async () => {
    const { success, errors: stepErrors } = validateCircleStep(4, formData, user?.moiScore ?? 0, communityId)
    if (!success) {
      setErrors(stepErrors)
      return
    }
    const payload = buildCircleFormData(formData, communityId)
    setErrors({})
    if (onSubmit) {
      onSubmit(payload)
      return
    }
    await new Promise<void>((resolve, reject) => {
      createCircle.mutate(payload as unknown as Parameters<typeof createCircle.mutate>[0], {
        onSuccess: (res: unknown) => {
          const data = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined
          const circle = data?.circle as Record<string, unknown> | undefined
          const rawId = circle?.id
          const circleId = typeof rawId === "string" ? rawId : undefined
          addToast({ type: "success", title: "Circle created!", description: "Your savings circle is ready." })
          setTimeout(() => router.push(circleId ? `/circles/${circleId}` : onSuccessPath), 500)
          resolve()
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: Record<string, unknown> }; message?: string }
          const resp = axiosErr?.response?.data
          setErrors({ submit: JSON.stringify(resp ?? axiosErr?.message ?? err) })
          reject(err)
        },
      })
    })
  })

  const StepC = STEPS[currentStep - 1]
  const stepProps = currentStep === 4
    ? { formData, isPending: isPending ?? createCircle.isPending, errors }
    : { formData, setFormData, errors }

  return (
    <div className="mx-auto max-w-2xl">
      <CreateStepIndicator currentStep={currentStep} steps={STEP_LABELS.map((label, i) => ({ label, number: i + 1 }))} />
      <div className="glass-premium rounded-2xl p-6 md:p-8 holo-border">
        <div key={`step-${currentStep}`}>
          <StepC
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...(stepProps as any)} />
        </div>
      </div>
      {errors.submit && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {errors.submit}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between">
        {currentStep > 1 ? (
          <Button variant="outline" size="md" onClick={handleBack}
            leftIcon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
        ) : <div />}
        {currentStep < 4 ? (
          <Button variant="primary" size="md" onClick={handleNext}
            rightIcon={<ChevronRight className="h-4 w-4" />}>Next</Button>
        ) : (
          <Button variant="premium" size="lg" onClick={handleSubmit}
            isLoading={isPending ?? (isGuarded || createCircle.isPending)}
            disabled={isPending ?? (isGuarded || createCircle.isPending)}>Create Circle</Button>
        )}
      </div>
    </div>
  )
}
