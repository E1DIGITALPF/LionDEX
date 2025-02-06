import { CreateTokenInput } from '@/types/token'
import { getAddress } from 'viem'

export const isValidAddress = (address: string): boolean => {
  try {
    return !!getAddress(address)
  } catch {
    return false
  }
}

export const normalizeAddress = (address: string): string => {
  try {
    return getAddress(address)
  } catch {
    throw new Error('Invalid address')
  }
}

export const validateTokenInput = (input: Partial<CreateTokenInput>) => {
  if (!input.address || !isValidAddress(input.address)) {
    throw new Error('Invalid token address')
  }

  if (!input.symbol || input.symbol.length < 1) {
    throw new Error('Invalid token symbol')
  }

  if (!input.name || input.name.length < 1) {
    throw new Error('Invalid token name')
  }

  if (typeof input.decimals !== 'number' || input.decimals < 0) {
    throw new Error('Invalid decimals')
  }

  if (!input.logoURI || !input.logoURI.startsWith('http')) {
    throw new Error('Invalid logo URI')
  }

  if (!input.chainId || input.chainId !== 25) {
    throw new Error('Invalid chain ID')
  }
}

export const formatMaxAmount = (balance: string, decimals: number): string => {
  try {
    const balanceNum = Number(balance)
    if (balanceNum === 0) return '0'
    
    if (decimals === 18) {
      return (balanceNum - 0.01).toFixed(decimals)
    }
    
    return balanceNum.toString()
  } catch (error) {
    console.error('Error formatting max amount:', error)
    return '0'
  }
} 