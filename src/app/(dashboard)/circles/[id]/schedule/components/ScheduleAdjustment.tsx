"use client"

import { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Calendar, Save, X, AlertCircle, Clock, HelpCircle } from "lucide-react"
import { useCircle, useCircleRounds } from "@/hooks/use-circles"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { post } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { useUIStore } from "@/stores/ui-store"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/cn"
import type { ApiResponse, Frequency } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RoundScheduleItem {
  round: number
  date: Date
  isAdjustable: boolean
  gracePeriodEnd?: Date
  deadline?: Date
}

interface ScheduleAdjustmentProps {
  circleId: string
  initialSchedule: RoundScheduleItem[]
  onScheduleChange: (schedule: RoundScheduleItem[]) => void
}

function getNextDate(frequency: Frequency, from: Date): Date {
  const d = new Date(from)
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1)
      break
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "biweekly":
      d.setDate(d.getDate() + 14)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
  }
  return d
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date)
  d.setHours(d.getHours() + hours)
  return d
}

function parseLocalDatetimeLocal(value: string): Date {
  // datetime-local returns local time without timezone info
  // Parse as local time to avoid UTC conversion issues
  const [datePart, timePart] = value.split("T")
  const [year, month, day] = datePart.split("-").map(Number)
  const [hours, minutes] = timePart.split(":").map(Number)
  const d = new Date()
  d.setFullYear(year, month - 1, day)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export function ScheduleAdjustment({
  circleId,
  initialSchedule,
  onScheduleChange,
}: ScheduleAdjustmentProps) {
  const { user } = useAuth()
  const { data: circle } = useCircle(circleId)
  const { data: rounds = [] } = useCircleRounds(circleId)
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSchedule, setEditedSchedule] = useState<RoundScheduleItem[]>(initialSchedule)
  const [errors, setErrors] = useState<Record<number, string>>({})

  const isOrganizer = user && circle && circle.organizerId === user.id

  if (!isOrganizer) {
    return null
  }

  const adjustScheduleMutation = useMutation({
    mutationFn: async (schedule: RoundScheduleItem[]) => {
      const response = await post<ApiResponse<unknown>>(`/circles/${circleId}/schedule/adjust`, {
        schedule: schedule.map((s) => ({
          round: s.round,
          date: s.date.toISOString(),
        })),
      })
      return response.data
    },
    onSuccess: () => {
      addToast({
        type: "success",
        title: "Schedule updated",
        description: "Round schedule has been adjusted successfully.",
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.detail(circleId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.circles.rounds(circleId) })
      setIsEditing(false)
      onScheduleChange(editedSchedule)
    },
    onError: (err: unknown) => {
      const apiErr = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      const message = apiErr || (err instanceof Error ? err.message : "Failed to adjust schedule")
      addToast({
        type: "error",
        title: "Failed to adjust schedule",
        description: message,
      })
    },
  })

  const validateSchedule = useCallback((schedule: RoundScheduleItem[]): Record<number, string> => {
    const newErrors: Record<number, string> = {}
    if (!circle) return newErrors

    const now = new Date()
    const gracePeriodHours = circle.gracePeriodHours || 0

    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i]
      const roundData = rounds.find((r) => r.roundNumber === item.round)

      if (roundData && roundData.contributions.some((c) => c.status === "confirmed")) {
        newErrors[item.round] = "Cannot adjust round with confirmed contributions"
        continue
      }

      if (item.round <= (circle.currentRound ?? 0)) {
        newErrors[item.round] = "Cannot adjust current or past rounds"
        continue
      }

      if (i > 0) {
        const prevItem = schedule[i - 1]
        const minGap = getMinGapForFrequency(circle.frequency)
        const diffHours = (item.date.getTime() - prevItem.date.getTime()) / (1000 * 60 * 60)
        if (diffHours < minGap) {
          newErrors[item.round] = `Must be at least ${minGap}h after previous round`
        }
      }

      const graceEnd = addHours(item.date, gracePeriodHours)
      if (graceEnd < now && item.round > (circle.currentRound ?? 0)) {
        newErrors[item.round] = "Grace period would end in the past"
      }
    }

    return newErrors
  }, [circle, rounds])

  const handleDateChange = (round: number, value: string) => {
    const date = parseLocalDatetimeLocal(value)
    setEditedSchedule((prev) =>
      prev.map((item) => (item.round === round ? { ...item, date } : item))
    )
    const newErrors = validateSchedule(
      editedSchedule.map((item) => (item.round === round ? { ...item, date } : item))
    )
    setErrors(newErrors)
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <Card className="border-l-4 border-l-aurora-violet">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Round Schedule Adjustment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Adjust round dates. Changes must respect grace periods ({circle.gracePeriodHours}h) and cannot
          affect rounds with confirmed contributions.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            {editedSchedule.map((item) => {
              const roundData = rounds.find((r) => r.roundNumber === item.round)
              const hasContributions = roundData && roundData.contributions.some((c) => c.status === "confirmed")
              const isPastOrCurrent = item.round <= (circle.currentRound ?? 0)
              const isDisabled = hasContributions || isPastOrCurrent

              return (
                <div
                  key={item.round}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    isDisabled && "opacity-50 bg-muted/30",
                    errors[item.round] && "border-red-300 dark:border-red-700"
                  )}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono font-bold text-muted-foreground w-14">
                      R{item.round}
                    </span>
                    <Input
                      type="datetime-local"
                      value={item.date.toISOString().slice(0, 16)}
                      onChange={(e) => handleDateChange(item.round, e.target.value)}
                      disabled={isDisabled}
                      className="w-48"
                      aria-label={`Round ${item.round} date`}
                    />
                    {isDisabled && (
                      <HelpCircle className="h-4 w-4 text-muted-foreground" aria-label={hasContributions ? "Has confirmed contributions" : "Current or past round"} />
                    )}
                  </div>
                  {errors[item.round] && (
                    <div className="flex items-center gap-1 text-xs text-red-500 ml-auto">
                      <AlertCircle className="h-3 w-3" />
                      {errors[item.round]}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => adjustScheduleMutation.mutate(editedSchedule)}
                disabled={hasErrors || adjustScheduleMutation.isPending}
              >
                {adjustScheduleMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            leftIcon={<Calendar className="h-4 w-4" />}
          >
            Adjust Schedule
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function getMinGapForFrequency(frequency: Frequency): number {
  switch (frequency) {
    case "daily":
      return 24
    case "weekly":
      return 168
    case "biweekly":
      return 336
    case "monthly":
      return 720
  }
}

export function ScheduleAdjustmentWrapper({ circleId }: { circleId: string }) {
  const { data: circle } = useCircle(circleId)
  const { data: rounds = [] } = useCircleRounds(circleId)
  const { user } = useAuth()

  if (!circle) return null

  const isOrganizer = user && circle.organizerId === user.id

  if (!isOrganizer) return null

  const initialSchedule: RoundScheduleItem[] = (() => {
    const startDate = circle.startDate ? new Date(circle.startDate) : new Date()
    const items: RoundScheduleItem[] = []

    for (let i = 0; i < circle.maxMembers; i++) {
      const roundNum = i + 1
      const date = i === 0 ? startDate : getNextDate(circle.frequency, items[i - 1].date)
      const completedRound = rounds.find((r) => r.roundNumber === roundNum)
      const isPastOrCurrent = roundNum <= circle.currentRound
      const hasContributions = completedRound && completedRound.contributions.some((c) => c.status === "confirmed")
      const gracePeriodEnd = addHours(date, circle.gracePeriodHours || 0)

      items.push({
        round: roundNum,
        date,
        isAdjustable: !isPastOrCurrent && !hasContributions,
        gracePeriodEnd,
        deadline: addHours(gracePeriodEnd, 24),
      })
    }

    return items
  })()

  return <ScheduleAdjustment circleId={circleId} initialSchedule={initialSchedule} onScheduleChange={() => {}} />
}