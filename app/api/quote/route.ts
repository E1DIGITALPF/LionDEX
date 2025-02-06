import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { ROUTER_ABI } from '@/config/constants'
import { WCRO_ADDRESS } from '@/config/constants'
import { getProvider } from '@/services/rpc'
import { DEX_CONFIG } from '@/config/dex'

const DEADLINE_MINUTES = 20

export async function POST(request: NextRequest) {
  try {
    const { fromToken, toToken, amount, userAddress } = await request.json()

    console.log('Quote request:', { fromToken, toToken, amount, userAddress })

    if (!fromToken || !toToken || !amount || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const provider = await getProvider()
    const actualFromToken = fromToken === 'CRO' ? WCRO_ADDRESS : fromToken
    const actualToToken = toToken === 'CRO' ? WCRO_ADDRESS : toToken

    if ((fromToken === 'CRO' && toToken === WCRO_ADDRESS) || 
        (fromToken === WCRO_ADDRESS && toToken === 'CRO')) {
      console.log('Native swap detected')
      const amountIn = ethers.parseEther(amount)
      
      return NextResponse.json({
        dex: 'Native',
        price: amount,
        path: [fromToken, toToken],
        routerAddress: WCRO_ADDRESS,
        tx: {
          to: WCRO_ADDRESS,
          data: fromToken === 'CRO' ? 
            '0xd0e30db0' :
            '0x2e1a7d4d' + ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [amountIn]).slice(2),
          value: fromToken === 'CRO' ? amountIn : BigInt(0)
        }
      })
    }

    const [decimalsIn, decimalsOut] = await Promise.all([
      getTokenDecimals(actualFromToken, provider),
      getTokenDecimals(actualToToken, provider)
    ])

    const amountIn = ethers.parseUnits(amount, decimalsIn)
    const bestQuote = { price: '0', dex: '', amounts: [] }
    
    console.log('Checking DEXs with:', {
      fromToken: actualFromToken,
      toToken: actualToToken,
      amountIn: amountIn.toString()
    })

    for (const [dexName, dexConfig] of Object.entries(DEX_CONFIG.contracts)) {
      try {
        const router = new ethers.Contract(dexConfig.router, ROUTER_ABI, provider)
        const amounts = await router.getAmountsOut(amountIn, [actualFromToken, actualToToken])
        const amountOut = ethers.formatUnits(amounts[1], decimalsOut)

        console.log(`Quote from ${dexName}:`, {
          amountIn: amountIn.toString(),
          amountOut: amounts[1].toString(),
          formatted: amountOut
        })

        if (Number(amountOut) > Number(bestQuote.price)) {
          bestQuote.price = amountOut
          bestQuote.dex = dexName
          bestQuote.amounts = amounts
        }
      } catch (error) {
        console.warn(`Error getting quote from ${dexName}:`, error)
      }
    }

    if (bestQuote.price === '0') {
      return NextResponse.json(
        { error: 'No quotes available' },
        { status: 404 }
      )
    }

    const router = new ethers.Contract(
      DEX_CONFIG.contracts[bestQuote.dex].router,
      ROUTER_ABI,
      provider
    )

    const deadline = Math.floor(Date.now() / 1000) + (DEADLINE_MINUTES * 60)
    const path = [actualFromToken, actualToToken]

    const data = router.interface.encodeFunctionData(
      fromToken === 'CRO' ? 'swapExactETHForTokens' :
      toToken === 'CRO' ? 'swapExactTokensForETH' :
      'swapExactTokensForTokens',
      fromToken === 'CRO' ? [
        0,
        path,
        userAddress,
        deadline
      ] : [
        amountIn,
        0,
        path,
        userAddress,
        deadline
      ]
    )

    return NextResponse.json({
      dex: bestQuote.dex,
      price: bestQuote.price,
      path,
      routerAddress: DEX_CONFIG.contracts[bestQuote.dex].router,
      tx: {
        to: DEX_CONFIG.contracts[bestQuote.dex].router,
        data,
        value: fromToken === 'CRO' ? amountIn : BigInt(0)
      }
    })

  } catch (error) {
    console.error('Error getting quote:', error)
    return NextResponse.json(
      { error: 'Failed to get quote' },
      { status: 500 }
    )
  }
}

async function getTokenDecimals(address: string, provider: ethers.Provider): Promise<number> {
  if (address === WCRO_ADDRESS) return 18
  const contract = new ethers.Contract(address, ['function decimals() view returns (uint8)'], provider)
  return await contract.decimals()
} 