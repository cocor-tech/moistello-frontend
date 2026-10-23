"use client"

import dynamic from "next/dynamic"

export const ContributionForm = dynamic(
  () => import("./contribution-form").then((m) => m.ContributionForm),
  { ssr: false }
)