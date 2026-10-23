"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { Footer } from "@/components/layout/footer"

interface FooterLink {
  label: string
  href: string
  text: string
}

interface AuthLayoutProps {
  title?: string
  children: ReactNode
  footerLinks?: FooterLink[]
  className?: string
}

export function AuthLayout({
  title = "Moistello",
  children,
  footerLinks,
  className,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full flex-col justify-between">
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md rounded-2xl glass border border-white/10 p-8 shadow-2xl backdrop-blur-xl ${className ?? ""}`}
        >
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <h1 className="font-heading text-2xl font-bold gradient-text-extended">
                {title}
              </h1>
            </Link>
          </div>

          <div className="space-y-6">{children}</div>

          {footerLinks && footerLinks.length > 0 && (
            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-center">
              {footerLinks.map((link) => (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.href.startsWith("/") && !link.href.startsWith("/auth") && (
                      <ArrowLeft className="h-3.5 w-3.5" />
                    )}
                    {link.label}
                    <span className="text-aurora-cyan hover:underline">{link.text}</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
