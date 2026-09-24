"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Inbox,
  UserPlus,
  Settings,
  Wallet,
  Play,
  ChevronRight,
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
import { Button, ButtonLink } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { CircleMembersPreview } from "./circle-members-preview";
import { CircleStatCards } from "./circle-stat-cards";
import { CircleRoundTimeline } from "./circle-round-timeline";
import { CirclePayoutsList } from "./circle-payouts-list";
import { CircleContributeModal } from "./circle-contribute-modal";
import { CircleInviteModal } from "./circle-invite-modal";
import { CircleJoinCodeModal } from "./circle-join-code-modal";
import { useInviteGeneration } from "./use-invite-generation";

const CIRCLE_SUB_NAV = (circleId: string, isOrganizer: boolean) => [
  { href: `/circles/${circleId}/activity`, label: "Activity" },
  { href: `/circles/${circleId}/analytics`, label: "Analytics" },
  { href: `/circles/${circleId}/schedule`, label: "Schedule" },
  { href: `/circles/${circleId}/comments`, label: "Comments" },
  { href: `/circles/${circleId}/members`, label: "Members" },
  { href: `/circles/${circleId}/rounds`, label: "Rounds" },
  { href: `/circles/${circleId}/export`, label: "Export" },
  ...(isOrganizer
    ? [{ href: `/circles/${circleId}/settings`, label: "Settings" }]
    : []),
];

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
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [showJoinCodeModal, setShowJoinCodeModal] = useState(false);
  const [joinCodeValue, setJoinCodeValue] = useState("");
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null);

  const invite = useInviteGeneration(circleId);

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

  const handleContribute = () => {
    if (!circle) return;
    contribute.mutate(
      { amount: circle.contributionAmount },
      { onSuccess: () => setShowContributeModal(false) },
    );
  };

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
          <ButtonLink href="/circles" className="mt-6"  variant="primary">Back to Circles</ButtonLink>
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
              <ButtonLink href={`/circles/${circleId}/settings`}
                  variant="outline"
                  size="sm"
                  leftIcon={<Settings className="h-4 w-4" />}
                >
                  Manage
                </ButtonLink>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 pb-2">
        {CIRCLE_SUB_NAV(circleId, isOrganizer).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-body font-medium glass-whisper text-muted-foreground hover:text-foreground hover:glass-premium transition-all"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <CircleStatCards
        circle={circle}
        members={members}
        isMember={isMember}
        currentUserId={user?.id}
      />

      <CircleRoundTimeline circle={circle} />

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
            onClick={invite.generate}
            isLoading={invite.isLoading}
          >
            Invite Members
          </Button>
        )}

        {joinError && (
          <div role="alert" aria-live="assertive" className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
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

      <CirclePayoutsList
        circle={circle}
        circleId={circleId}
        payouts={recentPayouts}
        isLoading={payoutsLoading}
        isError={payoutsError}
      />

      <CircleContributeModal
        circle={circle}
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        onConfirm={handleContribute}
        isSubmitting={contribute.isPending}
      />

      <CircleInviteModal
        isOpen={invite.isOpen}
        onClose={invite.close}
        code={invite.code}
        copied={invite.copied}
        isError={invite.isError}
        error={invite.error}
        onCopy={invite.copy}
      />

      <CircleJoinCodeModal
        isOpen={showJoinCodeModal}
        onClose={() => {
          setShowJoinCodeModal(false);
          setJoinCodeValue("");
          setJoinCodeError(null);
        }}
        value={joinCodeValue}
        onChange={setJoinCodeValue}
        onSubmit={handleJoinWithCode}
        isLoading={joinCodeLoading}
        error={joinCodeError}
      />
    </div>
  );
}
