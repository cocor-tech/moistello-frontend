"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const SwaggerUIPage = dynamic(
  () => import("@/components/swagger-ui").then((mod) => mod.SwaggerUIPage),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-4 w-2/3 rounded-lg" />
        <Skeleton className="h-[450px] w-full rounded-2xl" />
      </div>
    ),
  }
);

export default function ApiDocsPage() {
  useEffect(() => {
    const styleId = "swagger-ui-overrides";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .swagger-ui .opblock {
          border-radius: 0.5rem !important;
          border: 1px solid rgb(255 255 255 / 0.1) !important;
          margin-bottom: 0.5rem !important;
        }
        .swagger-ui .opblock.opblock-get {
          background: rgb(255 255 255 / 0.02) !important;
        }
        .swagger-ui .opblock.opblock-post {
          background: rgb(255 255 255 / 0.02) !important;
        }
        .swagger-ui .opblock.opblock-patch {
          background: rgb(255 255 255 / 0.02) !important;
        }
        .swagger-ui .opblock.opblock-delete {
          background: rgb(255 255 255 / 0.02) !important;
        }
        .swagger-ui .opblock .opblock-summary {
          padding: 1rem !important;
        }
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 0.25rem !important;
        }
        .swagger-ui .opblock .opblock-summary-path {
          font-family: var(--font-jetbrains-mono), monospace !important;
        }
        .swagger-ui .btn.execute {
          border-radius: 0.375rem !important;
          font-weight: 500 !important;
        }
        .swagger-ui .btn.authorize {
          border-radius: 0.375rem !important;
          font-weight: 500 !important;
        }
        .swagger-ui .scheme-container {
          padding: 1rem !important;
          background: rgb(255 255 255 / 0.02) !important;
          border-radius: 0.5rem !important;
          margin-bottom: 1rem !important;
        }
        .swagger-ui .loading-container {
          padding: 2rem !important;
        }
        .swagger-ui .topbar {
          display: none !important;
        }
        .swagger-ui .info {
          margin-bottom: 1rem !important;
        }
        .swagger-ui .info .title {
          font-family: var(--font-space-grotesk), sans-serif !important;
        }
        .swagger-ui select,
        .swagger-ui input[type=text],
        .swagger-ui input[type=password] {
          background: rgb(255 255 255 / 0.05) !important;
          border: 1px solid rgb(255 255 255 / 0.1) !important;
          border-radius: 0.375rem !important;
          color: rgb(var(--foreground)) !important;
        }
        .swagger-ui .responses-inner {
          padding: 1rem !important;
        }
        .swagger-ui .response {
          border-radius: 0.5rem !important;
          border: 1px solid rgb(255 255 255 / 0.1) !important;
        }
        .swagger-ui table {
          border-radius: 0.5rem !important;
        }
        .swagger-ui .model-container {
          border-radius: 0.5rem !important;
          border: 1px solid rgb(255 255 255 / 0.1) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container-premium py-8 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              API Reference
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive documentation for the Moistello REST API
            </p>
          </div>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-foreground glass-whisper hover:glass transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Docs Home
          </Link>
        </div>
        <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-white/10 p-6 min-h-[600px]">
          <SwaggerUIPage />
        </div>
      </div>
      <footer className="glass py-8 border-t border-border mt-20">
        <div className="container-premium flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Moistello</span>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
            <Link href="/developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan" />Built on Stellar</span>
        </div>
      </footer>
    </div>
  );
}