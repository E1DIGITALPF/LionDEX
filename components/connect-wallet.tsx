'use client'

import { Button } from "@/components/ui/button"
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount } from 'wagmi'
import { formatAddress } from "@/lib/utils"
import { useEffect, useState } from 'react'

export function ConnectWallet() {
  const { open } = useWeb3Modal()
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClick = () => {
    if (isConnected) {
      open({ view: 'Account' })
    } else {
      open()
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <Button 
      onClick={handleClick}
      variant="outline"
      className="bg-[#1a1b1e] border-[#40414f] text-white hover:bg-[#2c2d32]"
    >
      {isConnected ? formatAddress(address!) : 'Connect wallet'}
    </Button>
  )
}