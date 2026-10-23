"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeftRight, Check, Copy, Search, Trash2 } from "lucide-react"

interface CompareSelectorProps {
  idA: string
  idB: string
  onChangeA: (id: string) => void
  onChangeB: (id: string) => void
  onSwap: () => void
  onClear: () => void
}

export function CompareSelector({
  idA,
  idB,
  onChangeA,
  onChangeB,
  onSwap,
  onClear,
}: CompareSelectorProps) {
  const [copied, setCopied] = useState(false)
  const [inputA, setInputA] = useState(idA)
  const [inputB, setInputB] = useState(idB)

  // Keep internal inputs synced with prop values
  React.useEffect(() => {
    setInputA(idA)
  }, [idA])

  React.useEffect(() => {
    setInputB(idB)
  }, [idB])

  const copyUrl = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback
      }
    }
  }

  const applyA = () => {
    const trimmed = inputA.trim()
    if (trimmed !== idA) onChangeA(trimmed)
  }

  const applyB = () => {
    const trimmed = inputB.trim()
    if (trimmed !== idB) onChangeB(trimmed)
  }

  return (
    <div className="bg-white/[0.02] border border-border p-4 rounded-xl space-y-4">
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Circle 1 Input */}
        <div className="flex-1 w-full">
          <label htmlFor="circle-1-id" className="block text-xs font-mono font-medium text-aurora-violet mb-1">
            Circle 1 ID
          </label>
          <div className="flex gap-2">
            <Input
              id="circle-1-id"
              placeholder="e.g. circle-1 or UUID"
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              onBlur={applyA}
              onKeyDown={(e) => e.key === "Enter" && applyA()}
              leftIcon={<Search className="h-4 w-4" />}
              className="flex-1"
            />
            {inputA.trim() !== idA && (
              <Button size="sm" variant="secondary" onClick={applyA}>
                Set
              </Button>
            )}
          </div>
        </div>

        {/* Swap button */}
        <div className="pt-5 md:pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onSwap}
            title="Swap circles"
            aria-label="Swap circles"
            className="h-10 w-10 p-0 rounded-full"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Circle 2 Input */}
        <div className="flex-1 w-full">
          <label htmlFor="circle-2-id" className="block text-xs font-mono font-medium text-emerald-400 mb-1">
            Circle 2 ID
          </label>
          <div className="flex gap-2">
            <Input
              id="circle-2-id"
              placeholder="e.g. circle-2 or UUID"
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              onBlur={applyB}
              onKeyDown={(e) => e.key === "Enter" && applyB()}
              leftIcon={<Search className="h-4 w-4" />}
              className="flex-1"
            />
            {inputB.trim() !== idB && (
              <Button size="sm" variant="secondary" onClick={applyB}>
                Set
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <p className="text-muted-foreground">
          Deep-linkable comparison URL updates automatically as IDs change.
        </p>
        <div className="flex items-center gap-2">
          {(idA || idB) && (
            <Button variant="ghost" size="xs" onClick={onClear} className="text-red-400 hover:text-red-300">
              <Trash2 className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={copyUrl}
            className="gap-1 font-mono text-2xs"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied Link" : "Copy Link"}
          </Button>
        </div>
      </div>
    </div>
  )
}
