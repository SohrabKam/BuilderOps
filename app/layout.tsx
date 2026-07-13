import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NoticeGuard — Never lose a smash-and-grab again",
  description: "Subcontract payment compliance for UK housebuilders and main contractors",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full bg-background text-foreground">
          {/* The app is styled for light mode only (no theme toggle exists
              anywhere in the UI) — forcedTheme keeps next-themes/Toaster
              consistent with that rather than silently defaulting to
              "system" with no provider, which useTheme() would otherwise do. */}
          <ThemeProvider attribute="class" forcedTheme="light">
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
          <div id="portal" />
        </body>
      </html>
    </ClerkProvider>
  )
}
