import { ethers } from 'ethers'
import { DEX_CONFIG, DexName } from '@/config/dex'
import { getProvider } from './rpc'
import type { Token } from '@/types/token'

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
]

const FACTORY_ABI = ['function getPair(address, address) view returns (address)']

export async function checkPoolLiquidity(
  dexName: DexName,
  token0Address: string,
  token1Address: string
): Promise<{ liquidity: bigint, dex: string }> {
  try {
    console.log(`Checking liquidity in ${dexName} for pair:`, {
      token0: token0Address,
      token1: token1Address
    })

    const provider = await getProvider()
    const dexConfig = DEX_CONFIG.contracts[dexName]
    
    if (!dexConfig?.factory) {
      return { liquidity: BigInt(0), dex: dexName }
    }

    const [sortedToken0, sortedToken1] = [token0Address, token1Address]
      .map(addr => addr.toLowerCase())
      .sort((a, b) => a < b ? -1 : 1)

    const factory = new ethers.Contract(dexConfig.factory, FACTORY_ABI, provider)
    const pairAddress = await factory.getPair(sortedToken0, sortedToken1)
    
    if (!pairAddress || pairAddress === ethers.ZeroAddress) {
      return { liquidity: BigInt(0), dex: dexName }
    }

    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider)
    
    const [token0Contract, token1Contract] = [sortedToken0, sortedToken1].map(
      addr => new ethers.Contract(addr, ['function decimals() view returns (uint8)'], provider)
    )

    const [token0Decimals, token1Decimals, reserves] = await Promise.all([
      token0Contract.decimals().catch(() => 18),
      token1Contract.decimals().catch(() => 18),
      pair.getReserves()
    ])

    const [reserve0, reserve1] = reserves
    const isToken0 = token0Address.toLowerCase() === sortedToken0
    const liquidity = isToken0 ? reserve0 : reserve1
    const decimals = isToken0 ? token0Decimals : token1Decimals

    console.log(`Raw liquidity found in ${dexName}:`, {
      pair: pairAddress,
      token0: sortedToken0,
      token1: sortedToken1,
      reserve0: reserve0.toString(),
      reserve1: reserve1.toString(),
      decimals,
      formattedLiquidity: ethers.formatUnits(liquidity, decimals)
    })

    return { 
      liquidity,
      dex: dexName
    }
  } catch (error) {
    console.error(`Error checking liquidity in ${dexName}:`, {
      error,
      token0: token0Address,
      token1: token1Address
    })
    return { liquidity: BigInt(0), dex: dexName }
  }
} 

interface AddLiquidityParams {
  token0: Token
  token1: Token
  amount0: string
  amount1: string
  slippage: number
  signer: ethers.Signer
  walletAddress: string
}

export async function addLiquidity({
  token0,
  token1,
  amount0,
  amount1,
  slippage,
  signer,
  walletAddress
}: AddLiquidityParams) {
  try {
    const dexConfig = DEX_CONFIG.contracts['VVS']
    if (!dexConfig?.router) {
      throw new Error('Router no configurado')
    }

    const token0Contract = new ethers.Contract(
      token0.address,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      signer
    )
    const token1Contract = new ethers.Contract(
      token1.address,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      signer
    )

    await Promise.all([
      token0Contract.approve(dexConfig.router, ethers.MaxUint256),
      token1Contract.approve(dexConfig.router, ethers.MaxUint256)
    ])

    const amount0Min = BigInt(Number(amount0) * (1 - slippage / 100))
    const amount1Min = BigInt(Number(amount1) * (1 - slippage / 100))

    const router = new ethers.Contract(
      dexConfig.router,
      [
        'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)'
      ],
      signer
    )

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    const tx = await router.addLiquidity(
      token0.address,
      token1.address,
      amount0,
      amount1,
      amount0Min,
      amount1Min,
      walletAddress,
      deadline
    )

    return await tx.wait()
  } catch (error) {
    console.error('Error adding liquidity:', error)
    throw error
  }
} 