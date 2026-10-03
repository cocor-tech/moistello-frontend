import { MetadataRoute } from 'next'

import { INDEXABLE_ROUTES } from '@/lib/seo/route-metadata'
import { absoluteUrl } from '@/lib/seo/site'

/**
 * Sitemap is derived from the SEO registry rather than a hand-kept list, so a
 * route cannot be indexable with its own meta description while quietly missing
 * from the sitemap (or vice versa). `INDEXABLE_ROUTES` excludes the noindex
 * utility and error routes, which is exactly what a sitemap should contain.
 *
 * The audit (scripts/audit-seo-routes.mjs) fails the build if an indexable
 * registry entry is not served by a real page, so the two cannot drift.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: new Date(),
    changeFrequency: route.changeFrequency ?? 'weekly',
    priority: route.priority ?? 0.8,
  }))
}
