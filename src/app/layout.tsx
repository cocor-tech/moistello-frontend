import type { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import { Space_Grotesk } from "next/font/google"
import { Inter } from "next/font/google"
import { JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/providers/query-provider"
import { WsProvider } from "@/providers/ws-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import { MotionProvider } from "@/providers/motion-provider"
import { AuthProvider } from "@/providers/auth-provider"
import { ToastProvider } from "@/providers/toast-provider"
import { MonitoringProvider } from "@/providers/monitoring-provider"
import { LocaleProvider } from "@/lib/locale/context"
import { PwaRegister } from "@/components/pwa-register"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Moistello — Stellar Savings Circles",
  description: "Decentralized rotating savings and credit circles on Stellar. Join trustless ROSCAs with USDC/XLM, build MoiScore reputation, and achieve financial freedom.",
  keywords: "moistello, stellar, blockchain, savings circles, defi, decentralized finance, rotating credit, USDC, XLM, smart contracts, soroban",
  authors: [{ name: "Nekwachukwu Ucheokoye" }],
  creator: "Nekwachukwu Ucheokoye",
  publisher: "Moistello",
  metadataBase: new URL("https://moistello.com"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://moistello.com",
    siteName: "Moistello",
    title: "Moistello — Decentralized Savings Circles on Stellar",
    description: "Join trustless savings circles with zero intermediaries. Built on Stellar for true financial sovereignty and on-chain reputation.",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Moistello - Decentralized Stellar Savings Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@moistello",
    creator: "@nekwasar",
    title: "Moistello — Stellar Savings Circles",
    description: "Build trustless savings circles on Stellar. Join rotating credit groups with USDC/XLM, earn on-chain reputation, and achieve financial sovereignty.",
    images: ["/logo.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08080c" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Minted by middleware for this request. Every inline script below must
  // carry it or the Content-Security-Policy will refuse to execute it.
  const requestHeaders = headers()
  const nonce = requestHeaders.get("x-nonce") ?? undefined
  const csrfToken = requestHeaders.get("x-csrf-token") ?? undefined

  return (
    <html lang="en" suppressHydrationWarning>
<head>
        {csrfToken ? <meta name="csrf-token" content={csrfToken} /> : null}
         <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('moistello_theme');var theme='system';var density='comfortable';var fontSize='medium';if(t){var p=JSON.parse(t);if(p.state){theme=p.state.theme||'system';density=p.state.density||'comfortable';fontSize=p.state.fontSize||'medium'}}if(theme==='light'){document.documentElement.classList.remove('dark')}else if(theme==='dark'){document.documentElement.classList.add('dark')}else{var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;if(prefersDark){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}document.documentElement.setAttribute('data-density',density);document.documentElement.setAttribute('data-font-size',fontSize)}catch(e){console.warn('[layout] Failed to apply theme:',e)}})()`,
            }}
          />
         <script
           type="application/ld+json"
           nonce={nonce}
           dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "Organization",
               "name": "Moistello",
               "alternateName": "Moistello Savings Platform",
               "url": "https://moistello.com",
               "logo": "https://moistello.com/logo.jpg",
               "sameAs": ["https://github.com/cocor-tech", "https://x.com/nekwasar"],
               "description": "Decentralized rotating savings and credit circles on the Stellar blockchain.",
             }),
           }}
         />
         <script
           type="application/ld+json"
           nonce={nonce}
           dangerouslySetInnerHTML={{
             __html: JSON.stringify({
               "@context": "https://schema.org",
               "@type": "WebSite",
               "name": "Moistello",
               "url": "https://moistello.com",
               "potentialAction": {
                 "@type": "SearchAction",
                 "target": "https://moistello.com/docs?q={search_term_string}",
                 "query-input": "required name=search_term_string",
               },
             }),
           }}
         />
         <script
            type="text/javascript"
            nonce={nonce}
            async
            defer
            dangerouslySetInnerHTML={{
              __html: `
(function(){
  /* Yandex Metrika — loaded asynchronously so it never blocks LCP/CLS.
     Wrapped in a consent check: if the user has declined analytics cookies
     (stored as moistello_analytics_consent=false), we skip the initialisation
     entirely. The tag.js script itself is fetched by the browser engine via
     the dynamic <script async> insertion below, which means it does not
     participate in the critical rendering path. */
  try {
    var consent = localStorage.getItem('moistello_analytics_consent');
    if (consent === 'false') return;
  } catch(e) {}
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t);a=e.getElementsByTagName(t)[0];
    k.async=1;k.defer=1;k.src=r;
    a.parentNode.insertBefore(k,a);
  })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=109691925','ym');
  ym(109691925,'init',{
    ssr:true,
    webvisor:true,
    clickmap:true,
    ecommerce:'dataLayer',
    referrer:document.referrer,
    url:location.href,
    accurateTrackBounce:true,
    trackLinks:true
  });
})();
              `,
            }}
          />
          <noscript dangerouslySetInnerHTML={{
            __html: `<div><img src="https://mc.yandex.ru/watch/109691925" style="position:absolute; left:-9999px;" alt="" /></div>`
          }} />
        </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-body bg-[rgb(var(--background))] text-[rgb(var(--foreground))] antialiased`}
      >
        <PwaRegister />
        <QueryProvider>
          <WsProvider>
          <ThemeProvider>
            <MotionProvider>
              <AuthProvider>
                <LocaleProvider>
                  <ToastProvider>
                    <MonitoringProvider>
                      {children}
                    </MonitoringProvider>
                  </ToastProvider>
                </LocaleProvider>
              </AuthProvider>
            </MotionProvider>
          </ThemeProvider>
          </WsProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
