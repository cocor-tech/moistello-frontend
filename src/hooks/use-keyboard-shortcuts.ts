"use client"

import { useEffect, useCallback, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useUIStore } from "@/stores/ui-store"

export interface Shortcut {
  key: string
  label: string
  description: string
  action: () => void
}

function isEditableElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return el.isContentEditable
}

export function useKeyboardShortcuts() {
  const router = useRouter()
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts: Shortcut[] = useMemo(() => [
    { key: "?", label: "?", description: "Show keyboard shortcuts", action: () => setHelpOpen(true) },
    { key: "c", label: "C", description: "New circle", action: () => router.push("/circles/create") },
    { key: "t", label: "T", description: "Toggle theme", action: toggleTheme },
    { key: "/", label: "/", description: "Focus search", action: () => {
      const el = document.querySelector<HTMLInputElement>("[data-search-input]")
      if (el) { el.focus(); el.select() }
    }},
    { key: "g h", label: "G H", description: "Go to home", action: () => router.push("/circles") },
    { key: "g w", label: "G W", description: "Go to wallet", action: () => router.push("/wallet") },
    { key: "g n", label: "G N", description: "Go to notifications", action: () => router.push("/notifications") },
    { key: "g s", label: "G S", description: "Go to settings", action: () => router.push("/settings") },
    { key: "g p", label: "G P", description: "Go to profile", action: () => router.push("/profile") },
    { key: "b", label: "B", description: "Toggle sidebar", action: toggleSidebar },
  ], [router, toggleTheme, toggleSidebar])

  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  const closeHelp = useCallback(() => setHelpOpen(false), [])

  useEffect(() => {
    let pendingPrefix: string | null = null
    let prefixTimer: ReturnType<typeof setTimeout> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (e.key === "Escape") {
        setHelpOpen(false)
        return
      }

      const key = e.key.toLowerCase()

      if (pendingPrefix === "g") {
        pendingPrefix = null
        if (prefixTimer) clearTimeout(prefixTimer)
        const combo = `g ${key}`
        const shortcut = shortcutsRef.current.find((s) => s.key === combo)
        if (shortcut) {
          e.preventDefault()
          shortcut.action()
        }
        return
      }

      if (key === "g") {
        pendingPrefix = "g"
        prefixTimer = setTimeout(() => { pendingPrefix = null }, 1000)
        return
      }

      const shortcut = shortcutsRef.current.find((s) => s.key === key)
      if (shortcut) {
        e.preventDefault()
        shortcut.action()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      if (prefixTimer) clearTimeout(prefixTimer)
    }
  }, [])

  return { shortcuts, helpOpen, closeHelp }
}
