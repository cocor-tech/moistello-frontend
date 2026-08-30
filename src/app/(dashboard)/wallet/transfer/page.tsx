import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/shared/empty-state"
import { useUIStore } from "@/stores/ui-store"
import { post } from "@/lib/api-client"
import { formatAddress } from "@/lib/formatters"
import { copyToClipboard } from "@/lib/clipboard"

interface SavedAddress {
  id: string
  label: string
  publicKey: string
}

function WalletTransferContent() {
  const searchParams = useSearchParams()
  const initialRecipient = searchParams.get("recipient") || searchParams.get("address") || ""

  const addToast = useUIStore((s) => s.addToast)

  const [recipient, setRecipient] = useState(initialRecipient)
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<"USDC" | "XLM">("USDC")
  const [memo, setMemo] = useState("")
  const [step, setStep] = useState<"form" | "confirm" | "success">("form")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txnHash, setTxnHash] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [copiedHash, setCopiedHash] = useState(false)

  // Balances
  const usdcBalance = 1250.0
  const xlmBalance = 450.75
  const maxAvailable = currency === "USDC" ? usdcBalance : xlmBalance
  const networkFee = currency === "USDC" ? 0.01 : 0.0001

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("saved_addresses") || "[]")
      setSavedAddresses(stored)
    } catch {
      // fallback
    }
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-6" aria-label="Loading transfer">
        <Skeleton variant="heading" width="40%" height={40} />
        <Skeleton variant="rectangular" height={300} />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="Failed to load transfer page"
        description="Something went wrong loading wallet transfer details."
        action={{
          label: "Try Again",
          onClick: () => setIsError(false),
        }}
      />
    )
  }

  const handleValidate = () => {
    setError(null)
    if (!recipient.trim()) {
      setError("Please enter a valid Stellar recipient address.")
      return false
    }
    if (!recipient.startsWith("G") || recipient.length < 20) {
      setError("Invalid Stellar public key format (must start with G).")
      return false
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid transfer amount greater than 0.")
      return false
    }
    if (numAmount + networkFee > maxAvailable) {
      setError(`Insufficient ${currency} balance. Max available is ${maxAvailable} ${currency}.`)
      return false
    }
    return true
  }

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    if (handleValidate()) {
      setStep("confirm")
    }
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await post("/api/wallet/transfer", {
        recipient,
        amount: parseFloat(amount),
        currency,
        memo,
      })
      setTxnHash(res.txnHash || "tx_mock_hash_stellar")
      setStep("success")
      addToast("Transfer completed successfully", "success")
    } catch (err: any) {
      setError(err?.message || "Transfer failed. Please try again.")
      setStep("form")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div data-testid="wallet-transfer-page" className="max-w-2xl mx-auto space-y-8 pb-12">
      <PageHeader
        title="Transfer Assets"
        description="Send USDC or XLM instantly across the Stellar network."
        backButton={
          <Link href="/wallet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Wallet
            </Button>
          </Link>
        }
      />

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {step === "form" && (
        <form onSubmit={handleReview} className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Recipient Address</label>
            <Input
              data-testid="recipient-input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="G... (Stellar Public Key)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="flex gap-3">
              <Input
                data-testid="amount-input"
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="bg-background border border-border rounded-xl px-4 py-2 font-medium text-foreground"
              >
                <option value="USDC">USDC</option>
                <option value="XLM">XLM</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Available: {maxAvailable} {currency}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Memo (Optional)</label>
            <Input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment memo or reference"
            />
          </div>

          <Button
            data-testid="review-transfer-button"
            type="submit"
            className="w-full"
            size="lg"
          >
            Review Transfer <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <div data-testid="confirm-transfer-step" className="glass-card p-6 md:p-8 rounded-3xl space-y-6">
          <h3 className="text-xl font-heading font-semibold text-foreground">Confirm Transfer</h3>
          <div className="space-y-3 bg-card/50 p-4 rounded-2xl border border-border/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-mono font-medium">{formatAddress(recipient)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{amount} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fee</span>
              <span>{networkFee} {currency}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep("form")}
              className="w-1/2"
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="w-1/2"
            >
              {isSubmitting ? "Sending..." : "Confirm & Send"}
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="glass-card p-8 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-heading font-semibold">Transfer Successful!</h3>
          <p className="text-muted-foreground text-sm">
            Your transaction has been submitted to the Stellar network.
          </p>
          <div className="p-3 bg-muted/30 rounded-xl font-mono text-xs break-all">
            Txn Hash: {txnHash}
          </div>
          <Link href="/wallet">
            <Button className="w-full mt-4">Return to Wallet</Button>
          </Link>
        </div>
      )}
    </div>
  }
}

export default function WalletTransferPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading transfer...</div>}>
      <WalletTransferContent />
    </Suspense>
  )
}
