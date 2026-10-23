"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { post, get } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { NGN_FALLBACK_RATE } from "@/lib/constants"
import type { WithdrawStep, WalletOption, WithdrawQuote } from "@/app/(dashboard)/wallet/withdraw/types"

export function useWithdrawWizard() {
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
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedWalletData = wallets.find((w) => w.id === selectedWallet)

  // Fetch wallet balances on mount
  useEffect(() => {
    get<Record<string, unknown>>("/wallets/balance")
      .then((res) => {
        const d = (res as Record<string, unknown>)?.data ?? res
        const list: WalletOption[] = []
        if (d) {
          const usdc = parseFloat(String((d as Record<string, string>).usdc ?? "0"))
          const xlm = parseFloat(String((d as Record<string, string>).xlm ?? "0"))
          list.push({ id: "usdc-wallet", label: "USDC Wallet", balance: usdc, asset: "USDC" })
          list.push({ id: "xlm-wallet", label: "XLM Wallet", balance: xlm, asset: "XLM" })
        }
        setWallets(list)
        if (list.length > 0) {
          setSelectedWallet(list[0].id)
          setAsset(list[0].asset)
        }
      })
      .catch(() => {})
  }, [])

  const selectWallet = useCallback((id: string, walletAsset: string) => {
    setSelectedWallet(id)
    setAsset(walletAsset)
  }, [])

  // ── 2. Get quote ──
  const handleGetQuote = useCallback(async () => {
    const amt = parseFloat(amountUsdc)
    if (!amt || amt <= 0) { addToast({ type: "error", title: "Invalid amount" }); return }
    if (selectedWalletData && amt > selectedWalletData.balance) { addToast({ type: "error", title: "Insufficient balance" }); return }
    if (!selectedBank) { addToast({ type: "error", title: "Select a bank" }); return }
    if (!accountNumber || accountNumber.length < 10) { addToast({ type: "error", title: "Valid account number required" }); return }
    if (!accountName.trim()) { addToast({ type: "error", title: "Account name required" }); return }
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
      const data = ((res as Record<string, unknown>)?.data ?? res) as Record<string, unknown>
      const q: WithdrawQuote = {
        estimatedNgn: Number(data.estimatedNgn ?? 0),
        rate: Number(data.rate ?? 0),
        spread: Number(data.spread ?? 1.5),
        yellowCardAddress: String(data.yellowCardAddress ?? data.destinationAddress ?? ""),
        withdrawId: String(data.withdrawId ?? data.id ?? ""),
      }
      if (!q.estimatedNgn) throw new Error("Failed to get quote")
      setQuote(q)
      setStep("confirm")
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Quote failed")
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
      await post(`/wallet/withdraw/${quote.withdrawId}/submit`, { otpSent: true })
      setStep("otp")
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setLoading(false)
    }
  }, [quote])

  // ── 4. Verify OTP ──
  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join("")
    if (code.length !== 6) { addToast({ type: "error", title: "Enter complete OTP" }); return }
    if (!quote) return
    setLoading(true)
    setErrMsg("")
    try {
      await post(`/wallet/withdraw/${quote.withdrawId}/verify`, { otp: code })
      setStep("success")
      addToast({ type: "success", title: "Withdrawal confirmed!" })
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "OTP verification failed")
    } finally {
      setLoading(false)
    }
  }, [otp, quote, addToast])

  // ── Resend OTP (wired to backend) ──
  const handleResendOtp = useCallback(async () => {
    if (!quote || resendCooldown > 0) return
    setLoading(true)
    setErrMsg("")
    try {
      await post(`/wallet/withdraw/${quote.withdrawId}/resend-otp`, {})
      addToast({ type: "success", title: "OTP resent to your email" })
      // Start 60-second cooldown
      setResendCooldown(60)
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }, [quote, resendCooldown, addToast])

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const handleOtpChange = useCallback((value: string) => {
    setOtp(Array.from({ length: 6 }, (_, index) => value[index] ?? ""))
  }, [])

  const ngnEstimate =
    amountUsdc && parseFloat(amountUsdc) > 0
      ? parseFloat(amountUsdc) * NGN_FALLBACK_RATE
      : null

  return {
    step,
    setStep,
    asset,
    amountUsdc,
    setAmountUsdc,
    selectedBank,
    setSelectedBank,
    accountNumber,
    setAccountNumber,
    accountName,
    setAccountName,
    quote,
    loading,
    errMsg,
    wallets,
    selectedWallet,
    selectWallet,
    selectedWalletData,
    otp,
    handleGetQuote,
    handleConfirm,
    handleVerifyOtp,
    handleResendOtp,
    resendCooldown,
    handleOtpChange,
    ngnEstimate,
  }
}
