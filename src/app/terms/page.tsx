import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/terms")

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <div className="container-premium py-16 max-w-3xl mx-auto">
          <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-10">Last updated: May 2026</p>
          <div className="glass-premium rounded-2xl p-8 space-y-6">
            {[
              { title: "1. Acceptance", text: "By accessing Moistello, you agree to these Terms." },
              { title: "2. Service", text: "Moistello provides a decentralized interface for ROSCAs using Soroban smart contracts on Stellar. We do not hold, custody, or control user funds." },
              { title: "3. Eligibility", text: "You must be 18+ and not a resident of any comprehensively sanctioned jurisdiction." },
              { title: "4. User Responsibilities", text: "You are solely responsible for your wallet security, private keys, contributions, and transactions." },
              { title: "5. No Financial Advice", text: "Moistello is a software tool. We do not provide financial, investment, legal, or tax advice." },
              { title: "6. Smart Contract Risk", text: "Smart contracts are experimental. By using the Platform you accept these risks." },
              { title: "7. Limitation of Liability", text: "To the fullest extent permitted by law, Moistello is not liable for damages including loss of funds." },
              { title: "8. Governing Law", text: "Switzerland. Disputes resolved in Zug." },
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