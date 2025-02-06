'use client'

import { useWallet } from '@/hooks/use-wallet'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Nav() {
  const { address, isConnected } = useWallet()
  
  const isAdmin = isConnected && 
    address?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase()

  return (
    <nav className="flex items-center justify-between p-4">
      <Link href="/" className="text-xl font-bold">
        LionDEX
      </Link>


      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link href="/admin">
            <Button variant="ghost">Admin</Button>
          </Link>
        )}
      </div>
    </nav>
  )
} 