"use client"

import { useCallback } from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Opens the browser print dialog for the page already on screen.
 *
 * `window.print()` rather than a link: the dialog is gesture-gated, so a plain
 * navigation would land on the page without ever showing it. This is the
 * button on the print view itself — the circle detail page uses
 * `PrintSummaryButton`, which opens this view in a new tab first.
 *
 * Hidden from the printed sheet via `data-print-hide`; a print button printed
 * onto the page it prints is a small absurdity but an obvious one.
 */
export function PrintButton() {
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      leftIcon={<Printer className="h-4 w-4" />}
      onClick={handlePrint}
      data-print-hide="true"
    >
      Print
    </Button>
  )
}
