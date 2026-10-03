"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Clock, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/stores/ui-store"
import {
  describeInviteProblem,
  formatTimeRemaining,
  inviteStatus,
  msUntilExpiry,
  type InviteStatus,
} from "@/lib/invite-expiry"

interface InvitePreview {
  code: string
  circleId: string
  circleName?: string
  expiresAt?: string | null
  useCount: number
  maxUses: number
}

type State =
  | { phase: "loading" }
  | { phase: "ready"; invite: InvitePreview; status: InviteStatus; msRemaining: number }
  | { phase: "unavailable"; status: InviteStatus }

/**
 * Public landing page for a circle invite link.
 *
 * `Routes.INVITE` has always resolved to `/invite/<code>`, but no such route
 * existed, so every shareable link a creator generated 404'd. This is that page.
 *
 * It is intentionally usable without a wallet: the acceptance criterion is that
 * a **non-member** can open the link, so the page has to render for a signed-out
 * visitor and only require a connection at the point of joining.
 */
export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const addToast = useUIStore((state) => state.addToast)
  const [state, setState] = useState<State>({ phase: "loading" })
  const [isJoining, setIsJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { get } = await import("@/lib/api-client")
        const res = await get<{ invite?: InvitePreview } | InvitePreview>(
          `/circles/invites/${code}`,
        )
        if (cancelled) return
        const invite =
          res && typeof res === "object" && "invite" in res
            ? (res as { invite?: InvitePreview }).invite
            : (res as InvitePreview | undefined)

        if (!invite?.code) {
          setState({ phase: "unavailable", status: "expired" })
          return
        }

        const status = inviteStatus(invite)
        setState({
          phase: "ready",
          invite,
          status,
          msRemaining: msUntilExpiry(invite.expiresAt ?? null),
        })
      } catch {
        if (!cancelled) setState({ phase: "unavailable", status: "expired" })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [code])

  // `status` is only present on the loaded variants of the union, so it is
  // derived here for the effect dependency rather than read straight off `state`.
  const readyStatus: InviteStatus | null = state.phase === "ready" ? state.status : null

  // Keep the countdown honest while the page is open rather than freezing at the
  // value computed on mount.
  useEffect(() => {
    if (readyStatus !== "active") return
    const id = setInterval(() => {
      setState((prev) =>
        prev.phase === "ready"
          ? { ...prev, msRemaining: msUntilExpiry(prev.invite.expiresAt ?? null) }
          : prev,
      )
    }, 1_000)
    return () => clearInterval(id)
  }, [readyStatus])

  const handleJoin = async () => {
    if (state.phase !== "ready" || state.status !== "active") return
    setIsJoining(true)
    try {
      const { post } = await import("@/lib/api-client")
      await post(`/circles/${state.invite.circleId}/join`, { inviteCode: state.invite.code })
      setJoined(true)
      addToast({ type: "success", title: "You joined the circle" })
      router.push(`/circles/${state.invite.circleId}`)
    } catch (error) {
      addToast({
        type: "error",
        title: "Could not join the circle",
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsJoining(false)
    }
  }

  if (state.phase === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking this invite…</p>
      </main>
    )
  }

  if (state.phase === "unavailable") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div
          className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-4"
          role="alert"
          data-testid="invite-unavailable"
        >
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h1 className="font-heading text-xl font-bold text-foreground">Invite expired</h1>
          {/* A specific reason, not a generic failure — a recipient needs to know
              whether to ask for a new link or to wait. */}
          <p className="text-sm text-muted-foreground">{describeInviteProblem(state.status)}</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to home
          </Button>
        </div>
      </main>
    )
  }

  const { invite, status, msRemaining } = state

  if (status !== "active") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6">
        <div
          className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-4"
          role="alert"
          data-testid="invite-unavailable"
        >
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h1 className="font-heading text-xl font-bold text-foreground">
            {status === "exhausted" ? "Invite already used" : "Invite expired"}
          </h1>
          <p className="text-sm text-muted-foreground">{describeInviteProblem(status)}</p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Go to home
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div
        className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-5 text-center"
        data-testid="invite-valid"
      >
        <Users className="h-10 w-10 text-aurora-violet mx-auto" />
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            You have been invited
          </p>
          <h1 className="font-heading text-2xl font-bold text-foreground mt-1">
            {invite.circleName ?? "a Moistello circle"}
          </h1>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span data-testid="invite-countdown">
            Expires in {formatTimeRemaining(msRemaining)}
          </span>
        </div>

        {joined ? (
          <div className="flex items-center justify-center gap-2 text-success" data-testid="invite-joined">
            <CheckCircle2 className="h-5 w-5" />
            <span>You joined the circle</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleJoin}
            isLoading={isJoining}
            disabled={isJoining || status !== "active"}
            data-testid="invite-join-button"
          >
            Join circle
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          Invite code <span className="font-mono">{invite.code}</span>
        </p>
      </div>
    </main>
  )
}
