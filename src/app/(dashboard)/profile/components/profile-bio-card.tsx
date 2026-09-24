"use client"

import { motion } from "framer-motion"
import { User } from "lucide-react"
import { cn } from "@/lib/cn"
import { useTranslate } from "@/lib/locale/context"

interface ProfileBioCardProps {
  bio: string
  setBio: (val: string) => void
  isEditing: boolean
  variants?: any
}

export function ProfileBioCard({ bio, setBio, isEditing, variants }: ProfileBioCardProps) {
  const { t } = useTranslate()

  return (
    <motion.div variants={variants} className="glass-premium rounded-2xl p-5 space-y-3">
      <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
        <User className="h-4 w-4 text-aurora-violet" />
        {t("profile.bioTitle", "Bio")}
      </h3>

      {isEditing ? (
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={t("profile.bioPlaceholder", "Tell us about yourself...")}
          rows={4}
          maxLength={500}
          className={cn(
            "block w-full bg-transparent px-0 py-2 text-sm text-foreground",
            "placeholder:text-muted-foreground/50",
            "border-b-2 border-border",
            "transition-all duration-300 rounded-none",
            "focus:outline-none focus:border-b-aurora-violet focus:shadow-[0_0_12px_rgb(var(--aurora-violet)/0.1)]",
            "resize-none",
          )}
        />
      ) : (
        <p
          className={cn(
            "text-sm leading-relaxed",
            bio ? "text-foreground" : "text-muted-foreground italic",
          )}
        >
          {bio || t("profile.noBio", "No bio yet.")}
        </p>
      )}
    </motion.div>
  )
}
