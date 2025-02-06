import { ArrowRight, Info } from 'lucide-react'
import Image from 'next/image' 
import { ethers } from 'ethers'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Token } from '@/types/token'
import { 
  DEX_LOGOS, 
  DEX_NAMES, 
  DEFAULT_TOKEN_IMAGE, 
  DEFAULT_DEX_IMAGE,
  SLIPPAGE_PERCENTAGE 
} from '@/config/constants'

interface SwapRouteProps {
  quote: {
    dex: string
    path: string[]
    price: string
    fromDecimals: number
    toDecimals: number
  }
  fromAmount: string
  fromToken: Token
  toToken: Token
  className?: string
}

const getDexName = (dexName: string, fromToken: Token, toToken: Token): string => {
  if (fromToken.symbol === 'CRO' && toToken.symbol === 'WCRO') {
    return 'Pack CRO to WCRO'
  }
  if (fromToken.symbol === 'WCRO' && toToken.symbol === 'CRO') {
    return 'Unpack WCRO to CRO'
  }

  return DEX_NAMES[dexName] || dexName
}

export function SwapRoute({ quote, fromAmount, fromToken, toToken, className = '' }: SwapRouteProps) {
  const formatAmount = (amount: string) => {
    const num = Number(amount)
    if (num === 0) return "0"
    if (num < 0.0001) return "<0.0001"
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num)
  }

  const getTokenImage = (token: Token): string => {
    return token.logoURI || DEFAULT_TOKEN_IMAGE
  }

  const getDexLogo = (dexName: string, fromToken: Token, toToken: Token): string => {
    if (fromToken.symbol === 'CRO' && toToken.symbol === 'WCRO') {
      return DEX_LOGOS['Pack']
    }
    if (fromToken.symbol === 'WCRO' && toToken.symbol === 'CRO') {
      return DEX_LOGOS['Unpack']
    }
    
    return DEX_LOGOS[dexName] || DEFAULT_DEX_IMAGE
  }

  const getMinimumReceived = (): string => {
    const amountOut = ethers.parseUnits(quote.price, quote.toDecimals)
    const minReceived = amountOut * BigInt(1000 - SLIPPAGE_PERCENTAGE * 10) / BigInt(1000)
    return ethers.formatUnits(minReceived, quote.toDecimals)
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-zinc-400">Route</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-zinc-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[10px]">Best route through DEX protocols</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400">Impact:</span>
            <span className="text-[10px] text-green-400">{'<0.01%'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-400">Min:</span>
            <span className="text-[10px] text-zinc-300">{formatAmount(getMinimumReceived())} {toToken.symbol}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Image
            src={getTokenImage(fromToken)}
            alt={fromToken.symbol}
            width={14}
            height={14}
            className="rounded-full"
          />
          <span className="text-[10px] font-medium">
            {formatAmount(fromAmount)} {fromToken.symbol}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ArrowRight className="w-3 h-3 text-zinc-600" />
          <div className="bg-blue-500/20 rounded px-1 py-0.5 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Image
                      src={getDexLogo(quote.dex, fromToken, toToken)}
                      alt={quote.dex}
                      width={10}
                      height={10}
                      className="rounded-full hover:opacity-80 transition-opacity"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-zinc-800 border-zinc-700">
                  <p className="text-[10px]">{getDexName(quote.dex, fromToken, toToken)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-[10px] text-blue-400">100%</span>
          </div>
          <ArrowRight className="w-3 h-3 text-zinc-600" />
        </div>

        <div className="flex items-center gap-1">
          <Image
            src={getTokenImage(toToken)}
            alt={toToken.symbol}
            width={14}
            height={14}
            className="rounded-full"
          />
          <span className="text-[10px] font-medium">
            {formatAmount(quote.price)} {toToken.symbol}
          </span>
        </div>
      </div>
    </div>
  )
} 