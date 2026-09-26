"use client"

import { Modal } from "@/components/ui/modal"
import type { Shortcut } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: Shortcut[]
}

export function KeyboardShortcutsOverlay({ isOpen, onClose, shortcuts }: KeyboardShortcutsOverlayProps) {
  const navShortcuts = shortcuts.filter((s) => s.key.startsWith("g "))
  const actionShortcuts = shortcuts.filter((s) => !s.key.startsWith("g "))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="space-y-6">
        <ShortcutGroup title="Actions" shortcuts={actionShortcuts} />
        <ShortcutGroup title="Navigation" shortcuts={navShortcuts} />
      </div>
    </Modal>
  )
}

function ShortcutGroup({ title, shortcuts }: { title: string; shortcuts: Shortcut[] }) {
  return (
    <div>
      <h3 className="text-2xs font-heading text-muted-foreground uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-foreground">{s.description}</span>
            <div className="flex items-center gap-1">
              {s.label.split(" ").map((k, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-muted-foreground text-xs mx-0.5">then</span>}
                  <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-white/10 bg-white/5 px-1.5 text-xs font-mono text-muted-foreground">
                    {k}
                  </kbd>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
