import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { HomeContent } from "@/components/home-content"

export const metadata: Metadata = buildRouteMetadata("/")

export default function House() {
  return <HomeContent />
}
