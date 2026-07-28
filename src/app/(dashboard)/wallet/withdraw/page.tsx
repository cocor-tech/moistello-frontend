"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft, Wallet, DollarSign, Banknote,
  ArrowUpRight, Loader2, AlertCircle, CheckCircle,
  ExternalLink, Copy, Check, ChevronRight,
  Landmark, Shield, Key,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { post, get } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { copyToClipboard } from "@/lib/clipboard"
import { cn } from "@/lib/cn"

type WithdrawStep =
  | "wallet"     // 1 — Select source wallet/asset
  | "amount"     // 2 — Enter USDC amount + bank details
  | "confirm"    // 3 — Review & confirm
  | "otp"        // 4 — OTP verification
  | "success"    // 5 — Done

const STEPS: WithdrawStep[] = ["wallet", "amount", "confirm", "otp", "success"]
const STEP_LABELS = ["Wallet", "Amount", "Confirm", "OTP", "Success"]

interface WalletOption {
  id: string
  label: string
  balance: number
  asset: string
}

interface BankOption {
  code: string
  name: string
}

interface WithdrawQuote {
  estimatedNgn: number
  rate: number
  spread: number
  yellowCardAddress: string
  withdrawId: string
}

const NIGERIAN_BANKS: BankOption[] = [
  { code: "044", name: "Access Bank" },
  { code: "035", name: "ALAT by Wema" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "FCMB" },
  { code: "070", name: "Fidelity Bank" },
  { code: "058", name: "GTBank" },
  { code: "301", name: "Heritage Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "000", name: "Other Bank" },
]

const ASSET_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: "USDC", label: "USD Coin", icon: "💵" },
  { value: "XLM", label: "Stellar Lumens", icon: "✨" },
]

export default function WithdrawPage() {
  const addToast = useUIStore((s) => s.addToast)

  const [step, setStep] = useState<WithdrawStep>("wallet")
  const [asset, setAsset] = useState("USDC")
  const [amountUsdc, setAmountUsdc] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [quote, setQuote] = useState<WithdrawQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [errMsg, setErrMsg] = useState("")
  const [wallets, setWallets] = useState<WalletOption[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const stepIndex = STEPS.indexOf(step)

  // Fetch wallet balances on mount
  useEffect(() => {
    get<Record<string, unknown>>("/wallets/balance").then((res) => {
      const d = (res as Record<string, unknown>)?.data ?? res
      const list: WalletOption[] = []
      if (d) {
        const usdc = parseFloat(String((d as Record<string, string>).usdc ?? "0"))
        const xlm = parseFloat(String((d as Record<string, string>).xlm ?? "0"))
        list.push({ id: "usdc-wallet", label: "USDC Wallet", balance: usdc, asset: "USDC" })
        list.push({ id: "xlm-wallet", label: "XLM Wallet", balance: xlm, asset: "XLM" })
      }
      setWallets(list)
      if (list.length > 0 && !selectedWallet) {
        setSelectedWallet(list[0].id)
        setAsset(list[0].asset)
      }
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWalletData = wallets.find((w) => w.id === selectedWallet)

  // ── 2. Get quote ──
  const handleGetQuote = useCallback(async () => {
    const amt = parseFloat(amountUsdc)
    if (!amt || amt <= 0) {
      addToast({ type: "error", title: "Invalid amount" })
      return
    }
    if (selectedWalletData && amt > selectedWalletData.balance) {
      addToast({ type: "error", title: "Insufficient balance" })
      return
    }
    if (!selectedBank) {
      addToast({ type: "error", title: "Select a bank" })
      return
    }
    if (!accountNumber || accountNumber.length < 10) {
      addToast({ type: "error", title: "Valid account number required" })
      return
    }
    if (!accountName.trim()) {
      addToast({ type: "error", title: "Account name required" })
      return
    }
    setLoading(true)
    setErrMsg("")
    try {
      const res = await post<Record<string, unknown>>("/wallet/withdraw/quote", {
        asset,
        amount: amt,
        bankCode: selectedBank,
        accountNumber,
        accountName: accountName.trim(),
      })
      const data = res?.data ?? res
      const q: WithdrawQuote = {
        estimatedNgn: Number(data.estimatedNgn ?? data.estimatedNgn ?? 0),
        rate: Number(data.rate ?? 0),
        spread: Number(data.spread ?? 1.5),
        yellowCardAddress: String(data.yellowCardAddress ?? data.destinationAddress ?? ""),
        withdrawId: String(data.withdrawId ?? data.id ?? ""),
      }
      if (!q.estimatedNgn) throw new Error("Failed to get quote")
      setQuote(q)
      setStep("confirm")
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "Quote failed"
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [amountUsdc, selectedWalletData, selectedBank, accountNumber, accountName, asset, addToast])

  // ── 3. Confirm & submit ──
  const handleConfirm = useCallback(async () => {
    if (!quote) return
    setLoading(true)
    setErrMsg("")
    try {
      await post(`/wallet/withdraw/${quote.withdrawId}/submit`, {
        otpSent: true,
      })
      setStep("otp")
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "Submission failed"
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [quote])

  // ── 4. Verify OTP ──
  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join("")
    if (code.length !== 6) {
      addToast({ type: "error", title: "Enter complete OTP" })
      return
    }
    if (!quote) return
    setLoading(true)
    setErrMsg("")
    try {
      await post(`/wallet/withdraw/${quote.withdrawId}/verify`, { otp: code })
      setStep("success")
      addToast({ type: "success", title: "Withdrawal confirmed!" })
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "OTP verification failed"
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [otp, quote, addToast])

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[index] = val.slice(-1)
    setOtp(next)
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const selectedBankName = NIGERIAN_BANKS.find((b) => b.code === selectedBank)?.name ?? ""

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* ── Back + Title ── */}
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Withdraw to Bank</h1>
          <p className="text-sm text-muted-foreground">Cash out USDC to your Nigerian bank account</p>
        </div>
      </div>

      {/* ── Step indicator pills ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                i < stepIndex && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                i === stepIndex && "bg-aurora-violet/20 text-aurora-violet border border-aurora-violet/30",
                i > stepIndex && "bg-white/5 text-muted-foreground/50 border border-white/10",
              )}
            >
              {i < stepIndex ? "✓" : i + 1}
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>

      {/* ══════════ 1. SELECT WALLET ══════════ */}
      {step === "wallet" && (
        <div className="space-y-5">
          {/* Floating decorative blob */}
          <div className="relative overflow-hidden rounded-xl border border-white/10">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-aurora-violet/8 blur-2xl pointer-events-none" />
            <div className="relative z-10 p-6 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select Source
              </p>
              {wallets.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedWallet(w.id)
                        setAsset(w.asset)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                        selectedWallet === w.id
                          ? "bg-aurora-violet/10 border-aurora-violet/30"
                          : "bg-white/[0.02] border-white/10 hover:border-white/20",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl text-lg",
                          w.asset === "USDC" ? "bg-emerald-500/15" : "bg-aurora-violet/15",
                        )}>
                          {w.asset === "USDC" ? "💵" : "✨"}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{w.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {w.balance.toFixed(4)} {w.asset}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                        selectedWallet === w.id
                          ? "border-aurora-violet bg-aurora-violet"
                          : "border-white/20",
                      )}>
                        {selectedWallet === w.id && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setStep("amount")}
            disabled={!selectedWallet}
          >
            Continue
          </Button>
        </div>
      )}

      {/* ══════════ 2. AMOUNT + BANK DETAILS ══════════ */}
      {step === "amount" && (
        <div className="space-y-5">
          {/* Amount card */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
            <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount to withdraw
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-emerald-400">{asset}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountUsdc}
                  onChange={(e) => setAmountUsdc(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-3xl font-bold font-heading text-foreground border-none outline-none placeholder:text-muted-foreground/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              {selectedWalletData && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Available</span>
                  <span className="text-foreground">{selectedWalletData.balance.toFixed(4)} {asset}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bank details — dotted dividers style */}
          <div className="border border-white/10 rounded-xl overflow-hidden">
            <div className="p-5 space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5" />
                Bank Account
              </p>

              {/* Bank selector — pills */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Bank</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {NIGERIAN_BANKS.map((b) => (
                    <button
                      key={b.code}
                      onClick={() => setSelectedBank(b.code)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                        selectedBank === b.code
                          ? "bg-aurora-violet/20 border-aurora-violet/40 text-aurora-violet"
                          : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/30",
                      )}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dotted separator */}
              <div className="border-t border-dotted border-white/10" />

              <Input
                label="Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0123456789"
                maxLength={10}
              />

              <div className="border-t border-dotted border-white/10" />

              <Input
                label="Account Name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Summary estimate */}
          {amountUsdc && parseFloat(amountUsdc) > 0 && (
            <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-5 py-3.5">
              <span className="text-xs text-muted-foreground">You&apos;ll receive approx.</span>
              <span className="text-sm font-semibold text-foreground">
                ₦{(parseFloat(amountUsdc) * 1550).toLocaleString()}
              </span>
            </div>
          )}

          {errMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errMsg}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep("wallet")}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={handleGetQuote}
              isLoading={loading}
              disabled={!amountUsdc || !selectedBank || !accountNumber || !accountName.trim()}
            >
              Get Quote
            </Button>
          </div>
        </div>
      )}

      {/* ══════════ 3. CONFIRM ══════════ */}
      {step === "confirm" && quote && (
        <div className="space-y-5">
          {/* Shield banner */}
          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-400/20 rounded-xl px-5 py-4">
            <Shield className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              Review the details below. Withdrawals are processed by Yellow Card and
              sent to your bank account within minutes.
            </p>
          </div>

          {/* Summary card */}
          <div className="border border-white/10 rounded-xl divide-y divide-dotted divide-white/[0.06]">
            <div className="flex justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground">Sending</span>
              <span className="text-sm font-semibold text-foreground">{parseFloat(amountUsdc).toFixed(2)} {asset}</span>
            </div>
            <div className="flex justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground">You receive</span>
              <span className="text-sm font-semibold text-emerald-400">₦{quote.estimatedNgn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground">Rate</span>
              <span className="text-sm text-foreground">1 {asset} ≈ ₦{(quote.estimatedNgn / parseFloat(amountUsdc)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between px-5 py-4">
              <span className="text-sm text-muted-foreground">Spread</span>
              <span className="text-sm text-foreground">{quote.spread}%</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-muted-foreground mb-1">Destination Bank</p>
              <p className="text-sm font-medium text-foreground">{selectedBankName}</p>
              <p className="text-sm text-foreground">{accountNumber}</p>
              <p className="text-sm text-muted-foreground">{accountName}</p>
            </div>
          </div>

          {errMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errMsg}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="flex-1" onClick={() => setStep("amount")}>
              Edit
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={handleConfirm} isLoading={loading}>
              Confirm & Request OTP
            </Button>
          </div>
        </div>
      )}

      {/* ══════════ 4. OTP ══════════ */}
      {step === "otp" && (
        <div className="space-y-6">
          <div className="border border-white/10 rounded-xl p-8 text-center space-y-5">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-aurora-violet/15 mx-auto">
              <Key className="h-7 w-7 text-aurora-violet" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">Enter OTP</p>
              <p className="text-sm text-muted-foreground mt-1">
                A 6-digit code was sent to your registered email
              </p>
            </div>

            {/* OTP input row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className={cn(
                    "w-10 sm:w-12 h-12 sm:h-14 text-center text-xl font-bold font-heading text-foreground",
                    "bg-white/5 border rounded-xl outline-none transition-all",
                    "focus:border-aurora-violet focus:ring-1 focus:ring-aurora-violet/30",
                    digit ? "border-aurora-violet/50" : "border-white/10",
                  )}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Didn&apos;t receive it?{" "}
              <button className="text-aurora-violet hover:underline">Resend</button>
            </p>
          </div>

          {errMsg && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {errMsg}
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleVerifyOtp}
            isLoading={loading}
            disabled={otp.join("").length !== 6}
          >
            Verify & Complete Withdrawal
          </Button>
        </div>
      )}

      {/* ══════════ 5. SUCCESS ══════════ */}
      {step === "success" && quote && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-400/5 to-background border border-emerald-500/25 p-8 text-center space-y-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 mx-auto">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold gradient-text-extended">Withdrawal Complete</p>
                <p className="text-lg font-semibold text-foreground mt-2">
                  ₦{quote.estimatedNgn.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  sent to {selectedBankName} • {accountNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl divide-y divide-dotted divide-white/[0.06]">
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Amount sent</span>
              <span className="text-foreground">{parseFloat(amountUsdc).toFixed(2)} {asset}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">You received</span>
              <span className="text-emerald-400 font-medium">₦{quote.estimatedNgn.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-3.5 text-sm">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs text-foreground">{quote.withdrawId}</span>
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
      {step !== "success" && step !== "otp" && (
        <Link href="/wallet" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
        </Link>
      )}
    </div>
  )
}