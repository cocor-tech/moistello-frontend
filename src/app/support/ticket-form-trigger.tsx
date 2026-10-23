"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const TicketForm = dynamic(
  () => import("./ticket-form").then((module) => module.TicketForm),
  { ssr: false }
)

export function TicketFormTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  if (isOpen) return <TicketForm />

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className="w-full bg-aurora-violet/10 text-aurora-violet hover:bg-aurora-violet/20"
      leftIcon={<SendIcon />}
      onClick={() => setIsOpen(true)}
    >
      Open Ticket Form
    </Button>
  )
}

function SendIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  )
}
