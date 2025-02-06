import type { Metadata } from 'next'
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from '@radix-ui/react-tooltip';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: 'LionDEX',
  description: 'LionDEX Example',
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TooltipProvider>
          <Providers>
            <Header />
            <div className="min-h-screen">
              {children}
            </div>
            <Footer />
            <Toaster />
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  )
}