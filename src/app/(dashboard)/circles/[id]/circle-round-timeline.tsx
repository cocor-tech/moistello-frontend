"use client"

import { motion } from "framer-motion"
import { CircleCheck } from "lucide-react"
import { cn } from "@/lib/cn"
import type { Circle } from "@/types"

interface CircleRoundTimelineProps {
  circle: Circle
}

export function CircleRoundTimeline({ circle }: CircleRoundTimelineProps) {
  return (
    <div>
      <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white mb-4">
        Round Timeline
      </h3>
      <div className="glass rounded-2xl overflow-x-auto p-6">
        <div className="flex items-center gap-0 min-w-max">
          {Array.from({ length: circle.maxMembers }).map((_, i) => {
            const roundNum = i + 1
            const isCurrent = roundNum === circle.currentRound
            const isCompleted = roundNum < circle.currentRound
            const isUpcoming = roundNum > circle.currentRound

            return (
              <div key={roundNum} className="flex items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-heading font-semibold transition-all",
                      isCompleted && "gradient-bg-extended text-white shadow-lg",
                      isCurrent &&
                        "gradient-bg text-white animate-pulse-glow shadow-xl ring-4 ring-aurora-violet/30",
                      isUpcoming && "glass text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <CircleCheck className="h-5 w-5" /> : roundNum}
                  </motion.div>
                  <span className="mt-1.5 text-xs text-muted-foreground font-body">
                    {isCurrent ? "Current" : `R${roundNum}`}
                  </span>
                </div>
                {roundNum < circle.maxMembers && (
                  <div
                    className={cn(
                      "h-[2px] w-10 sm:w-16",
                      isCompleted
                        ? "bg-gradient-to-r from-emerald-500 to-aurora-cyan"
                        : isCurrent
                          ? "bg-gradient-to-r from-aurora-violet to-white/10"
                          : "bg-white/5 dark:bg-white/[0.06]",
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
