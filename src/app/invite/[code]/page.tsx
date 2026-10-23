import type { Metadata } from "next"
import { APP_NAME } from "@/lib/constants"
import { OG_IMAGE, TWITTER_SITE, absoluteUrl } from "@/lib/seo/site"
import { InviteView } from "./components/InviteView"

interface PageProps {
  params: Promise<{ code: string }> | { code: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  const code = resolved?.code || ""
  const canonical = `/invite/${code}`
  const title = `Circle Invite — ${APP_NAME}`
  const description = `Join a savings circle on ${APP_NAME}. Connect with trusted peers and build your savings together on Stellar.`

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: absoluteUrl(canonical),
      siteName: APP_NAME,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_SITE,
      title,
      description,
      images: [OG_IMAGE.url],
    },
  }
}

export default function InvitePage() {
  return <InviteView />
}
