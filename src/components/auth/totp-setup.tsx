"use client"

import React, { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { OTPInput } from "@/components/ui/otp-input"

interface TOTPSetupProps {
  totpUri: string
  totpSecret: string
  onConfirm: (code: string) => Promise<void>
  error?: string
  isLoading?: boolean
}

export function TOTPSetup({ totpUri, totpSecret, onConfirm, error, isLoading }: TOTPSetupProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [code, setCode] = React.useState("")

  useEffect(() => {
    if (!canvasRef.current || !totpUri) return
    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current, totpUri, {
        width: 200,
        margin: 2,
        color: { dark: "#ffffff", light: "transparent" },
      })
    })
  }, [totpUri])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold text-foreground dark:text-white mb-2">
          Set Up Two-Factor Authentication
        </h3>
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="QR code for authenticator app setup"
          className="rounded-xl bg-white p-4"
        />
      </div>

      <div className="glass-whisper rounded-xl p-4 space-y-2">
        <p className="text-xs text-muted-foreground font-heading tracking-wider uppercase">
          Or enter this code manually
        </p>
        <p className="font-mono text-sm text-foreground break-all select-all">
          {totpSecret}
        </p>
      </div>

      <div className="space-y-3">
        <OTPInput
          label="Enter the 6-digit code from your authenticator app"
          value={code}
          onChange={setCode}
          error={error}
        />
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => onConfirm(code)}
          isLoading={isLoading}
          disabled={code.length !== 6}
        >
          Confirm & Continue
        </Button>
      </div>
    </div>
  )
}
