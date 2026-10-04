"use client"

import { useState } from "react"
import Link from "next/link"
import { Activity, ExternalLink, House, RefreshCw, Send, CheckCircle } from "lucide-react"

export default function InternalError() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get request ID from URL if present
  const requestId = typeof window !== "undefined" 
    ? new URLSearchParams(window.location.search).get("request_id") 
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !message.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          message,
          requestId,
          errorType: "500",
        }),
      })

      if (response.ok) {
        setSubmitted(true)
        setEmail("")
        setMessage("")
      }
    } catch (err) {
      console.error("Failed to submit support request:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-red-500/[0.06] px-6 pb-20 pt-16 md:pt-24">
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden="true"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(239,68,68,.12) 0, rgba(239,68,68,.12) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="container-premium relative">
          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-red-400">
            <Activity className="h-5 w-5" />
            Service interruption
          </div>
          <div className="mt-7 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h1 className="font-heading text-5xl font-black text-foreground md:text-7xl">Something broke upstream.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                The server could not complete this request. Your data is unchanged; retry shortly or check service status.
              </p>
            </div>
            <p className="font-mono text-8xl font-black leading-none text-red-400 md:text-9xl">500</p>
          </div>
        </div>
      </section>

      <section className="container-premium -mt-8 pb-16">
        <div className="relative border border-border bg-background px-6 py-8 shadow-2xl md:px-10">
          <div className="absolute left-0 top-0 h-1 w-1/3 bg-red-400" aria-hidden="true" />
          <div className="mb-8 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-red-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Recovery options</span>
            <div className="h-px flex-1 bg-gradient-to-r from-red-400/40 to-transparent" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => location.reload()} className="inline-flex items-center justify-center gap-2 bg-red-500 px-5 py-3 font-heading font-semibold text-white">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link href="/status" className="inline-flex items-center justify-center gap-2 border border-border px-5 py-3 font-heading text-foreground hover:border-red-400/50">
              <ExternalLink className="h-4 w-4" />
              System status
            </Link>
            <Link href="/" className="inline-flex items-center justify-center gap-2 px-5 py-3 font-heading text-muted-foreground hover:text-foreground">
              <House className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>

        <div className="mt-8 border border-border bg-background px-6 py-8 shadow-2xl md:px-10">
          <div className="absolute left-0 top-0 h-1 w-1/3 bg-aurora-violet" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">Report this issue</h2>
          
          {submitted ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <p>Support request submitted. We'll look into it shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Your email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  What were you trying to do?
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                  placeholder="Describe what happened..."
                />
              </div>
              {requestId && (
                <div className="text-sm text-muted-foreground">
                  Request ID: <code className="font-mono">{requestId}</code>
                </div>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 bg-aurora-violet px-5 py-3 font-heading font-semibold text-white hover:bg-aurora-violet/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Sending..." : "Send report"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
