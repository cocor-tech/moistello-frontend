"use client"

import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"

interface CircleJoinCodeModalProps {
  isOpen: boolean
  onClose: () => void
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
}

export function CircleJoinCodeModal({
  isOpen,
  onClose,
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
}: CircleJoinCodeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enter Invite Code"
      description="This circle is private. Enter an invite code to join."
      size="sm"
    >
      <div className="space-y-4">
        <input
          aria-label="Circle invite code"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Paste invite code here..."
          className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono text-center text-lg tracking-widest"
        />
        {error && <p role="alert" className="text-sm text-red-400 text-center">{error}</p>}
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={onSubmit}
          isLoading={isLoading}
          disabled={!value.trim()}
        >
          Join Circle
        </Button>
      </div>
    </Modal>
  )
}
