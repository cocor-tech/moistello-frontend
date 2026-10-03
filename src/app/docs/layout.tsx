import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"

export const metadata: Metadata = buildRouteMetadata("/docs")

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
