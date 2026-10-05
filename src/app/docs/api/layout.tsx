import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"

// This page is a client component (Swagger UI needs the DOM), and a
// `"use client"` module cannot export `metadata`. The server layout supplies
// the route's description and OpenGraph tags instead.
export const metadata: Metadata = buildRouteMetadata("/docs/api")

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
