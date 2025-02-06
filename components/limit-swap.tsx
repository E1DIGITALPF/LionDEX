'use client'

import { useState, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowDownIcon } from 'lucide-react'
import Image from 'next/image'
import TokenSelectorWrapper from './TokenSelectorWrapper'
import { useWallet } from '@/hooks/use-wallet'
import { useToast } from "@/hooks/use-toast"
import type { UseToastReturn } from "@/hooks/use-toast"
import type { Token } from '@/types/token'
import { DEX_CONFIG } from '@/config/dex'
import { placeLimitOrder } from '@/services/limit-orders'

export function LimitSwap() {
  const [fromToken, setFromToken] = useState<Token>(DEX_CONFIG.supportedTokens[0])
  const [toToken, setToToken] = useState<Token>(DEX_CONFIG.supportedTokens[1])
  const [fromAmount, setFromAmount] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast() as UseToastReturn
  const { address: walletAddress, signer } = useWallet()
  const [isFromTokenOpen, setIsFromTokenOpen] = useState(false)
  const [isToTokenOpen, setIsToTokenOpen] = useState(false)

  const handlePlaceOrder = useCallback(async () => {
    if (!fromAmount || !limitPrice || !walletAddress || !signer) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter the amount and limit price",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      const result = await placeLimitOrder({
        fromToken,
        toToken,
        fromAmount,
        limitPrice,
        signer,
        walletAddress
      })

      if (result.hash) {
        toast({
          title: "Success!",
          description: "Limit order placed successfully",
          variant: "success",
        })
      }

      setFromAmount('')
      setLimitPrice('')
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error placing order",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fromAmount, limitPrice, walletAddress, signer, fromToken, toToken, toast])

  const getTokenImage = (token: Token) => {
    return token.logoURI || 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
  }

  const calculateToAmount = () => {
    if (!fromAmount || !limitPrice) return ''
    return (Number(fromAmount) * Number(limitPrice)).toString()
  }

  return (
    <div className="space-y-2">
      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-400">Sell</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="flex-1 bg-transparent border-none text-lg p-0 focus:ring-0"
            placeholder="0.0"
          />
          <button
            onClick={() => setIsFromTokenOpen(true)}
            className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-xl hover:bg-blue-500/30"
          >
            <Image
              src={getTokenImage(fromToken)}
              alt={fromToken.symbol}
              width={18}
              height={18}
              className="rounded-full"
              unoptimized
            />
            <span className="text-sm">{fromToken.symbol}</span>
            <ArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-400">Limit Price</span>
        </div>
        <Input
          type="number"
          value={limitPrice}
          onChange={(e) => setLimitPrice(e.target.value)}
          className="bg-transparent border-none text-lg p-0 focus:ring-0"
          placeholder={`Precio en ${toToken.symbol}`}
        />
      </div>

      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-400">Receive</span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={calculateToAmount()}
            className="flex-1 bg-transparent border-none text-lg p-0 focus:ring-0"
            placeholder="0.0"
            readOnly
          />
          <button
            onClick={() => setIsToTokenOpen(true)}
            className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-xl hover:bg-blue-500/30"
          >
            <Image
              src={getTokenImage(toToken)}
              alt={toToken.symbol}
              width={18}
              height={18}
              className="rounded-full"
              unoptimized
            />
            <span className="text-sm">{toToken.symbol}</span>
            <ArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Button
        onClick={handlePlaceOrder}
        disabled={!walletAddress || !fromAmount || !limitPrice || isLoading}
        className="limit-button w-full h-9 relative group text-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="swap-spinner" />
            <span>Placing Order...</span>
            <div className="limit-order-effect" />
          </div>
        ) : !walletAddress ? (
          'Connect Wallet'
        ) : !fromAmount || !limitPrice ? (
          'Enter Amount and Price'
        ) : (
          'Place Limit Order'
        )}
      </Button>

      <TokenSelectorWrapper
        isOpen={isFromTokenOpen}
        onClose={() => setIsFromTokenOpen(false)}
        onSelect={(token) => {
          setFromToken(token)
          setFromAmount('')
        }}
        currentToken={fromToken}
      />

      <TokenSelectorWrapper
        isOpen={isToTokenOpen}
        onClose={() => setIsToTokenOpen(false)}
        onSelect={(token) => {
          setToToken(token)
          setLimitPrice('')
        }}
        currentToken={toToken}
      />
    </div>
  )
}