'use client'

import { usePathname } from 'next/navigation'
import { AdminButton } from './admin-button'
import { ConnectWallet } from './connect-wallet'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from './ui/button'
import { ArrowLeft } from 'lucide-react'
import { useWallet } from '@/hooks/use-wallet'

export function Header() {
  const pathname = usePathname()
  const { address } = useWallet()
  const isAdminPage = pathname === '/admin'

  return (
    <header className="fixed top-0 left-0 right-0 z-[40] bg-zinc-900 border-b border-zinc-800">
      <nav className="mx-auto max-w-[1200px] px-3 md:px-4">
        <div className="flex h-14 md:h-16 items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/liondexlogo.png"
                alt="LionDEX Logo"
                width={32}
                height={32}
                className="w-8 h-8 md:w-9 md:h-9"
                priority
              />
              <span className="text-lg md:text-xl font-bold text-white">
                LionDEX
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 md:gap-4">
            {isAdminPage && (
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Back to DEX</span>
                </Button>
              </Link>
            )}
            <ConnectWallet />
            {address && !isAdminPage && <AdminButton />}
          </div>
        </div>
      </nav>
    </header>
  )
}