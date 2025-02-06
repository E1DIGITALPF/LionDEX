import { ethers } from 'ethers'
import { getProvider } from './rpc'
import { DEX_CONFIG } from '@/config/dex'
import { WCRO_ADDRESS } from '@/config/constants'

const PRICE_FEEDS: Record<string, string> = {
  [WCRO_ADDRESS]: '0x5B55012bC6DBf545B6a5ab6237030f79b1E38beD',
  '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59': '0x51597f405303C4377E36123cBc172b13269EA163',
  '0x66e428c3f67a68878562e79a0234c1f83c208770': '0x4b41f5d4e051c1c4c4e7c14d6e293d37c4d8982c'
}

const CHAINLINK_AGGREGATOR_ABI = [
  'function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() external view returns (uint8)'
]

async function getChainlinkPrice(feedAddress: string): Promise<number> {
  const provider = await getProvider()
  const aggregator = new ethers.Contract(feedAddress, CHAINLINK_AGGREGATOR_ABI, provider)
  
  const [price, decimals] = await Promise.all([
    aggregator.latestRoundData().then(data => data.answer),
    aggregator.decimals()
  ])
  
  return Number(price) / Math.pow(10, decimals)
}

export async function getTokenPrice(
  tokenAddress: string,
  baseToken = WCRO_ADDRESS
): Promise<number> {
  try {
    const normalizedAddress = tokenAddress.toLowerCase()
    
    if (PRICE_FEEDS[normalizedAddress]) {
      return await getChainlinkPrice(PRICE_FEEDS[normalizedAddress])
    }
    
    const provider = await getProvider()
    const prices: number[] = []
    
    for (const [dexId, dexConfig] of Object.entries(DEX_CONFIG.contracts)) {
      try {
        const router = new ethers.Contract(dexConfig.router, [
          'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'
        ], provider)
        
        const amountIn = ethers.parseEther('1')
        const amounts = await router.getAmountsOut(amountIn, [tokenAddress, baseToken])
        
        prices.push(Number(ethers.formatEther(amounts[1])))
      } catch (error) {
        console.warn(`Error getting price from ${dexId}:`, error)
        continue
      }
    }
    
    if (prices.length === 0) {
      throw new Error('Could not get token price')
    }
    
    return prices.reduce((a, b) => a + b) / prices.length
    
  } catch (error) {
    console.error('Error getting token price:', error)
    throw error
  }
} 