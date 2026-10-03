"use client"

import { formatCurrency, formatDate } from "@/lib/formatters"
import type { Circle } from "@/types"
import {
  PrintEmptyRow,
  PrintHead,
  PrintSection,
  PrintStat,
  PrintTable,
  PrintTd,
  PrintTh,
  PrintTr,
} from "./print-primitives"
import type { MemberBalance } from "./print-summary"

const MEMBER_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  pending: "Pending",
  invited: "Invited",
  defaulter: "Defaulter",
  left: "Left",
  removed: "Removed",
}

/** One-line summary of the circle's terms, for the header block. */
export function PrintCircleTerms({ circle }: { circle: Circle }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <PrintStat label="Contribution" value={formatCurrency(circle.contributionAmount, circle.currency)} />
      <PrintStat
        label="Frequency"
        value={circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1)}
      />
      <PrintStat
        label="Payout type"
        value={circle.payoutType.charAt(0).toUpperCase() + circle.payoutType.slice(1)}
      />
      <PrintStat label="Members" value={`${circle.memberCount ?? 0} / ${circle.maxMembers}`} />
      <PrintStat label="Current round" value={`Round ${circle.currentRound}`} />
      <PrintStat label="Total rounds" value={String(circle.maxMembers)} />
      <PrintStat label="Late fee" value={`${circle.lateFeePercent}%`} />
      <PrintStat label="Collateral" value={`${circle.collateralPercent}%`} />
    </dl>
  )
}

/**
 * Members table: the printed record the organizer marks up during a meeting.
 *
 * Columns are deliberately narrow and monospaced where they carry values to
 * copy by hand (addresses, amounts) so a row stays on one line at A4 width.
 */
export function PrintMembersTable({ members }: { members: MemberBalance[] }) {
  return (
    <PrintSection title="Members">
      <PrintTable caption="Circle members with position, status and contribution history">
        <PrintHead>
          <PrintTh>#</PrintTh>
          <PrintTh>Member</PrintTh>
          <PrintTh>Address</PrintTh>
          <PrintTh>Status</PrintTh>
          <PrintTh align="right">Paid (rounds)</PrintTh>
          <PrintTh align="right">Contributed</PrintTh>
          <PrintTh align="right">Received</PrintTh>
          <PrintTh align="right">Owing</PrintTh>
        </PrintHead>
        <tbody>
          {members.length === 0 ? (
            <PrintEmptyRow colSpan={8}>No members have joined this circle yet.</PrintEmptyRow>
          ) : (
            members.map((member) => (
              <PrintTr key={member.userId}>
                <PrintTd mono>{member.position}</PrintTd>
                <PrintTd>{member.displayName}</PrintTd>
                <PrintTd mono>{member.userAddress ? shortenAddress(member.userAddress) : "—"}</PrintTd>
                <PrintTd>{MEMBER_STATUS_LABEL[member.status] ?? member.status}</PrintTd>
                <PrintTd align="right" mono>
                  {member.roundsContributed}
                </PrintTd>
                <PrintTd align="right" mono>
                  {member.totalContributed}
                </PrintTd>
                <PrintTd align="right" mono>
                  {member.totalReceived}
                </PrintTd>
                <PrintTd align="right" mono>
                  {member.outstandingRounds}
                </PrintTd>
              </PrintTr>
            ))
          )}
        </tbody>
      </PrintTable>
    </PrintSection>
  )
}

/** Rounds table: collection progress and who was paid, per round. */
export function PrintRoundsTable({
  rounds,
  currency,
}: {
  rounds: ReturnType<typeof import("./print-summary").buildRoundSummaries>
  currency: string
}) {
  return (
    // Each section starts a fresh sheet, so a long members table can never
    // leave the rounds table half-written across a page boundary.
    <PrintSection title="Rounds" pageBreakBefore>
      <PrintTable caption="Per-round collection progress and payouts">
        <PrintHead>
          <PrintTh>Round</PrintTh>
          <PrintTh>State</PrintTh>
          <PrintTh align="right">Settled</PrintTh>
          <PrintTh align="right">Collected</PrintTh>
          <PrintTh align="right">Expected</PrintTh>
          <PrintTh align="right">Missing</PrintTh>
          <PrintTh>Payout to</PrintTh>
          <PrintTh align="right">Payout</PrintTh>
        </PrintHead>
        <tbody>
          {rounds.length === 0 ? (
            <PrintEmptyRow colSpan={8}>No rounds have been generated yet.</PrintEmptyRow>
          ) : (
            rounds.map((round) => (
              <PrintTr key={round.roundNumber}>
                <PrintTd mono>{round.roundNumber}</PrintTd>
                <PrintTd>{capitalize(round.state)}</PrintTd>
                <PrintTd align="right" mono>
                  {round.settledCount}
                </PrintTd>
                <PrintTd align="right" mono>
                  {formatCurrency(round.settledAmount, currency)}
                </PrintTd>
                <PrintTd align="right" mono>
                  {formatCurrency(round.expectedAmount, currency)}
                </PrintTd>
                <PrintTd align="right" mono>
                  {round.missingCount}
                </PrintTd>
                <PrintTd>
                  {round.payoutRecipientName ?? "—"}
                  {round.payoutDate ? (
                    <span className="ml-1 text-black/60">({formatDate(round.payoutDate)})</span>
                  ) : null}
                </PrintTd>
                <PrintTd align="right" mono>
                  {round.payoutAmount != null ? formatCurrency(round.payoutAmount, currency) : "—"}
                </PrintTd>
              </PrintTr>
            ))
          )}
        </tbody>
      </PrintTable>
    </PrintSection>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Full Stellar addresses are too wide to print legibly; the tail identifies them. */
function shortenAddress(address: string): string {
  return address.length <= 12 ? address : `…${address.slice(-6)}`
}
