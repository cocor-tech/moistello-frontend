"use client"

import { motion } from "framer-motion"
import { Globe, Link as LinkIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslate } from "@/lib/locale/context"

interface ProfileSocialCardProps {
  twitterUrl: string
  setTwitterUrl: (val: string) => void
  githubUrl: string
  setGithubUrl: (val: string) => void
  isEditing: boolean
  variants?: any
}

export function ProfileSocialCard({
  twitterUrl,
  setTwitterUrl,
  githubUrl,
  setGithubUrl,
  isEditing,
  variants,
}: ProfileSocialCardProps) {
  const { t } = useTranslate()

  return (
    <motion.div variants={variants} className="glass-premium rounded-2xl p-5 space-y-3">
      <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-aurora-violet" />
        {t("profile.socialLinks", "Social Links")}
      </h3>

      {isEditing ? (
        <div className="space-y-4">
          <Input
            label={t("profile.twitterUrl", "Twitter URL")}
            placeholder="https://twitter.com/yourhandle"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            leftIcon={<Globe className="h-4 w-4" />}
          />
          <Input
            label={t("profile.githubUrl", "GitHub URL")}
            placeholder="https://github.com/yourhandle"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            leftIcon={<Globe className="h-4 w-4" />}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            {twitterUrl ? (
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aurora-violet hover:underline truncate"
              >
                {twitterUrl}
              </a>
            ) : (
              <span className="text-muted-foreground italic">
                {t("profile.noTwitter", "No Twitter link")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aurora-violet hover:underline truncate"
              >
                {githubUrl}
              </a>
            ) : (
              <span className="text-muted-foreground italic">
                {t("profile.noGithub", "No GitHub link")}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
