import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import Link from "next/link"
import { PublicLayout } from "@/components/layout/public-layout"

export const metadata: Metadata = buildRouteMetadata("/faq")

const faqs = [
  { q: "What is a savings circle (ROSCA)?", a: "A Rotating Savings and Credit Association is a group who contribute a fixed amount regularly. Each cycle, one member receives the total pool. Known worldwide as esusu, tontine, chit fund, tanda, and hui." },
  { q: "How is Moistello different?", a: "Traditional circles rely on trust. Moistello uses passkey-based authentication and Soroban smart contracts to enforce rules transparently. No email, no password, no bank account needed. Sign in with your biometrics (Face ID, fingerprint) and start saving." },
  { q: "Do I need a bank account?", a: "No. You don't even need a Stellar wallet. Moistello creates one for you automatically using your passkey (Face ID or fingerprint). Just sign in and start saving. Accessible to anyone with a smartphone." },
  { q: "What currencies?", a: "USDC (Stellar). More stablecoins on the roadmap." },
  { q: "What if someone doesn't pay?", a: "Late payments incur a configurable penalty. After max strikes, the member is removed from the circle." },
  { q: "What is MoiScore?", a: "Your on-chain reputation (0-1000) built from streak, completions, volume, and recency. High scores unlock larger circles and better opportunities." },
  { q: "Is it free?", a: "Completely free to create and join circles. Stellar network fees are less than $0.001 per transaction. Zero platform fees — period." },
]

export default function FAQPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <div className="container-premium py-16">
          <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-16 text-center">FAQ</h1>
          <div className="max-w-2xl mx-auto space-y-3 mb-16">
            {faqs.map((faq, i) => (
              <details key={i} className="glass rounded-2xl group cursor-pointer overflow-hidden">
                <summary className="flex items-center justify-between p-5 font-heading text-lg font-medium hover:text-foreground transition-colors">
                  {faq.q}
                  <span className="text-xl text-muted-foreground group-open:rotate-45 transition-transform shrink-0 ml-4">+</span>
                </summary>
                <div className="px-5 pb-5 text-muted-foreground leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
          <div className="text-center p-8 rounded-2xl glass-premium max-w-md mx-auto">
            <h2 className="font-heading text-xl font-bold mb-2">Still have questions?</h2>
            <p className="text-muted-foreground mb-4">Join our Discord or open an issue on GitHub.</p>
            <Link href="/register" className="gradient-bg-premium h-10 px-6 rounded-xl text-white font-heading font-semibold inline-flex items-center gap-2">Get Started</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}