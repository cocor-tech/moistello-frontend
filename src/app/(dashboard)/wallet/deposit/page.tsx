"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, NairaIcon, DollarSign, Copy, Check,
  ArrowDownCircle, ArrowUpRight, Loader2, AlertCircle,
  ExternalLink, Banknote, QrCode, Clock, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { post, get } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/cn"

type DepositStep =
  | "amount"      // 1 — Enter NGN amount, see USDC estimate
  | "payin"       // 2 — Bank transfer details + QR
  | "confirm"     // 3 — User confirms they initiated the transfer
  | "verify"      // 4 — Polling/waiting for Yellow Card detection
  | "complete"    // 5 — Done

interface QuoteInfo {
  estimatedUsdc: number
  rate: number
  spread: number
  expiresAt: string
}

interface PaymentInfo {
  depositId: string
  bankName: string
  accountNumber: string
  accountName: string
  amountNgn: number
  reference: string
  quote: QuoteInfo
}

const STEPS = ["amount", "payin", "confirm", "verify", "complete"] as const
const STEP_LABELS = ["Amount", "Pay-In", "Confirm", "Verify", "Complete"]

export default function DepositPage() {
  const addToast = useUIStore((s) => s.addToast)

  const [step, setStep] = useState<DepositStep>("amount")
  const [amountNgn, setAmountNgn] = useState("")
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState("")
  const [errMsg, setErrMsg] = useState("")
  const [pollCount, setPollCount] = useState(0)

  const stepIndex = STEPS.indexOf(step)

  // ── 1. Get quote & create payment request ──
  const handleGetQuote = useCallback(async () => {
    const amt = parseFloat(amountNgn)
    if (!amt || amt < 100) {
      addToast({ type: "error", title: "Invalid amount", description: "Minimum deposit is ₦100." })
      return
    }
    setLoading(true)
    setErrMsg("")
    try {
      const res = await post<Record<string, unknown>>("/wallet/deposit/quote", { amountNgn: amt })
      const data = res?.data ?? res
      const qi = (data?.quote ?? data) as unknown as QuoteInfo
      if (!qi?.estimatedUsdc) throw new Error("Failed to get quote")

      const pi: PaymentInfo = {
        depositId: String(data.depositId ?? data.id ?? ""),
        bankName: String(data.bankName ?? "Access Bank"),
        accountNumber: String(data.accountNumber ?? ""),
        accountName: String(data.accountName ?? "Moistello Payments"),
        amountNgn: amt,
        reference: String(data.reference ?? `MOIST-${Date.now()}`),
        quote: qi,
      }
      setPayment(pi)
      setStep("payin")
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "Failed to initiate deposit"
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [amountNgn, addToast])

  // ── 3. User confirms they sent the bank transfer ──
  const handleConfirmPayin = useCallback(async () => {
    if (!payment) return
    setLoading(true)
    setErrMsg("")
    try {
      await post(`/wallet/deposit/${payment.depositId}/confirm`, {})
      setStep("verify")
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "Confirmation failed"
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [payment])

  // ── 4. Poll for completion ──
  useEffect(() => {
    if (step !== "verify" || !payment) return
    const id = setInterval(async () => {
      try {
        const res = await get<Record<string, unknown>>(`/wallet/deposit/${payment.depositId}/status`)
        const data = res?.data ?? res
        if (data?.status === "completed" || data?.status === "settled") {
          clearInterval(id)
          setStep("complete")
          return
        }
        setPollCount((c) => c + 1)
      } catch {
        setPollCount((c) => c + 1)
      }
    }, 5000)
    return () => clearInterval(id)
  }, [step, payment])

  const copyField = async (val: string, key: string) => {
    const ok = await copyToClipboard(val)
    if (ok) {
      setCopied(key)
      setTimeout(() => setCopied(""), 2000)
      addToast({ type: "info", title: "Copied" })
    } else {
      addToast({ type: "error", title: "Failed to copy" })
    }
  }

  const maxNgnAmount = 5_000_000

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Deposit</h1>
          <p className="text-sm text-muted-foreground">Fund your wallet with NGN bank transfer</p>
        </div>
      </div>

      {/* ── Step progress ── */}
      <div className="relative flex items-center justify-between px-1">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1.5 z-10">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                i < stepIndex && "bg-emerald-500 text-white",
                i === stepIndex && "bg-aurora-violet text-white ring-2 ring-aurora-violet/30",
                i > stepIndex && "bg-white/10 text-muted-foreground",
              )}
            >
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-medium whitespace-nowrap",
              i <= stepIndex ? "text-foreground" : "text-muted-foreground/50",
            )}>
              {label}
            </span>
          </div>
        ))}
        {/* Connecting line */}
        <div className="absolute left-[8%] right-[8%] top-4 -translate-y-1/2 h-px bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-aurora-violet to-white/10 transition-all duration-700"
            style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* ══════════ 1. AMOUNT ══════════ */}
      {step === "amount" && (
        <div className="space-y-6">
          {/* Full-bleed gradient hero */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-aurora-violet/20 via-aurora-indigo/10 to-background border border-aurora-violet/20 p-8 text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-aurora-violet/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora-violet/20 text-aurora-violet rotate-45">
                <Banknote className="h-7 w-7 -rotate-45" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Enter amount in NGN</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold font-heading text-foreground">₦</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountNgn}
                  onChange={(e) => setAmountNgn(e.target.value)}
                  placeholder="0.00"
                  className="w-48 bg-transparent text-4xl md:text-5xl font-bold font-heading text-foreground text-center border-none outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              {amountNgn && parseFloat(amountNgn) > 0 && (
                <p className="text-sm text-emerald-400 font-medium">
                  ≈ ${(parseFloat(amountNgn) / 1550).toFixed(2)} USDC
                </p>
              )}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[5000, 10000, 25000, 50000, 100000].map((v) => (
              <button
                key={v}
                onClick={() => setAmountNgn(String(v))}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium border transition-all",
                  parseFloat(amountNgn) === v
                    ? "bg-aurora-violet/20 border-aurora-violet/40 text-aurora-violet"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30",
                )}
              >
                ₦{v.toLocaleString()}
              </button>
            ))}
          </div>

          {errMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errMsg}
            </div>
          )}

          <div className="space-y-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleGetQuote}
              isLoading={loading}
              disabled={!amountNgn || parseFloat(amountNgn) < 100}
            >
              Get Payment Details
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Min: ₦100 &middot; Max: ₦{maxNgnAmount.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* ══════════ 2. PAY-IN (Bank Details + QR) ══════════ */}
      {step === "payin" && payment && (
        <div className="space-y-6">
          {/* QR section — full-bleed */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/15 via-aurora-cyan/5 to-background border border-emerald-500/20 p-6 text-center">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transfer to</p>
              <div className="inline-flex items-center justify-center w-36 h-36 bg-white rounded-2xl mx-auto shadow-lg">
                <QrCode className="h-16 w-16 text-black/80" />
              </div>
              <p className="text-xs text-muted-foreground">Scan to auto-fill payment details</p>
            </div>
          </div>

          {/* Bank details — card rows */}
          <div className="divide-y divide-white/[0.06] border border-white/10 rounded-xl overflow-hidden">
            {[
              { label: "Bank", value: payment.bankName, key: "bank" },
              { label: "Account Number", value: payment.accountNumber, key: "acct" },
              { label: "Account Name", value: payment.accountName, key: "name" },
              { label: "Amount", value: `₦${payment.amountNgn.toLocaleString()}`, key: "amount" },
              { label: "Reference", value: payment.reference, key: "ref", mono: true },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className={cn("text-sm font-medium text-foreground mt-0.5", row.mono && "font-mono text-xs")}>
                    {row.value}
                  </p>
                </div>
                <button
                  onClick={() => copyField(row.value, row.key)}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied === row.key ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>

          {/* Quote summary */}
          <div className="bg-white/[0.03] rounded-xl px-5 py-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Estimated USDC</span>
              <span className="text-emerald-400 font-medium">${payment.quote.estimatedUsdc.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rate</span>
              <span className="text-foreground">₦1 = ${(1 / 1550).toFixed(6)} USDC</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Spread</span>
              <span className="text-foreground">{payment.quote.spread}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Quote expires {new Date(payment.quote.expiresAt).toLocaleTimeString()}
            </div>
          </div>

          {errMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errMsg}
            </div>
          )}

          <div className="space-y-3">
            <Button variant="primary" size="lg" className="w-full" onClick={handleConfirmPayin} isLoading={loading}>
              I&apos;ve Made the Transfer
            </Button>
            <button onClick={() => setStep("amount")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
              Change amount
            </button>
          </div>
        </div>
      )}

      {/* ══════════ 3. CONFIRM ══════════ */}
      {step === "confirm" && payment && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-background border border-amber-400/20 p-6 text-center space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
              <Clock className="h-7 w-7" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">Confirming Your Transfer</p>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;re waiting for Yellow Card to detect your payment of{" "}
                <span className="text-amber-400 font-medium">₦{payment.amountNgn.toLocaleString()}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
              Checking for incoming transfer...
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-2 bg-white/[0.03] rounded-xl px-5 py-4">
            <p className="font-medium text-foreground">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Yellow Card detects your bank transfer</li>
              <li>NGN is converted to USDC at the quoted rate</li>
              <li>USDC is sent directly to your Stellar wallet</li>
              <li>Your balance updates automatically</li>
            </ol>
            <p className="pt-2">This usually takes 5–15 minutes during business hours.</p>
          </div>
        </div>
      )}

      {/* ══════════ 4. VERIFY (polling) ══════════ */}
      {step === "verify" && payment && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-aurora-violet/15 via-aurora-indigo/5 to-background border border-aurora-violet/20 p-8 text-center space-y-5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--aurora-violet)/0.06)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-aurora-violet/15">
                <Loader2 className="h-8 w-8 animate-spin text-aurora-violet" />
              </div>
              <div>
                <p className="font-heading text-xl font-bold text-foreground">Verifying Transaction</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Checking Yellow Card for your payment of ₦{payment.amountNgn.toLocaleString()}
                </p>
              </div>
              {/* Animated dots */}
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-aurora-violet/40 animate-pulse"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Polling... ({pollCount}s elapsed)
              </p>
            </div>
          </div>

          <button onClick={() => setStep("amount")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
            Start a new deposit
          </button>
        </div>
      )}

      {/* ══════════ 5. COMPLETE ══════════ */}
      {step === "complete" && payment && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-400/5 to-background border border-emerald-500/25 p-8 text-center space-y-4">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <ArrowDownCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold gradient-text-extended">Deposit Complete</p>
                <p className="text-lg font-semibold text-foreground mt-2">
                  +${payment.quote.estimatedUsdc.toFixed(2)} USDC
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  from ₦{payment.amountNgn.toLocaleString()} deposit
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl divide-y divide-white/[0.06]">
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs text-foreground">{payment.reference}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="text-foreground">₦{payment.amountNgn} → ${payment.quote.estimatedUsdc.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/wallet" className="flex-1">
              <Button variant="primary" size="lg" className="w-full">Back to Wallet</Button>
            </Link>
            <Link href="/wallet/transactions" className="flex-1">
              <Button variant="outline" size="lg" className="w-full" leftIcon={<ExternalLink className="h-4 w-4" />}>
                View History
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Bottom back link */}
      {step !== "complete" && step !== "verify" && (
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
        </Link>
      )}
    </div>
  )
}