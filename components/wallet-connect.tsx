'use client'

import { createWeb3Modal } from '@web3modal/wagmi/react'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { publicProvider } from 'wagmi/providers/public'
import { walletConnectProvider } from '@web3modal/wagmi'
import { useEffect, useState } from 'react'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'
import { 
  WALLET_METADATA, 
  WALLET_THEME, 
  CRONOS_CHAIN,
  QUERY_CLIENT_CONFIG 
} from '@/config/constants'

if (!process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  throw new Error('Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID')
}

if (!process.env.NEXT_PUBLIC_GETBLOCK_API_KEY) {
  throw new Error('Missing NEXT_PUBLIC_GETBLOCK_API_KEY')
}

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID
const chains = [CRONOS_CHAIN]

const { publicClient } = configureChains(
  chains,
  [
    jsonRpcProvider({
      rpc: () => ({
        http: `https://go.getblock.io/${process.env.NEXT_PUBLIC_GETBLOCK_API_KEY}`
      })
    }),
    walletConnectProvider({ projectId }), 
    publicProvider()
  ]
)

const wagmiConfig = createConfig({
  autoConnect: true,
  publicClient
})

const queryClient = new QueryClient(QUERY_CLIENT_CONFIG)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    createWeb3Modal({
      wagmiConfig,
      projectId,
      chains,
      metadata: WALLET_METADATA,
      defaultChain: CRONOS_CHAIN,
      themeMode: 'dark',
      themeVariables: WALLET_THEME
    })
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        {children}
      </WagmiConfig>
    </QueryClientProvider>
  )
} 