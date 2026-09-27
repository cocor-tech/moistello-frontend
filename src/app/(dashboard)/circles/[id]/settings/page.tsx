"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Settings,
  AlertTriangle,
  Link2,
  Trash2,
  Shield,
  Inbox,
  Plus,
  Users,
  Clock,
} from "lucide-react"
import { useCircle } from "@/hooks/use-circles"
import { useAuth } from "@/hooks/use-auth"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CopyButton } from "@/components/shared/copy-button"
import { del, patch, post } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import type { Invite } from "@/types"

export default function CircleSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const circleId = params.id as string

  const { user } = useAuth()
  const { data: circle, isLoading, isError } = useCircle(circleId)
  const addToast = useUIStore((s) => s.addToast)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleting, setDeleting] = useState(false)

  const [inviteMaxUses, setInviteMaxUses] = useState(5)
  const [inviteExpiration, setInviteExpiration] = useState("")
  const [, setInviteError] = useState("")
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [generatedCode, setGeneratedCode] = useState("")
  const [existingInvites, setExistingInvites] = useState<Invite[]>([])

  useEffect(() => {
    if (circle) {
      setName(circle.name)
      setDescription(circle.description ?? "")
    }
  }, [circle])

  const isOrganizer = circle?.organizerId === user?.id

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await patch(`/circles/${circleId}`, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ["circle", circleId] })
      addToast({
        type: "success",
        title: "Settings saved",
        description: "Circle details were updated successfully.",
      })
    } catch (e) {
      logger.error("[circle-settings] Failed to save circle settings:", e)
      addToast({
        type: "error",
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not save circle settings.",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true)
    try {
      const ttlHours = inviteExpiration
        ? Math.max(1, Math.round((new Date(inviteExpiration).getTime() - Date.now()) / 3600000))
        : 168
      const res = await post(`/circles/${circleId}/invites`, {
        maxUses: inviteMaxUses,
        ttlHours,
      })
      const envelope = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res as Record<string, unknown>
      const invite = (envelope?.invite ?? envelope) as Record<string, unknown>
      const code = String(invite?.code ?? "")
      if (code) {
        setGeneratedCode(code)
        setExistingInvites((prev) => [invite as unknown as Invite, ...prev])
        setInviteError("")
        addToast({
          type: "success",
          title: "Invite generated",
          description: "A new invite code is ready to share.",
        })
      } else {
        throw new Error("Invite code was not returned by the API.")
      }
    } catch (e) {
      logger.error("[circle-settings] Failed to generate invite:", e)
      const message = e instanceof Error ? e.message : "Could not generate invite code."
      setInviteError(message)
      addToast({
        type: "error",
        title: "Invite failed",
        description: message,
      })
    } finally {
      setGeneratingInvite(false)
    }
  }

  const handleDeleteCircle = async () => {
    setDeleting(true)
    try {
      await del(`/circles/${circleId}`)
      addToast({
        type: "success",
        title: "Circle cancelled",
        description: "The circle has been removed.",
      })
      router.push("/circles")
    } catch (e) {
      logger.error("[circle-settings] Failed to delete circle:", e)
      addToast({
        type: "error",
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete the circle.",
      })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Circle", href: `/circles/${circleId}` },
            { label: "Settings" },
          ]}
        />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" className="h-48 rounded-2xl" />
        ))}
      </div>
    )
  }

  if (isError || !circle) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: "Settings" }]}
        />
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Circle not found"
          description="Unable to load circle settings."
        />
      </div>
    )
  }

  if (!isOrganizer) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: circle.name, href: `/circles/${circleId}` },
            { label: "Settings" },
          ]}
          action={
            <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Circle
              </ButtonLink>
          }
        />
        <div className="glass-flagship rounded-2xl flex flex-col items-center justify-center py-20 holo-border"
        >
          <Shield className="mb-4 h-14 w-14 text-muted-foreground" />
          <p className="font-heading text-xl font-semibold text-foreground dark:text-white">
            Unauthorized
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the circle organizer can access settings.
          </p>
          <ButtonLink href={`/circles/${circleId}`} className="mt-6"  variant="primary">Back to Circle</ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your circle configuration"
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: circle.name, href: `/circles/${circleId}` },
          { label: "Settings" },
        ]}
        action={
          <ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Circle
            </ButtonLink>
        }
      />

      <div className="space-y-6">
        <div className="glass-premium rounded-2xl p-6 space-y-4 holo-border">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-5 w-5 gradient-text" />
            <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
              General Settings
            </h3>
          </div>
          <Input
            label="Circle Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Circle name"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of your circle"
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveSettings}
              isLoading={saving}
            >
              Save Changes
            </Button>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-5 w-5 gradient-text" />
            <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
              Invites
            </h3>
          </div>

          <p className="text-sm text-muted-foreground font-body">
            Generate invite codes to share with people you want to join this circle.
          </p>

          {generatedCode && (
            <div className="glass-whisper rounded-xl p-4 space-y-3">
              <label htmlFor="generated-invite-code" className="text-2xs tracking-wider uppercase text-muted-foreground font-heading">
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <Input id="generated-invite-code" aria-label="Generated invite code" value={generatedCode} readOnly leftIcon={<Link2 className="h-4 w-4" />} />
                <CopyButton text={generatedCode} />
              </div>
            </div>
          )}

          <div className="glass-whisper rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Max Uses"
                type="number"
                min={1}
                max={100}
                value={String(inviteMaxUses)}
                onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                leftIcon={<Users className="h-4 w-4" />}
              />
              <Input
                label="Expiration (optional)"
                type="date"
                value={inviteExpiration}
                onChange={(e) => setInviteExpiration(e.target.value)}
                leftIcon={<Clock className="h-4 w-4" />}
                hint="Leave empty for no expiration"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerateInvite}
              isLoading={generatingInvite}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Generate New Invite
            </Button>
          </div>

          {existingInvites.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-heading font-medium text-muted-foreground">
                Existing Invites ({existingInvites.length})
              </h4>
              <div className="glass-whisper rounded-xl divide-y divide-border">
                {existingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground dark:text-white">
                          {inv.code}
                        </span>
                        <CopyButton text={inv.code} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.useCount}/{inv.maxUses} uses
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 space-y-4" style={{ borderColor: "rgb(239 68 68 / 0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="font-heading text-lg font-semibold text-red-400">
              Danger Zone
            </h3>
          </div>

          <p className="text-sm text-muted-foreground font-body">
            Deleting this circle is permanent. All active rounds will be terminated and
            remaining contributions may be refunded. This action cannot be undone.
          </p>

          <div>
            <p className="block text-xs font-medium text-muted-foreground mb-1.5">
              Type the circle name to confirm deletion
            </p>
            <div className="flex gap-2">
              <Input
                label="Circle name confirmation"
                placeholder={circle?.name ?? "Circle name"}
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="md"
                leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={handleDeleteCircle}
                isLoading={deleting}
                disabled={deleteConfirm !== circle?.name}
                className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40"
              >
                Delete Circle
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
