"use client"

import { Key, CircleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OTPInput } from "@/components/ui/otp-input"

interface Props {
  otp: string[]
  loading: boolean
  errMsg: string
  resendCooldown: number
  onOtpChange: (value: string) => void
  onVerify: () => void
  onResend: () => void
}

export function OtpStep({
  otp, loading, errMsg, resendCooldown,
  onOtpChange, onVerify, onResend,
}: Props) {
  return (
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

        <OTPInput label="6-digit withdrawal verification code" value={otp.join("")} onChange={onOtpChange} />

        <p className="text-xs text-muted-foreground">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0 || loading}
            className="text-aurora-violet hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
          </button>
        </p>
      </div>

      {errMsg && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />
          {errMsg}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onVerify}
        isLoading={loading}
        disabled={otp.join("").length !== 6}
      >
        Verify & Complete Withdrawal
      </Button>
    </div>
  )
}
