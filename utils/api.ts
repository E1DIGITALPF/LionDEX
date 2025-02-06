import { DEX_CONFIG } from '@/config/dex'

export async function fetchLiquidity(tokenA: string, tokenB: string): Promise<number> {
  const response = await fetch(`${DEX_CONFIG.apiEndpoints.liquidity}?tokenA=${tokenA}&tokenB=${tokenB}`)
  if (!response.ok) {
    throw new Error('Failed to fetch liquidity data')
  }
  const data = await response.json()
  return data.liquidity
}

export async function fetchPrice(tokenA: string, tokenB: string): Promise<number> {
  const response = await fetch(`${DEX_CONFIG.apiEndpoints.price}?tokenA=${tokenA}&tokenB=${tokenB}`)
  if (!response.ok) {
    throw new Error('Failed to fetch price data')
  }
  const data = await response.json()
  return data.price
}

export async function performSwap(fromToken: string, toToken: string, amount: string): Promise<{ txHash: string }> {
  const response = await fetch(DEX_CONFIG.apiEndpoints.swap, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fromToken, toToken, amount }),
  })
  if (!response.ok) {
    throw new Error('Swap failed')
  }
  const data = await response.json()
  return { txHash: data.txHash }
}

