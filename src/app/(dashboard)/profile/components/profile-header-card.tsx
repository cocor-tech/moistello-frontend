"use client"

import { motion } from "framer-motion"
import { Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatAddress, formatDate } from "@/lib/formatters"
import { useTranslate } from "@/lib/locale/context"
import type { User as UserType } from "@/types"

interface ProfileHeaderCardProps {
  user: UserType
  isEditing: boolean
  variants?: any
}

export function ProfileHeaderCard({ user, isEditing, variants }: ProfileHeaderCardProps) {
  const { t } = useTranslate()

  const avatarInitial = user.displayName?.charAt(0)?.toUpperCase()
    ?? user.walletAddress?.slice(0, 2)?.toUpperCase()
    ?? "U"

  return (
    <motion.div
      variants={variants}
      className="glass-premium rounded-2xl p-6 flex flex-col items-center gap-4"
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full gradient-bg text-white font-mono text-3xl font-bold shrink-0 shadow-lg">
        {avatarInitial}
      </div>

      {isEditing ? (
        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-heading tracking-wider uppercase text-muted-foreground">
              {t("profile.displayName", "Display Name")}
            </label>
            <p className="font-heading text-xl font-semibold text-foreground text-center">
              {user.displayName || t("account.anonymous", "Anonymous")}
            </p>
            <p className="text-2xs text-muted-foreground text-center mt-1">
              {t("profile.displayNameHint", "Your unique anonymous name. Cannot be changed.")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-bold gradient-text-extended text-center">
            {user.displayName ?? t("common.unnamedUser", "Unnamed User")}
          </h1>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <span className="font-mono text-sm text-muted-foreground">
              {formatAddress(user.walletAddress)}
            </span>
            <Badge variant="premium" size="sm">
              MoiScore {user.moiScore}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {t("profile.joinedDate", "Joined {date}").replace("{date}", formatDate(user.createdAt))}
          </div>
        </>
      )}
    </motion.div>
  )
}
