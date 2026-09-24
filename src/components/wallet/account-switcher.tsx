"use client"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatAddress } from "@/lib/formatters"
import { useMultiWallet } from "@/hooks/use-multi-wallet"
import { useRef, useState, type KeyboardEvent } from "react"

export function AccountSwitcher() {
  const { activeWalletId, activeWallet, wallets, switchWallet, detectedWallets } = useMultiWallet()
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const connectedWallets = Object.entries(wallets).filter(([,w]) => w.status === "connected" || w.status === "reconnecting")
  if (connectedWallets.length === 0) return null
  const activeName = detectedWallets.find(w => w.id === activeWalletId)?.name || activeWalletId || "Wallet"

  const listboxId = "wallet-switcher-listbox"

  const getOptionElements = () => Array.from(
    document.querySelectorAll<HTMLButtonElement>(`#${listboxId} [role="option"]`),
  )

  const focusOption = (index: number) => {
    const options = getOptionElements()
    if (options.length === 0) return
    options[Math.max(0, Math.min(index, options.length - 1))]?.focus()
  }

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    setIsOpen(true)
    const index = event.key === "Home"
      ? 0
      : event.key === "End"
        ? connectedWallets.length - 1
        : event.key === "ArrowDown"
          ? 0
          : connectedWallets.length - 1
    window.requestAnimationFrame(() => focusOption(index))
  }

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Escape") {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? connectedWallets.length - 1
        : event.key === "ArrowDown"
          ? (index + 1) % connectedWallets.length
          : (index - 1 + connectedWallets.length) % connectedWallets.length
    focusOption(nextIndex)
  }

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label="Wallet switcher"
        className="flex items-center gap-1.5 glass-whisper rounded-full px-2.5 py-1.5 text-xs font-mono hover:glass-strong transition-all"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="max-w-[100px] truncate">{activeWallet?.publicKey ? formatAddress(activeWallet.publicKey) : activeName}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label="Connected wallets"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-full mt-2 w-64 glass-premium rounded-2xl p-2 border border-white/10 shadow-xl z-50"
          >
            <p className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground px-3 py-2">Connected Wallets</p>
            {connectedWallets.map(([id, w], index) => (
              <button
                key={id}
                type="button"
                id={`${listboxId}-option-${id}`}
                role="option"
                aria-selected={activeWalletId === id}
                aria-label={`Select ${formatAddress(w.publicKey)}`}
                onClick={() => { switchWallet(id); setIsOpen(false); triggerRef.current?.focus() }}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all", activeWalletId === id ? "glass-strong text-foreground" : "text-muted-foreground hover:text-foreground hover:glass-whisper")}
              >
                <div className={cn("w-2 h-2 rounded-full", w.status === "connected" ? "bg-emerald-400" : "bg-muted-foreground")} />
                <span className="flex-1 text-left font-mono text-xs">{formatAddress(w.publicKey)}</span>
                {activeWalletId === id && <Check className="h-3.5 w-3.5 text-aurora-violet" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && (
        <button
          type="button"
          aria-label="Close wallet switcher"
          tabIndex={-1}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}
    </div>
  )
}
