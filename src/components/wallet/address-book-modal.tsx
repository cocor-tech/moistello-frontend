"use client"

import { useState } from "react"
import { Search, ArrowUpRight } from "lucide-react"
import { formatAddress } from "@/lib/formatters"
import { useFocusTrap } from "@/hooks/use-focus-trap"

interface SavedAddress {
  id: string
  label: string
  publicKey: string
}

interface AddressBookModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (address: string, label: string) => void
}

export function AddressBookModal({ isOpen, onClose, onSelect }: AddressBookModalProps) {
  const [search, setSearch] = useState("")
  const [addresses] = useState<SavedAddress[]>(() => {
    try { return JSON.parse(localStorage.getItem("saved_addresses") || "[]") } catch { return [] }
  })

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose)
  const filtered = addresses.filter(
    (a) => a.label.toLowerCase().includes(search.toLowerCase()) || a.publicKey.includes(search),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <button
        type="button"
        aria-label="Close address book"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-book-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-2xl bg-[rgb(var(--background))] border border-white/15 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span id="address-book-title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address Book</span>
          <button type="button" onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 text-muted-foreground hover:text-foreground text-sm" aria-label="Close address book">✕</button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              aria-label="Search saved addresses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search addresses..."
              className="w-full h-9 bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04]">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No saved addresses.</p>
          ) : (
            filtered.map((addr) => (
              <button
                type="button"
                key={addr.id}
                aria-label={`Select address ${addr.label}`}
                onClick={() => { onSelect(addr.publicKey, addr.label); onClose() }}
                className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors flex items-center justify-between group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{addr.label}</p>
                  <p className="text-xs font-mono text-muted-foreground truncate">{formatAddress(addr.publicKey)}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
