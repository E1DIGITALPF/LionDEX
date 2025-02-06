import { ethers } from 'ethers'
import { getProvider } from '@/services/rpc'
import { FEE_MANAGER_ABI, DEFAULT_FEE_CONFIG } from './constants'

export interface FeeConfig {
  feeCollector: string
  feePercentage: number
  calculateFee: (amount: string) => Promise<string>
}

export async function getFeeConfig(): Promise<FeeConfig> {
  try {
    const provider = await getProvider()
    const feeManager = new ethers.Contract(
      process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
      FEE_MANAGER_ABI,
      provider
    )

    const [collector, percentage] = await Promise.all([
      feeManager.feeCollector(),
      feeManager.feePercentage()
    ])

    return {
      feeCollector: collector,
      feePercentage: Number(percentage) / 100,
      calculateFee: async (amount: string) => {
        const fee = await feeManager.calculateFee(ethers.parseEther(amount))
        return ethers.formatEther(fee)
      }
    }
  } catch (error) {
    console.error('Error fetching fee config:', error)
    return {
      feeCollector: process.env.NEXT_PUBLIC_DEFAULT_FEE_COLLECTOR!,
      feePercentage: DEFAULT_FEE_CONFIG.feePercentage,
      calculateFee: async (amount: string) => DEFAULT_FEE_CONFIG.calculateDefaultFee(amount)
    }
  }
} 