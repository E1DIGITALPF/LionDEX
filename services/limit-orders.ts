import { ethers } from 'ethers'
import type { Token } from '@/types/token'
import { DEX_CONFIG } from '@/config/dex'

interface PlaceLimitOrderParams {
  fromToken: Token
  toToken: Token
  fromAmount: string
  limitPrice: string
  signer: ethers.Signer
  walletAddress: string
}

export async function placeLimitOrder({
  fromToken,
  toToken,
  fromAmount,
  limitPrice,
  signer,
  walletAddress
}: PlaceLimitOrderParams) {
  try {
    const dexConfig = DEX_CONFIG.contracts['VVS']
    if (!dexConfig?.router) {
      throw new Error('Router no configurado')
    }

    // TODO: Implementar un contrato específico para órdenes límite
    const router = new ethers.Contract(
      dexConfig.router,
      [
        'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)'
      ],
      signer
    )

    const tokenContract = new ethers.Contract(
      fromToken.address,
      ['function approve(address spender, uint256 amount) returns (bool)'],
      signer
    )

    await tokenContract.approve(dexConfig.router, fromAmount)

    const expectedOutput = (Number(fromAmount) * Number(limitPrice)).toString()
    const amountOutMin = BigInt(Math.floor(Number(expectedOutput) * 0.995)) // 0.5% slippage

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20

    const tx = await router.swapExactTokensForTokens(
      fromAmount,
      amountOutMin,
      [fromToken.address, toToken.address],
      walletAddress,
      deadline
    )

    return await tx.wait()
  } catch (error) {
    console.error('Error placing limit order:', error)
    throw error
  }
} 