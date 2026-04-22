import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { AuthExpiredHandler } from "@/components/auth/auth-expired-handler"
import { LanguageProvider } from "@/components/language-provider"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "EnerCloud",
  description: "Real-time monitoring, analytics, replay, and reporting for energy storage systems.",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <LanguageProvider>
          <AuthExpiredHandler />
          {children}
          <Toaster />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
