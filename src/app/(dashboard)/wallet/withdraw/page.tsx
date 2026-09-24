"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { LiveRegion } from "@/components/shared/live-region"
import { useWithdrawWizard } from "@/hooks/use-withdraw-wizard"
import { WalletStep } from "./steps/wallet-step"
import { AmountStep } from "./steps/amount-step"
import { ConfirmStep } from "./steps/confirm-step"
import { OtpStep } from "./steps/otp-step"
import { SuccessStep } from "./steps/success-step"
import { NIGERIAN_BANKS } from "./banks"

const STEPS = ["wallet", "amount", "confirm", "otp", "success"] as const
const STEP_LABELS = ["Wallet", "Amount", "Confirm", "OTP", "Success"]

export default function WithdrawPage() {
  const wizard = useWithdrawWizard()
  const stepIndex = STEPS.indexOf(wizard.step)
  const selectedBankName = NIGERIAN_BANKS.find((b) => b.code === wizard.selectedBank)?.name ?? ""

  const statusMessage = useMemo(() => {
    if (wizard.errMsg) return wizard.errMsg
    if (wizard.step === "wallet" && wizard.wallets.length === 0) return "Loading your wallets…"
    if (wizard.loading) {
      if (wizard.step === "amount") return "Fetching withdrawal quote…"
      if (wizard.step === "confirm") return "Submitting your withdrawal request…"
      if (wizard.step === "otp") return "Verifying OTP…"
    }
    if (wizard.step === "confirm" && wizard.quote)
      return `Quote ready. You'll receive ₦${wizard.quote.estimatedNgn.toLocaleString()}. Review your withdrawal details.`
    if (wizard.step === "otp")
      return "OTP sent. Enter the 6-digit code sent to your registered email."
    if (wizard.step === "success" && wizard.quote)
      return `Withdrawal complete. ₦${wizard.quote.estimatedNgn.toLocaleString()} sent to ${selectedBankName}.`
    return ""
  }, [wizard, selectedBankName])

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <LiveRegion message={statusMessage} />

      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to wallet">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Withdraw to Bank</h1>
          <p className="text-sm text-muted-foreground">Cash out USDC to your Nigerian bank account</p>
        </div>
      </div>

      {/* Step indicator pills */}
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
              {i < stepIndex ? "✓" : i + 1} {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            )}
          </div>
        ))}
      </div>

      {/* Step components */}
      {wizard.step === "wallet" && (
        <WalletStep
          wallets={wizard.wallets}
          selectedWallet={wizard.selectedWallet}
          onSelect={wizard.selectWallet}
          onNext={() => wizard.setStep("amount")}
        />
      )}

      {wizard.step === "amount" && (
        <AmountStep
          asset={wizard.asset}
          amountUsdc={wizard.amountUsdc}
          setAmountUsdc={wizard.setAmountUsdc}
          selectedBank={wizard.selectedBank}
          setSelectedBank={wizard.setSelectedBank}
          accountNumber={wizard.accountNumber}
          setAccountNumber={wizard.setAccountNumber}
          accountName={wizard.accountName}
          setAccountName={wizard.setAccountName}
          selectedWalletData={wizard.selectedWalletData}
          ngnEstimate={wizard.ngnEstimate}
          loading={wizard.loading}
          errMsg={wizard.errMsg}
          onGetQuote={wizard.handleGetQuote}
          onBack={() => wizard.setStep("wallet")}
        />
      )}

      {wizard.step === "confirm" && wizard.quote && (
        <ConfirmStep
          quote={wizard.quote}
          amountUsdc={wizard.amountUsdc}
          asset={wizard.asset}
          accountNumber={wizard.accountNumber}
          accountName={wizard.accountName}
          selectedBank={wizard.selectedBank}
          loading={wizard.loading}
          errMsg={wizard.errMsg}
          onConfirm={wizard.handleConfirm}
          onBack={() => wizard.setStep("amount")}
        />
      )}

      {wizard.step === "otp" && (
        <OtpStep
          otp={wizard.otp}
          loading={wizard.loading}
          errMsg={wizard.errMsg}
          resendCooldown={wizard.resendCooldown}
          onOtpChange={wizard.handleOtpChange}
          onVerify={wizard.handleVerifyOtp}
          onResend={wizard.handleResendOtp}
        />
      )}

      {wizard.step === "success" && wizard.quote && (
        <SuccessStep
          quote={wizard.quote}
          amountUsdc={wizard.amountUsdc}
          asset={wizard.asset}
          accountNumber={wizard.accountNumber}
          selectedBank={wizard.selectedBank}
        />
      )}

      {wizard.step !== "success" && wizard.step !== "otp" && (
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Wallet
        </Link>
      )}
    </div>
  )
}
