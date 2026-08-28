"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useListMotion } from "@/lib/motion/list";
import { useReducedMotion } from "framer-motion";
import {
  DollarSign,
  Clock,
  Users,
  RotateCw,
  Hash,
  ChevronRight,
  Shield,
  Inbox,
  CheckCircle,
  UserPlus,
  Settings,
  Wallet,
  Copy,
  Check,
  Play,
  AlertCircle,
} from "lucide-react";
import {
  useCircle,
  useCircleMembers,
  useContribute,
  useJoinCircle,
  useStartCircle,
} from "@/hooks/use-circles";
import { useCirclePayouts } from "@/hooks/use-payouts";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import type { Payout } from "@/types";
import { CircleMembersPreview } from "./circle-members-preview";

const cardItem = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

function GlassStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardItem}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass rounded-2xl p-5 tilt-hover depth-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet/20 to-aurora-indigo/20">
          <span className="gradient-text">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-2xs tracking-wider uppercase text-muted-foreground font-body">
            {label}
          </p>
          <p className="font-heading text-xl font-bold text-foreground dark:text-white truncate">
            {value}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function CircleDetailPage() {
  const params = useParams();
  const circleId = params.id as string;

  const { user } = useAuth();
  const { data: circle, isLoading, isError } = useCircle(circleId);
  const { data: members = [] } = useCircleMembers(circleId);
  const {
    data: payoutData,
    isLoading: payoutsLoading,
    isError: payoutsError,
  } = useCirclePayouts(circleId, { limit: 5 });
  const contribute = useContribute(circleId);
  const joinCircle = useJoinCircle();
  const startCircle = useStartCircle();
  const addToast = useUIStore((s) => s.addToast);

  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeValue, setJoinCodeValue] = useState("");
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);

  const isOrganizer = user?.id === circle?.organizerId;
  const isMember = members.some((m) => m.userId === user?.id);
  const recentPayouts = payoutData?.payouts ?? [];
  const canJoin =
    circle &&
    !isMember &&
    (circle.status === "pending" || circle.status === "active");
  const canContribute = isMember && circle?.status === "active";

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoinError(null);
    try {
      await joinCircle.mutateAsync({ circleId });
      setJoinLoading(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (err instanceof Error ? err.message : "Failed to join circle");
      setJoinError(msg);
      setJoinLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCodeValue.trim()) return;
    setJoinCodeLoading(true);
    setJoinCodeError(null);
    try {
      await joinCircle.mutateAsync({
        circleId,
        payload: { inviteCode: joinCodeValue.trim() } as Record<
          string,
          unknown
        >,
      });
      setShowJoinCodeModal(false);
      setJoinCodeValue("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (err instanceof Error ? err.message : "Invalid invite code");
      setJoinCodeError(msg);
    } finally {
      setJoinCodeLoading(false);
    }
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    setShowInviteModal(true);
    try {
      const { post } = await import("@/lib/api-client");
      const res = await post<Record<string, unknown>>(
        `/circles/${circleId}/invites`,
        { maxUses: 10, ttlHours: 24 },
      );
      const body = (res?.data as Record<string, unknown>) ?? res;
      const inv = (body?.invite as Record<string, unknown>) ?? body;
      const code = String(inv?.code ?? "");
      setInviteCode(code);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ??
        (err instanceof Error ? err.message : "Failed to generate invite code");
      setInviteError(msg);
      setInviteCode("error-generating-code");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    const success = await copyToClipboard(inviteCode);
    if (success) {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const freqLabel = circle
    ? circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)
    : "";

  const overviewCards = useMemo(() => {
    if (!circle) return [];
    return [
      {
        label: "Contribution",
        value: formatCurrency(circle.contributionAmount, circle.currency),
        icon: <DollarSign className="h-4 w-4" />,
      },
      {
        label: "Frequency",
        value: freqLabel,
        icon: <Clock className="h-4 w-4" />,
      },
      {
        label: "Payout Type",
        value:
          circle.payoutType.charAt(0).toUpperCase() +
          circle.payoutType.slice(1),
        icon: <Shield className="h-4 w-4" />,
      },
      {
        label: "Members",
        value: `${circle.memberCount ?? members.length}/${circle.maxMembers}`,
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: "Current Round",
        value: `Round ${circle.currentRound}/${circle.maxMembers}`,
        icon: <RotateCw className="h-4 w-4" />,
      },
      {
        label: "Your Position",
        value: isMember
          ? `#${members.find((m) => m.userId === user?.id)?.position ?? "—"}`
          : "Not a member",
        icon: <Hash className="h-4 w-4" />,
      },
    ];
  }, [circle, freqLabel, members, isMember, user]);
  const { shouldReduce: overviewShouldReduce, variants: overviewVariants } =
    useListMotion(overviewCards.length);
  const overviewReducedMotion = useReducedMotion();

  const handleContribute = () => {
    if (!circle) return;
    contribute.mutate(
      { amount: circle.contributionAmount },
      { onSuccess: () => setShowContributeModal(false) },
    );
  };
      {
        onSuccess: () => setShowContributeModal(false),
        // onError is intentionally omitted here — the error toast is already
        // shown by useContribute's onError handler, and we deliberately keep
        // the modal open so the user can retry without losing their context.
      },
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title=""
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "..." },
          ]}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton variant="card" className="h-32 rounded-2xl" />
        <Skeleton variant="card" className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError || !circle) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Circle Not Found"
          breadcrumbs={[
            { label: "Circles", href: "/circles" },
            { label: "Not Found" },
          ]}
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-flagship rounded-2xl flex flex-col items-center justify-center py-20 holo-border"
        >
          <Inbox className="mb-4 h-14 w-14 text-muted-foreground" />
          <p className="font-heading text-xl font-semibold text-foreground dark:text-white">
            Circle not found
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The circle you are looking for does not exist or has been removed.
          </p>
          <Link href="/circles" className="mt-6">
            <Button variant="primary">Back to Circles</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={circle.name}
        description={circle.description ?? undefined}
        breadcrumbs={[
          { label: "Circles", href: "/circles" },
          { label: circle.name },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Badge
              variant={
                circle.status === "active"
                  ? "success"
                  : circle.status === "pending"
                    ? "warning"
                    : "default"
              }
            >
              {circle.status}
            </Badge>
            {isOrganizer && (
              <Link href={`/circles/${circleId}/settings`}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Settings className="h-4 w-4" />}
                >
                  Manage
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 pb-2">
        {[
          {
            href: `/circles/${circleId}/activity`,
            label: "Activity",
            icon: "Activity",
          },
          {
            href: `/circles/${circleId}/analytics`,
            label: "Analytics",
            icon: "BarChart3",
          },
          {
            href: `/circles/${circleId}/schedule`,
            label: "Schedule",
            icon: "Calendar",
          },
          {
            href: `/circles/${circleId}/comments`,
            label: "Comments",
            icon: "MessageSquare",
          },
          {
            href: `/circles/${circleId}/members`,
            label: "Members",
            icon: "Users",
          },
          {
            href: `/circles/${circleId}/rounds`,
            label: "Rounds",
            icon: "RotateCw",
          },
          {
            href: `/circles/${circleId}/export`,
            label: "Export",
            icon: "Download",
          },
          ...(isOrganizer
            ? [
                {
                  href: `/circles/${circleId}/settings`,
                  label: "Settings",
                  icon: "Settings",
                },
              ]
            : []),
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-body font-medium glass-whisper text-muted-foreground hover:text-foreground hover:glass-premium transition-all"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <motion.div
        variants={overviewVariants}
        initial={overviewShouldReduce ? undefined : "hidden"}
        animate={overviewShouldReduce ? undefined : "show"}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {overviewCards.map((card) => (
          <GlassStatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </motion.div>

      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white mb-4">
          Round Timeline
        </h3>
        <div className="glass rounded-2xl overflow-x-auto p-6">
          <div className="flex items-center gap-0 min-w-max">
            {Array.from({ length: circle.maxMembers }).map((_, i) => {
              const roundNum = i + 1;
              const isCurrent = roundNum === circle.currentRound;
              const isCompleted = roundNum < circle.currentRound;
              const isUpcoming = roundNum > circle.currentRound;

              return (
                <div key={roundNum} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      whileHover={{ scale: 1.15 }}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-heading font-semibold transition-all",
                        isCompleted &&
                          "gradient-bg-extended text-white shadow-lg",
                        isCurrent &&
                          "gradient-bg text-white animate-pulse-glow shadow-xl ring-4 ring-aurora-violet/30",
                        isUpcoming && "glass text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        roundNum
                      )}
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
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canContribute && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Wallet className="h-5 w-5" />}
              onClick={() => setShowContributeModal(true)}
              className="h-14 w-full md:w-auto holo-glow"
            >
              Contribute{" "}
              {formatCurrency(circle.contributionAmount, circle.currency)}
            </Button>
          </motion.div>
        )}
        {canJoin && circle?.circleType === "private" && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<UserPlus className="h-5 w-5" />}
              onClick={() => setShowJoinCodeModal(true)}
            >
              Join with Invite Code
            </Button>
          </motion.div>
        )}
        {canJoin && circle && circle.circleType !== "private" && (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<UserPlus className="h-5 w-5" />}
              onClick={handleJoin}
              isLoading={joinLoading}
            >
              Join Circle
            </Button>
          </motion.div>
        )}
        {isOrganizer && circle.status === "pending" && members.length >= 2 && (
          <Button
            variant="premium"
            size="lg"
            leftIcon={<Play className="h-5 w-5" />}
            onClick={() =>
              startCircle.mutate(circleId, {
                onSuccess: () =>
                  addToast({
                    type: "success",
                    title: "Rounds started!",
                    description: "Your circle is now active.",
                  }),
                onError: (err) => {
                  const m =
                    (err as { response?: { data?: { error?: string } } })
                      ?.response?.data?.error ??
                    (err instanceof Error ? err.message : "Failed to start");
                  addToast({
                    type: "error",
                    title: "Failed to start",
                    description: m,
                  });
                },
              })
            }
            isLoading={startCircle.isPending}
          >
            Start Rounds
          </Button>
        )}
        {isOrganizer && (
          <Button
            variant="outline"
            size="lg"
            leftIcon={<UserPlus className="h-5 w-5" />}
            onClick={handleGenerateInvite}
            isLoading={inviteLoading}
          >
            Invite Members
          </Button>
        )}

        {joinError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {joinError}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
            Members
          </h3>
          <Link
            href={`/circles/${circleId}/members`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-body"
          >
            View All ({members.length}) <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <CircleMembersPreview members={members} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white">
            Recent Payouts
          </h3>
          <Link
            href={`/circles/${circleId}/rounds`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-body"
          >
            View Rounds <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {payoutsLoading ? (
          <div className="glass rounded-2xl overflow-hidden divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="space-y-2">
                  <Skeleton variant="text" width="180px" />
                  <Skeleton variant="text" width="120px" />
                </div>
                <Skeleton variant="text" width="110px" />
              </div>
            ))}
          </div>
        ) : payoutsError ? (
          <EmptyState
            icon={<AlertCircle className="h-6 w-6" />}
            title="Failed to load payouts"
            description="The recent payout history could not be loaded right now."
          />
        ) : recentPayouts.length === 0 ? (
          <div className="glass rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No payouts yet. The first round is still active.
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {recentPayouts.map((payout: Payout, i: number) => (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-5 py-4 hover:glass-whisper transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground dark:text-white font-heading">
                        Round {payout.roundNumber} Payout
                      </p>
                      <p className="text-2xs text-muted-foreground">
                        {formatDate(payout.createdAt)}
                      </p>
                    </div>
                  </div>
                  <span className="gradient-text text-sm font-bold font-heading">
                    {formatCurrency(payout.amount, circle.currency)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        title="Confirm Contribution"
        description={`Contribute to ${circle.name}`}
        size="sm"
        footer={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowContributeModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleContribute}
              isLoading={contribute.isPending}
            >
              Confirm &amp; Sign
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-body">
              Amount
            </span>
            <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
              {formatCurrency(circle.contributionAmount, circle.currency)}
            </span>
          </div>
          <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-body">
              Circle
            </span>
            <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
              {circle.name}
            </span>
          </div>
          <div className="glass-whisper rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-body">
              Round
            </span>
            <span className="text-sm font-heading font-semibold text-foreground dark:text-white">
              {circle.currentRound}
            </span>
          </div>
          <p className="text-2xs text-muted-foreground">
            This will open your connected wallet for transaction signing.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteCode("");
        }}
        title="Invite Members"
        description="Share this code with people you want to invite."
        size="sm"
      >
        <div className="space-y-4">
          <div className="glass-whisper rounded-xl p-4 text-center">
            <p className="font-mono text-2xl font-bold tracking-widest gradient-text">
              {inviteCode || (
                <span className="inline-flex gap-1">
                  Generating
                  <span className="animate-bounce [animation-delay:0ms]">
                    .
                  </span>
                  <span className="animate-bounce [animation-delay:200ms]">
                    .
                  </span>
                  <span className="animate-bounce [animation-delay:400ms]">
                    .
                  </span>
                </span>
              )}
            </p>
          </div>
          {inviteCode && inviteCode !== "error-generating-code" && (
            <Button
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={
                inviteCopied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )
              }
              onClick={handleCopyInvite}
            >
              {inviteCopied ? "Copied!" : "Copy Code"}
            </Button>
          )}
          {inviteCode === "error-generating-code" && (
            <p className="text-sm text-red-400 text-center">
              {inviteError || "Failed to generate invite code. Try again."}
            </p>
          )}
          {inviteCode && (
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => {
                setShowInviteModal(false);
                setInviteCode("");
              }}
            >
              Close
            </Button>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showJoinCodeModal}
        onClose={() => {
          setShowJoinCodeModal(false);
          setJoinCodeValue("");
          setJoinCodeError(null);
        }}
        title="Enter Invite Code"
        description="This circle is private. Enter an invite code to join."
        size="sm"
      >
        <div className="space-y-4">
          <input
            value={joinCodeValue}
            onChange={(e) => setJoinCodeValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinWithCode()}
            placeholder="Paste invite code here..."
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono text-center text-lg tracking-widest"
          />
          {joinCodeError && (
            <p className="text-sm text-red-400 text-center">{joinCodeError}</p>
          )}
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleJoinWithCode}
            isLoading={joinCodeLoading}
            disabled={!joinCodeValue.trim()}
          >
            Join Circle
          </Button>
        </div>
      </Modal>
    </div>
  );
}
