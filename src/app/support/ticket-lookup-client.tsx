"use client"

import dynamic from "next/dynamic"

export const TicketLookup = dynamic(
  () => import("./ticket-lookup").then((module) => module.TicketLookup),
  { ssr: false }
)