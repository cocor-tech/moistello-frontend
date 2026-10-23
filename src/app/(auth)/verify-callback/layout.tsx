import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"

export const metadata: Metadata = buildRouteMetadata("/verify-callback")

export default function VerifyCallbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
