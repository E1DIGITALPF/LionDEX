'use client'

import { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { type WalletClient, useWalletClient } from 'wagmi'
import { BrowserProvider, JsonRpcSigner } from 'ethers'

async function walletClientToSigner(walletClient: WalletClient): Promise<JsonRpcSigner> {
  const { account, transport } = walletClient
  const provider = new BrowserProvider(transport)
  return provider.getSigner(account.address)
}

export function useWallet() {
  const { address, isConnected: wagmiConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { open } = useWeb3Modal()
  const { disconnect } = useDisconnect()
  const [isInitialized, setIsInitialized] = useState(false)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (walletClient) {
      walletClientToSigner(walletClient).then(setSigner).catch(console.error)
    } else {
      setSigner(null)
    }
  }, [walletClient])

  return {
    address,
    isConnected: isInitialized && wagmiConnected,
    signer,
    connect: () => open(),
    disconnect: () => disconnect()
  }
}