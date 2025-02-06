import { ethers } from 'ethers'

interface FeeCalculation {
  outputAmountAfterFee: bigint
  feeAmount: bigint
}

export function calculateFees(
  outputAmount: bigint,
  outputTokenPriceUSD: number
): FeeCalculation {
  const outputAmountUSD = Number(ethers.formatEther(outputAmount)) * outputTokenPriceUSD
  const feePercentage = 0.0001

  let feeUSD = outputAmountUSD * feePercentage

  feeUSD = Math.max(Math.min(feeUSD, 0.0001), 0.0001)

  const feeAmount = ethers.parseEther(
    (feeUSD / outputTokenPriceUSD).toFixed(18)
  )

  return {
    outputAmountAfterFee: outputAmount - feeAmount,
    feeAmount
  }
}

export async function sendFeeToCollector(
  tokenContract: ethers.Contract,
  feeAmount: bigint
): Promise<void> {
  try {
    const tx = await tokenContract.transfer(
      '0x0000000000000000000000000000000000000000',
      feeAmount
    )
    await tx.wait()
  } catch (error) {
    console.error('Error sending fee to collector:', error)
    throw error
  }
} 