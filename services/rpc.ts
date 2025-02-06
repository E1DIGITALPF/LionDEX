import { ethers } from 'ethers'
import { ERC20_ABI } from '@/config/constants'

const RPC_URLS = [
  'https://cronos-rpc.heavenswail.one',
  'https://evm.cronos.org',
  'https://cronos.blockpi.network/v1/rpc/public',
  'https://cronos.rpc.thirdweb.com'
]

const CRONOS_CHAIN_ID = 25

const balanceCache = new Map<string, { balance: string, timestamp: number }>()
const BALANCE_CACHE_TTL = 30000

let currentProvider: ethers.Provider | null = null
let lastProviderCheck = 0
const PROVIDER_CHECK_INTERVAL = 5000

export async function getProvider(): Promise<ethers.Provider> {
  const now = Date.now()
  
  if (currentProvider && (now - lastProviderCheck < PROVIDER_CHECK_INTERVAL)) {
    return currentProvider
  }

  lastProviderCheck = now

  if (currentProvider) {
    try {
      await currentProvider.getNetwork()
      return currentProvider
    } catch {
      console.debug('Current provider failed, trying alternatives')
      currentProvider = null
    }
  }
  
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const network = await provider.getNetwork()
      if (network.chainId === BigInt(CRONOS_CHAIN_ID)) {
        currentProvider = provider
        return provider
      }
    } catch {
      console.debug('Browser provider failed, falling back to RPC')
    }
  }

  for (const rpc of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc)
      await provider.getNetwork()
      currentProvider = provider
      return provider
    } catch {
      continue
    }
  }

  throw new Error('Could not connect to any Cronos RPC')
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  if (!walletAddress || !tokenAddress) {
    console.debug('Missing required parameters:', { tokenAddress, walletAddress })
    return '0'
  }

  const cacheKey = `${tokenAddress.toLowerCase()}-${walletAddress.toLowerCase()}`
  const cached = balanceCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
    return cached.balance
  }

  try {
    const provider = await getProvider()
    let balance: bigint
    let decimals: number

    if (tokenAddress.toLowerCase() === 'cro') {
      balance = await provider.getBalance(walletAddress)
      decimals = 18
    } else {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      
      try {
        const [balanceResult, decimalsResult] = await Promise.all([
          tokenContract.balanceOf(walletAddress),
          tokenContract.decimals()
        ])
        
        balance = balanceResult
        decimals = decimalsResult
      } catch (contractError) {
        console.error('Contract call failed:', {
          token: tokenAddress,
          error: contractError instanceof Error ? contractError.message : 'Unknown contract error'
        })
        return cached?.balance || '0'
      }
    }

    const formattedBalance = ethers.formatUnits(balance, decimals)
    
    balanceCache.set(cacheKey, {
      balance: formattedBalance,
      timestamp: Date.now()
    })

    return formattedBalance

  } catch (error) {
    console.error('Error getting balance:', {
      token: tokenAddress,
      wallet: walletAddress,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name
      } : 'Unknown error type'
    })
    
    return cached?.balance || '0'
  }
}

export async function checkRPCHealth(): Promise<boolean> {
  try {
    const provider = await getProvider()
    const network = await provider.getNetwork()
    return network.chainId === BigInt(CRONOS_CHAIN_ID)
  } catch {
    return false
  }
}

export async function isConnectedToCronos(): Promise<boolean> {
  if (!window.ethereum) return false
  
  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const network = await provider.getNetwork()
    return network.chainId === BigInt(CRONOS_CHAIN_ID)
  } catch {
    return false
  }
}

export const toBigIntSafe = (value: unknown): bigint => {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') return BigInt(value);
    return 0n;
  } catch {
    return 0n;
  }
};

