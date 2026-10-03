import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/privacy")

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <div className="container-premium py-16 max-w-3xl mx-auto">
          <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-10">Last updated: May 2026</p>
          <div className="glass-premium rounded-2xl p-8 space-y-6">
            {[
              { title: "1. Information Collected", text: "Wallet address (public key), profile info you provide, on-chain activity (public, immutable), anonymous usage analytics." },
              { title: "2. Usage", text: "To provide the Platform, authenticate via wallet signature, display MoiScore, send circle notifications, and improve the experience." },
              { title: "3. Storage", text: "Profile data in our database. On-chain data on Stellar is permanent and cannot be deleted." },
              { title: "4. Sharing", text: "We do not sell data. Anonymized aggregates may be used for analytics. We disclose only as required by law." },
              { title: "5. Wallet Security", text: "We never have access to your private keys. You alone are responsible for wallet security." },
              { title: "6. Your Rights", text: "Request access, correction, or deletion of off-chain data. On-chain data is immutable. Disconnect your wallet anytime." },
            ].map((s) => (
              <div key={s.title}>
                <h2 className="font-heading text-lg font-semibold gradient-text mb-2">{s.title}</h2>
                <p className="text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}