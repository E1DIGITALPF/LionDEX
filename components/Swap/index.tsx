'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Token } from '@/types/token'
import TokenSelector from '@/components/TokenSelectorWrapper'
import { useToast } from '@/components/ui/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { getBestQuote, executeSwap } from '@/services/aggregator'

export function Swap() {
  const { toast } = useToast()
  const { address, signer, isConnected } = useWallet()
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false)
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)
  const [isSelectingFrom, setIsSelectingFrom] = useState(true)
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSwap = async () => {
    if (!fromToken || !toToken || !amount || !isConnected || !signer) {
      toast({
        title: "Error",
        description: "Please connect your wallet and select tokens and amount",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)
      
      const quote = await getBestQuote(
        fromToken.address,
        toToken.address,
        amount,
        address!
      )

      const tx = await executeSwap(quote, signer)
      await tx.wait()

      toast({
        title: "Success",
        description: "Swap executed successfully"
      })

    } catch (error) {
      console.error('Swap error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to execute swap",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenSelect = (token: Token) => {
    if (isSelectingFrom) {
      setFromToken(token)
    } else {
      setToToken(token)
    }
    setIsTokenSelectorOpen(false)
  }

  return (
    <div className="p-4">
      {/* From Token */}
      <div className="mb-4">
        <div className="mb-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 bg-[#1A1625] rounded-xl text-white"
          />
        </div>
        <button
          onClick={() => {
            setIsSelectingFrom(true)
            setIsTokenSelectorOpen(true)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1A1625] rounded-xl"
        >
          {fromToken ? (
            <>
              {fromToken.logoURI && (
                <Image
                  src={fromToken.logoURI}
                  alt={fromToken.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <span>{fromToken.symbol}</span>
            </>
          ) : (
            <span>Select from token</span>
          )}
        </button>
      </div>

      {/* To Token */}
      <div className="mb-4">
        <button
          onClick={() => {
            setIsSelectingFrom(false)
            setIsTokenSelectorOpen(true)
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-[#1A1625] rounded-xl"
        >
          {toToken ? (
            <>
              {toToken.logoURI && (
                <Image
                  src={toToken.logoURI}
                  alt={toToken.symbol}
                  width={24}
                  height={24}
                  className="rounded-full"
                  unoptimized
                />
              )}
              <span>{toToken.symbol}</span>
            </>
          ) : (
            <span>Select to token</span>
          )}
        </button>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!fromToken || !toToken || !amount || isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Swapping...' : 'Swap'}
      </button>

      {fromToken && (
        <TokenSelector
          isOpen={isTokenSelectorOpen}
          onClose={() => setIsTokenSelectorOpen(false)}
          onSelect={handleTokenSelect}
          currentToken={fromToken}
        />
      )}
    </div>
  )
}
