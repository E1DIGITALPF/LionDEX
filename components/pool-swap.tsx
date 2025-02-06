'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { getTokenBalance } from '@/services/rpc'
import { addLiquidity } from '@/services/liquidity'
import { SlippageSettings } from './slippage-settings'

export function PoolSwap() {
  const [fromToken, setFromToken] = useState<Token>(DEX_CONFIG.supportedTokens[0])
  const [toToken, setToToken] = useState<Token>(DEX_CONFIG.supportedTokens[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromBalance, setFromBalance] = useState<string>('0')
  const [toBalance, setToBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast() as UseToastReturn
  const { address: walletAddress, signer } = useWallet()
  const [isFromTokenOpen, setIsFromTokenOpen] = useState(false)
  const [isToTokenOpen, setIsToTokenOpen] = useState(false)
  const [slippage, setSlippage] = useState(1.5)

  useEffect(() => {
    async function updateBalances() {
      if (!walletAddress) {
        setFromBalance('0')
        setToBalance('0')
        return
      }

      try {
        const [fromBalanceResult, toBalanceResult] = await Promise.all([
          getTokenBalance(fromToken.address, walletAddress),
          getTokenBalance(toToken.address, walletAddress)
        ])

        setFromBalance(fromBalanceResult)
        setToBalance(toBalanceResult)
      } catch (error) {
        console.error('Error updating balances:', error)
      }
    }

    updateBalances()
  }, [walletAddress, fromToken.address, toToken.address])

  const handleAddLiquidity = useCallback(async () => {
    if (!fromAmount || !toAmount || !walletAddress || !signer) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter the amounts",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      const result = await addLiquidity({
        token0: fromToken,
        token1: toToken,
        amount0: fromAmount,
        amount1: toAmount,
        slippage,
        signer,
        walletAddress
      })

      if (result.hash) {
        toast({
          title: "Success!",
          description: "Liquidity added successfully",
          variant: "success",
        })
      }

      setFromAmount('')
      setToAmount('')
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error adding liquidity",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [fromAmount, toAmount, walletAddress, signer, fromToken, toToken, slippage, toast])

  const formatBalance = (balance: string) => {
    const num = Number(balance)
    return num === 0 ? "0.00" : num.toFixed(6)
  }

  const getTokenImage = (token: Token) => {
    return token.logoURI || 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
  }

  return (
    <div className="space-y-2">
      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-400">Token 1</span>
          <span className="text-xs text-zinc-400">
            Balance: {formatBalance(fromBalance)}
          </span>
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

      <div className="flex justify-center">
        <div className="p-1 rounded-full bg-zinc-800">
          <span className="text-lg">+</span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-zinc-400">Token 2</span>
          <span className="text-xs text-zinc-400">
            Balance: {formatBalance(toBalance)}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            className="flex-1 bg-transparent border-none text-lg p-0 focus:ring-0"
            placeholder="0.0"
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

      <div className="p-2.5 rounded-lg bg-zinc-800/50">
        <SlippageSettings 
          slippage={slippage}
          onSlippageChange={setSlippage}
        />
      </div>

      <Button
        onClick={handleAddLiquidity}
        disabled={!walletAddress || !fromAmount || !toAmount || isLoading}
        className="pool-button w-full h-9 relative group text-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="swap-spinner" />
            <span>Depositando...</span>
            <div className="pool-deposit-effect" />
          </div>
        ) : !walletAddress ? (
          'Connect Wallet'
        ) : !fromAmount || !toAmount ? (
          'Enter Amounts'
        ) : (
          'Add Liquidity'
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
          setToAmount('')
        }}
        currentToken={toToken}
      />
    </div>
  )
}