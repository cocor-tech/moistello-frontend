"use client"

import { useCallback } from "react"
import { Printer } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Screen-only control that opens the browser print dialog.
 *
 * Kept out of the printed sheet by `data-print-hide`, and a real `<button>`
 * rather than a link so it can call `window.print()` — the server cannot, since
 * the dialog is user-gesture-gated.
 */
export function PrintSummaryButton({ circleId }: { circleId: string }) {
  const handlePrint = useCallback(() => {
    // `window.open` with noopener keeps the print tab from reaching back into
    // this one via `window.opener` while it is open.
    const printWindow = window.open(`/circles/${circleId}/print`, "_blank", "noopener,noreferrer")
    if (!printWindow) return
    printWindow.focus()
    // The document streams in, so printing is deferred until it has loaded.
    printWindow.addEventListener("load", () => printWindow.print(), { once: true })
  }, [circleId])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={<Printer className="h-4 w-4" />}
      onClick={handlePrint}
      data-print-hide="true"
    >
      Print summary
    </Button>
  )
}
