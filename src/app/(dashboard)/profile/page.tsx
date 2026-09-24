"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { User, Pencil, X, Save } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { patch, get, getErrorMessage } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { useTranslate } from "@/lib/locale/context"
import { ProfileHeaderCard } from "./components/profile-header-card"
import { ProfileStats } from "./components/profile-stats"
import { ProfileSavings } from "./components/profile-savings"
import { ProfileBioCard } from "./components/profile-bio-card"
import { ProfileSocialCard } from "./components/profile-social-card"

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

function SkeletonCard() {
  return (
    <div className="glass-premium rounded-2xl p-5 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded mb-3" />
      <div className="h-8 w-full bg-muted rounded" />
    </div>
  )
}

export default function ProfilePage() {
  const { t } = useTranslate()
  const { user, isLoading: authLoading } = useAuth()
  const addToast = useUIStore((s) => s.addToast)

  const { data: savingsSummary } = useQuery({
    queryKey: ["savings-summary"],
    queryFn: async () => {
      const res = await get<{ summary?: Record<string, unknown> }>("/savings/goals/summary")
      return (res as Record<string, unknown>)?.summary as Record<string, unknown> ?? null
    },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [bio, setBio] = useState((user as unknown as Record<string, string>)?.bio ?? "")
  const [twitterUrl, setTwitterUrl] = useState((user as unknown as Record<string, string>)?.twitterUrl ?? "")
  const [githubUrl, setGithubUrl] = useState((user as unknown as Record<string, string>)?.githubUrl ?? "")
  const [saving, setSaving] = useState(false)

  const handleCancel = useCallback(() => {
    setBio((user as unknown as Record<string, string>)?.bio ?? "")
    setTwitterUrl((user as unknown as Record<string, string>)?.twitterUrl ?? "")
    setGithubUrl((user as unknown as Record<string, string>)?.githubUrl ?? "")
    setIsEditing(false)
  }, [user])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await patch("/users/me", {
        bio: bio.trim() || undefined,
        twitterUrl: twitterUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
      })
      addToast({
        type: "success",
        title: t("profile.saved", "Saved!"),
        description: t("profile.savedDesc", "Your profile has been updated."),
      })
      setIsEditing(false)
    } catch (err) {
      const message = getErrorMessage(err)
      addToast({
        type: "error",
        title: t("profile.saveFailed", "Save failed"),
        description: message,
      })
    } finally {
      setSaving(false)
    }
  }, [bio, twitterUrl, githubUrl, addToast, t])

  const handleStartEdit = useCallback(() => {
    setBio((user as unknown as Record<string, string>)?.bio ?? "")
    setTwitterUrl((user as unknown as Record<string, string>)?.twitterUrl ?? "")
    setGithubUrl((user as unknown as Record<string, string>)?.githubUrl ?? "")
    setIsEditing(true)
  }, [user])

  if (authLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("profile.title", "Profile")} description={t("profile.publicProfile", "Your public profile.")} />
        <div className="mx-auto max-w-lg space-y-4">
          <div className="glass-premium rounded-2xl p-6 flex flex-col items-center gap-4 animate-pulse">
            <div className="h-24 w-24 rounded-full bg-muted" />
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-36 bg-muted rounded" />
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("profile.title", "Profile")} />
        <EmptyState
          icon={<User className="h-6 w-6" />}
          title={t("profile.noProfileData", "No profile data")}
          description={t("profile.noProfileDesc", "We could not load your profile. Please try again.")}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("profile.title", "Profile")}
        description={t("profile.desc", "Your public profile and personal information.")}
        action={
          <Button
            variant={isEditing ? "ghost" : "primary"}
            size="md"
            onClick={isEditing ? handleCancel : handleStartEdit}
            leftIcon={isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          >
            {isEditing ? t("profile.cancel", "Cancel") : t("profile.editProfile", "Edit Profile")}
          </Button>
        }
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-lg space-y-5"
      >
        <ProfileHeaderCard user={user} isEditing={isEditing} variants={item} />
        <ProfileStats variants={item} />
        <ProfileSavings savingsSummary={savingsSummary} variants={item} />
        <ProfileBioCard bio={bio} setBio={setBio} isEditing={isEditing} variants={item} />
        <ProfileSocialCard
          twitterUrl={twitterUrl}
          setTwitterUrl={setTwitterUrl}
          githubUrl={githubUrl}
          setGithubUrl={setGithubUrl}
          isEditing={isEditing}
          variants={item}
        />

        {isEditing && (
          <motion.div variants={item} className="flex justify-end gap-3">
            <Button
              variant="ghost"
              size="lg"
              onClick={handleCancel}
            >
              {t("profile.cancel", "Cancel")}
            </Button>
            <Button
              variant="premium"
              size="lg"
              onClick={handleSave}
              isLoading={saving}
              disabled={false}
              leftIcon={saving ? undefined : <Save className="h-4 w-4" />}
            >
              {saving ? t("profile.saving", "Saving...") : t("profile.saveChanges", "Save Changes")}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
