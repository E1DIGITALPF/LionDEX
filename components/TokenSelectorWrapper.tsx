'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useWallet } from '@/hooks/use-wallet'
import { getTokenBalance } from '@/services/rpc'
import Image from 'next/image'
import type { Token } from '@/types/token'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

interface TokenSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  currentToken: Token
}

interface TokenWithBalance extends Token {
  balance?: string
}

function TokenSelectorContent({ isOpen, onClose, onSelect, currentToken }: TokenSelectorProps) {
  const [search, setSearch] = useState('')
  const [tokens, setTokens] = useState<TokenWithBalance[]>([])
  const [whitelistedTokens, setWhitelistedTokens] = useState<TokenWithBalance[]>([])
  const { address: walletAddress } = useWallet()

  const handleSelect = useCallback((token: Token) => {
    onSelect(token)
    onClose()
  }, [onClose, onSelect])

  useEffect(() => {
    let isMounted = true

    const loadTokensWithBalances = async () => {
      if (!isOpen) return

      try {
        const response = await fetch('/api/tokens')
        const allTokens = await response.json()

        const whitelistedResponse = await fetch('/api/tokens?whitelisted=true')
        const whitelisted = await whitelistedResponse.json()

        if (!walletAddress) {
          if (isMounted) {
            setTokens(allTokens)
            setWhitelistedTokens(whitelisted)
          }
          return
        }

        const tokensWithBalances = await Promise.all(
          allTokens.map(async (token: Token) => {
            try {
              const balance = await getTokenBalance(token.address, walletAddress)
              return {
                ...token,
                balance
              }
            } catch (error) {
              console.error(`Error fetching balance for ${token.symbol}:`, error)
              return {
                ...token,
                balance: '0'
              }
            }
          })
        )

        const whitelistedWithBalances = tokensWithBalances.filter(
          token => whitelisted.some((w: Token) => w.address.toLowerCase() === token.address.toLowerCase())
        )

        if (isMounted) {
          setTokens(tokensWithBalances)
          setWhitelistedTokens(whitelistedWithBalances)
        }
      } catch (error) {
        console.error('Error loading tokens:', error)
      }
    }

    loadTokensWithBalances()

    return () => {
      isMounted = false
    }
  }, [isOpen, walletAddress])

  const formatBalance = useCallback((balance?: string) => {
    if (!balance) return '0.00'
    const num = Number(balance)
    if (num === 0) return '0.00'
    if (num < 0.000001) return '<0.000001'
    return num.toFixed(6)
  }, [])

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(search.toLowerCase()) ||
    token.name.toLowerCase().includes(search.toLowerCase()) ||
    token.address.toLowerCase() === search.toLowerCase()
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 text-white border-zinc-800 p-0 w-[95vw] max-w-[420px] max-h-[85vh] md:max-h-[600px]">
        <DialogTitle asChild>
          <VisuallyHidden>Select Token</VisuallyHidden>
        </DialogTitle>
        <div className="p-3 md:p-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-medium flex items-center gap-1">
              Select a Token 
              <QuestionMarkCircleIcon className="w-4 h-4 md:w-5 md:h-5" />
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
          
          <Input
            placeholder="Search name or paste address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-800 border-zinc-700 h-9 md:h-10 text-sm md:text-base"
            aria-label="Search tokens"
          />

          {whitelistedTokens.length > 0 && (
            <div className="mt-3 md:mt-4 mb-2">
              <h3 className="text-xs md:text-sm text-zinc-400 mb-2">
                Whitelisted Tokens
              </h3>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {whitelistedTokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => handleSelect(token)}
                    className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
                    disabled={token.address === currentToken.address}
                  >
                    <Image
                      src={token.logoURI || '/images/default-token.png'}
                      alt=""
                      width={16}
                      height={16}
                      className="rounded-full w-4 h-4 md:w-5 md:h-5"
                      unoptimized
                    />
                    <span className="text-xs md:text-sm font-medium">{token.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div 
            className="h-[50vh] md:h-[400px] overflow-y-auto space-y-1.5 md:space-y-2 mt-3 md:mt-4 pr-1" 
            role="listbox"
          >
            {filteredTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => handleSelect(token)}
                className="w-full p-2 md:p-3 flex items-center justify-between hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={token.address === currentToken.address}
                role="option"
                aria-selected={token.address === currentToken.address}
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <Image
                    src={token.logoURI || '/images/default-token.png'}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full w-7 h-7 md:w-8 md:h-8"
                    unoptimized
                  />
                  <div className="text-left">
                    <div className="font-medium text-sm md:text-base">{token.symbol}</div>
                    <div className="text-xs md:text-sm text-zinc-400">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm md:text-base">
                    {formatBalance(token.balance)}
                  </div>
                  {Number(token.balance) > 0 && token.price && (
                    <div className="text-xs md:text-sm text-zinc-400">
                      ≈ ${(Number(token.balance) * token.price).toFixed(2)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TokenSelectorWrapper(props: TokenSelectorProps) {
  return <TokenSelectorContent {...props} />
}