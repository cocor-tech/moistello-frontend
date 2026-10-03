import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"

// The page in this folder is a client component, and a `"use client"` module
// cannot export `metadata`. A server layout can, so the route's description and
// OpenGraph tags are declared here instead.
export const metadata: Metadata = buildRouteMetadata("/login")

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
