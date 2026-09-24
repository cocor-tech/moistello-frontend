"use client"

import { motion } from "framer-motion"
import { CircleDot, Trophy, ArrowUpCircle } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

interface ProfileStatsProps {
  variants?: any
}

export function ProfileStats({ variants }: ProfileStatsProps) {
  const { t } = useTranslate()

  const stats = [
    { label: t("profile.circlesJoined", "Circles Joined"), value: "0", icon: CircleDot },
    { label: t("profile.circlesCompleted", "Circles Completed"), value: "0", icon: Trophy },
    { label: t("profile.totalContributed", "Total Contributed"), value: "$0", icon: ArrowUpCircle },
  ]

  return (
    <motion.div
      variants={variants}
      className="grid grid-cols-3 gap-3"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass rounded-2xl p-4 flex flex-col items-center gap-1.5 text-center"
        >
          <stat.icon className="h-4 w-4 text-aurora-violet" />
          <span className="font-heading text-xl font-bold gradient-text">
            {stat.value}
          </span>
          <span className="text-2xs text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </span>
        </div>
      ))}
    </motion.div>
  )
}
