import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ethers } from 'ethers'
import { checkPoolLiquidity } from '@/services/liquidity'
import { WCRO_ADDRESS } from '@/config/constants'
import { DexName, getSortedDexes } from '@/config/dex'

const MIN_LIQUIDITY = ethers.parseUnits('100', 18)

async function checkPoolLiquidityWithRetry(
  dex: DexName, 
  fromToken: string, 
  toToken: string, 
  retries = 3
): Promise<{dex: string, liquidity: bigint}> {
  for(let i = 0; i < retries; i++) {
    try {
      const result = await checkPoolLiquidity(dex, fromToken, toToken);
      return result;
    } catch(error) {
      if(i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Failed after retries');
}

export async function POST(request: NextRequest) {
  try {
    const { fromToken, toToken } = await request.json()

    if ((fromToken === 'CRO' && toToken === WCRO_ADDRESS) || 
        (fromToken === WCRO_ADDRESS && toToken === 'CRO')) {
      return NextResponse.json({ enabled: true })
    }

    const normalizedFromToken = fromToken === 'CRO' ? WCRO_ADDRESS : fromToken
    const normalizedToToken = toToken === 'CRO' ? WCRO_ADDRESS : toToken

    const sortedDexes = getSortedDexes()
    const liquidityChecks = await Promise.all(
      sortedDexes.map(([dexName]) => 
        checkPoolLiquidityWithRetry(dexName, normalizedFromToken, normalizedToToken)
      )
    )

    console.log('Liquidity checks:', liquidityChecks)

    const hasLiquidity = liquidityChecks.some(check => check.liquidity >= MIN_LIQUIDITY)

    if (hasLiquidity) {
      const dexWithLiquidity = liquidityChecks.find(check => check.liquidity >= MIN_LIQUIDITY)
      console.log(`Route enabled in ${dexWithLiquidity?.dex} with liquidity:`, dexWithLiquidity?.liquidity.toString())
      
      return NextResponse.json({ 
        enabled: true,
        details: {
          liquidityChecks: liquidityChecks.map(check => ({
            ...check,
            liquidity: check.liquidity.toString()
          })),
          minLiquidity: MIN_LIQUIDITY.toString()
        }
      })
    }

    const [fromTokenData, toTokenData] = await Promise.all([
      prisma.token.findFirst({
        where: {
          address: normalizedFromToken,
          isWhitelisted: true
        }
      }),
      prisma.token.findFirst({
        where: {
          address: normalizedToToken,
          isWhitelisted: true
        }
      })
    ])

    if (!fromTokenData || !toTokenData) {
      return NextResponse.json({ enabled: false })
    }

    const route = await prisma.route.findFirst({
      where: {
        fromTokenId: fromTokenData.id,
        toTokenId: toTokenData.id,
        isEnabled: true
      }
    })

    return NextResponse.json({ 
      enabled: !!route,
      details: { routeFromDB: !!route }
    })
  } catch (error) {
    console.error('Error verifying route:', error)
    return NextResponse.json({ 
      enabled: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
} 