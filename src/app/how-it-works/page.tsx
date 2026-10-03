import type { Metadata } from "next"
import { buildRouteMetadata } from "@/lib/seo/route-metadata"
import Link from "next/link"
import { PublicLayout } from "@/components/layout/public-layout"
import { Dices, ListOrdered, Gavel, Vote } from "lucide-react"

export const metadata: Metadata = buildRouteMetadata("/how-it-works")

const steps = [
  { num: "01", title: "Sign in with Passkey", desc: "Use Face ID, fingerprint, or PIN to create your account. No email, no password, no wallet setup needed." },
  { num: "02", title: "Create or Join a Circle", desc: "Set the contribution amount, frequency, member count, and payout type. Your Stellar wallet is created automatically when you join." },
  { num: "03", title: "Contribute Each Cycle", desc: "You and all members contribute USDC or XLM each cycle. Smart contracts track every payment on-chain." },
  { num: "04", title: "Receive Your Payout", desc: "Each cycle, one member gets the full pool. Order: random, fixed, auction, or vote-based." },
  { num: "05", title: "Build Your Reputation", desc: "Every on-time payment builds your MoiScore (0-1000). Higher scores unlock larger circles and better terms." },
]

const payoutTypes = [
  { icon: Dices, title: "Random", desc: "Smart contract VRF selects payout order. Fair and unpredictable." },
  { icon: ListOrdered, title: "Fixed Order", desc: "Organizer defines payout order upfront. Full transparency." },
  { icon: Gavel, title: "Auction (Chit Fund)", desc: "Members bid discount amounts. Lowest bidder wins, discount shared among all." },
  { icon: Vote, title: "Vote-Based", desc: "Members vote each round on who receives payout. Coming in a future update." },
]

export default function HowItWorksPage() {
  return (
    <PublicLayout>
      <div className="auroral-mesh min-h-screen">
        <div className="container-premium py-16">
          <h1 className="holo-text font-heading text-5xl md:text-7xl font-black mb-16 text-center">How It Works</h1>
          <div className="max-w-2xl mx-auto mb-20">
            {steps.map((s, i) => (
              <div key={s.num} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full gradient-bg-extended flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">{s.num}</div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-aurora-violet to-transparent mt-2" />}
                </div>
                <div className="pb-10">
                  <h3 className="font-heading text-lg font-semibold mb-1">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <h2 className="font-heading text-3xl md:text-4xl gradient-text-extended text-center mb-10">Payout Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-20">
            {payoutTypes.map((pt) => (
              <div key={pt.title} className="glass-premium rounded-2xl p-6 tilt-hover">
                <div className="w-10 h-10 rounded-xl gradient-bg-extended flex items-center justify-center text-white mb-2">
                  <pt.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{pt.title}</h3>
                <p className="text-sm text-muted-foreground">{pt.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center p-12 rounded-2xl glass-premium max-w-lg mx-auto">
            <h2 className="font-heading text-2xl font-bold mb-3 gradient-text">Ready?</h2>
            <p className="text-muted-foreground mb-6">Create your first savings circle in under two minutes.</p>
            <Link href="/register" className="gradient-bg-premium h-12 px-8 rounded-2xl text-white font-heading font-semibold inline-flex items-center gap-2 holo-glow">Get Started</Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}