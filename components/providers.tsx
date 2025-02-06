'use client'

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { WalletProvider } from "@/components/wallet-connect"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
        <Toaster />
      </ThemeProvider>
    </WalletProvider>
  )
} 