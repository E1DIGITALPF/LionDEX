'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowDownIcon } from 'lucide-react'
import TokenSelectorWrapper from './TokenSelectorWrapper'
import { DEX_CONFIG } from '@/config/dex'
import { getTokenBalance } from '@/services/rpc'
import { getBestQuote, executeSwap, type Quote, type TokenWarning } from '@/services/aggregator'
import { useToast } from "@/hooks/use-toast"
import type { UseToastReturn } from "@/hooks/use-toast"
import { SlippageSettings } from './slippage-settings'
import { useWallet } from '@/hooks/use-wallet'
import type { Token } from '@/types/token'
import Image from 'next/image'
import { SwapRoute } from './SwapRoute'
import { DAI_ADDRESS } from '@/config/constants'
import { TUSD_ADDRESS, USDC_ADDRESS } from '@/config/constants'
import { USDT_ADDRESS } from '@/config/constants'
import { debounce } from 'lodash'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AlertTriangle, Flame } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ethers } from 'ethers'

interface EthereumError extends Error {
  code: number | string;
  action?: string;
  reason?: string;
}

interface ExtendedQuote extends Quote {
  warnings?: TokenWarning[];
}

export default function TokenSwap() {
  const [fromToken, setFromToken] = useState<Token>(DEX_CONFIG.supportedTokens[0])
  const [toToken, setToToken] = useState<Token>(DEX_CONFIG.supportedTokens[1])
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromBalance, setFromBalance] = useState<string>('0')
  const [toBalance, setToBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast() as UseToastReturn
  const [slippage, setSlippage] = useState(1.5)
  const [bestQuote, setBestQuote] = useState<ExtendedQuote | null>(null)
  const { address: walletAddress, signer } = useWallet()
  const [isFromTokenOpen, setIsFromTokenOpen] = useState(false)
  const [isToTokenOpen, setIsToTokenOpen] = useState(false)
  const [swapStatus, setSwapStatus] = useState<'idle' | 'swapping'>('idle')
  const [activeTab, setActiveTab] = useState('swap')
  const [isSearchingPrice, setIsSearchingPrice] = useState(false)

  const updateBalances = useCallback(async () => {
    if (!walletAddress) {
      setFromBalance('0')
      setToBalance('0')
      return
    }

    try {
      const [fromBalanceResult, toBalanceResult] = await Promise.all([
        getTokenBalance(fromToken.address, walletAddress).catch(error => {
          console.error('Error getting from token balance:', error)
          return '0'
        }),
        getTokenBalance(toToken.address, walletAddress).catch(error => {
          console.error('Error getting to token balance:', error)
          return '0'
        })
      ])

      setFromBalance(fromBalanceResult)
      setToBalance(toBalanceResult)
    } catch (error) {
      console.error('Error updating balances:', error)
      toast({
        title: "Warning",
        description: "Could not fetch latest balances",
        variant: "destructive",
      })
    }
  }, [walletAddress, fromToken.address, toToken.address, toast])

  useEffect(() => {
    updateBalances()
  }, [updateBalances])

  const debouncedCalculatePrice = useMemo(
    () =>
      debounce(async (amount: string) => {
        if (!fromToken || !toToken || !amount || !walletAddress) return
        
        setIsLoading(true)
        try {
          const quote = await getBestQuote(
            fromToken.address,
            toToken.address,
            amount,
            walletAddress
          )

          setToAmount(quote.price)
          setBestQuote(quote)
        } catch (error) {
          console.error('Error calculating price:', error)
          setToAmount('')
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to calculate price",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }, 500),
    [fromToken, toToken, walletAddress, toast]
  )

  const calculatePrice = useCallback(
    (amount: string) => {
      debouncedCalculatePrice(amount)
    },
    [debouncedCalculatePrice]
  )

  useEffect(() => {
    const updatePrice = async () => {
      if (fromAmount && fromAmount !== '0') {
        await calculatePrice(fromAmount)
      } else {
        setToAmount('')
        setBestQuote(null)
      }
    }
    updatePrice()
  }, [fromAmount, calculatePrice])

  const handleSwap = useCallback(async () => {
    if (!fromAmount || !toAmount || !walletAddress || !bestQuote || !signer) {
      toast({
        title: "Error",
        description: "Please connect your wallet and enter an amount",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setSwapStatus('swapping')

      const balance = await getTokenBalance(fromToken.address, walletAddress)
      const requiredAmount = fromAmount

      console.log('Balance check:', {
        token: fromToken.symbol,
        balance,
        required: requiredAmount
      })

      if (Number(balance) < Number(requiredAmount)) {
        throw new Error(`Insufficient ${fromToken.symbol} balance`)
      }

      const txResponse = await executeSwap(bestQuote, signer)

      toast({
        description: (
          <div className="flex items-center gap-2">
            <div className="swap-spinner" />
            <span>Transaction pending...</span>
          </div>
        ),
        duration: Infinity,
        variant: "default",
      })

      await txResponse.wait()
      
      toast({
        description: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Transaction completed!</span>
              <a 
                href={`https://cronoscan.com/tx/${txResponse.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:opacity-80"
              >
                Watch on CronoScan
              </a>
            </div>
          </div>
        ),
        duration: 5000,
        variant: "success",
      })

      updateBalances()
      setFromAmount('')
      setToAmount('')
      setBestQuote(null)

    } catch (error: unknown) {
      if (error instanceof Error && 
          ((error as EthereumError).code === 4001 || 
           (error as EthereumError).action === 'sendTransaction' && 
           (error as EthereumError).reason === 'rejected')
      ) {
        toast({
          title: "Transaction Cancelled",
          description: "You rejected the transaction",
          variant: "default",
        })
        return
      }

      console.error('Swap error:', error)
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred'

      toast({
        title: "Error",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ),
        variant: "destructive",
      })

    } finally {
      setIsLoading(false)
      setSwapStatus('idle')
    }
  }, [
    fromAmount, 
    toAmount, 
    walletAddress, 
    bestQuote, 
    signer, 
    fromToken.address, 
    fromToken.symbol,
    toast, 
    updateBalances
  ])

  const formatBalance = (balance: string, token: Token) => {
    const num = Number(balance)
    if (num === 0) return "0.00"

    const decimals = token.decimals || 18
    
    if (num < 0.000001) {
      return num.toExponential(6)
    }

    return num.toFixed(Math.min(decimals, 6))
  }

  const getTokenImage = (token: Token) => {
    return token.logoURI || 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png'
  }

  const handleFromTokenSelect = useCallback((token: Token) => {
    setFromToken(token)
    setFromAmount('')
    setToAmount('')
  }, [])

  const handleToTokenSelect = useCallback((token: Token) => {
    setToToken(token)
    setFromAmount('')
    setToAmount('')
  }, [])

  const handleFromTokenClose = useCallback(() => {
    setIsFromTokenOpen(false)
  }, [])

  const handleToTokenClose = useCallback(() => {
    setIsToTokenOpen(false)
  }, [])

  const handleMaxClick = useCallback(() => {
    if (fromToken) {
      const isStablecoin = [USDT_ADDRESS, USDC_ADDRESS, TUSD_ADDRESS, DAI_ADDRESS]
        .map(addr => addr.toLowerCase())
        .includes(fromToken.address.toLowerCase())
      
      if (isStablecoin) {
        const balanceNum = parseFloat(fromBalance)
        if (!isNaN(balanceNum)) {
          const formattedBalance = balanceNum.toFixed(6)
          const trimmedBalance = formattedBalance.replace(/\.?0+$/, '')
          setFromAmount(trimmedBalance)
        }
      } else {
        setFromAmount(fromBalance)
      }
    }
  }, [fromToken, fromBalance])

  const updateQuote = useCallback(async () => {
    if (!fromAmount || !fromToken || !toToken || !walletAddress) return
    
    setIsSearchingPrice(true)
    try {
      const quote = await getBestQuote(
        fromToken.address,
        toToken.address,
        fromAmount,
        walletAddress
      )
      setBestQuote(quote)
      if (quote) {
        setToAmount(quote.price)
      }
    } catch (error) {
      console.error('Error getting quote:', error)
      setBestQuote(null)
      setToAmount('')
    } finally {
      setIsSearchingPrice(false)
    }
  }, [fromAmount, fromToken, toToken, walletAddress])

  useEffect(() => {
    const debounceQuote = debounce(() => {
      updateQuote()
    }, 500)

    if (fromAmount && fromToken && toToken) {
      debounceQuote()
    } else {
      setToAmount('')
      setBestQuote(null)
    }

    return () => {
      debounceQuote.cancel()
    }
  }, [fromAmount, fromToken, toToken, updateQuote])

  const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD';

  const handleBurnToken = useCallback(async (tokenAddress: string) => {
    if (!signer || !walletAddress) {
      toast({
        title: "Error",
        description: "Por favor conecta tu wallet",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)',
         'function transfer(address, uint256) returns (bool)'],
        signer
      );

      const balance = await tokenContract.balanceOf(walletAddress);
      
      if (balance <= 0) {
        throw new Error('No tokens to burn');
      }

      const tx = await tokenContract.transfer(DEAD_ADDRESS, balance);
      
      toast({
        description: (
          <div className="flex items-center gap-2">
            <div className="swap-spinner" />
            <span>Burning tokens...</span>
          </div>
        ),
        duration: Infinity,
      });

      await tx.wait();

      toast({
        description: (
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            <div className="flex flex-col">
              <span>Tokens burned successfully!</span>
              <a 
                href={`https://cronoscan.com/tx/${tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:opacity-80"
              >
                Watch on CronoScan
              </a>
            </div>
          </div>
        ),
        duration: 5000,
        variant: "success",
      });

      updateBalances();

    } catch (error) {
      console.error('Error burning token:', error)
      toast({
        title: "Error",
        description: "Error burning token: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [signer, walletAddress, toast, updateBalances])

  return (
    <main className="flex items-center justify-center min-h-screen bg-zinc-950 pt-16 pb-14 md:pt-20 md:pb-16">
      <div className="w-full max-w-[380px] mx-auto px-3 md:px-4">
        <Card className="bg-zinc-900 text-white shadow-xl">
          <CardContent className="p-2 md:p-3">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab} 
              className="w-full"
            >
              <TabsList className="w-full mb-2 md:mb-3 bg-zinc-800/50 tabs-list">
                <TabsTrigger 
                  value="swap" 
                  className={`flex-1 text-xs ${isLoading || isSearchingPrice ? 'tab-loading' : ''}`}
                  data-tab-value="swap"
                >
                  Swap
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="swap">
                <div className="space-y-2">
                  <div className="p-2 md:p-2.5 rounded-lg bg-zinc-800/50">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-zinc-400">From</span>
                      <div className="flex items-center gap-1 md:gap-2">
                        <button
                          onClick={handleMaxClick}
                          className="text-[10px] md:text-xs px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                        >
                          Max
                        </button>
                        <span className="text-[10px] md:text-xs text-zinc-400">
                          Balance: {formatBalance(fromBalance, fromToken)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        className="flex-1 bg-transparent border-none text-base md:text-lg p-0 focus:ring-0"
                        placeholder="0.0"
                      />
                      <div className="flex items-center">
                        <button
                          onClick={() => setIsFromTokenOpen(true)}
                          className="flex items-center gap-1.5 md:gap-2 px-2 py-1 bg-blue-500/20 rounded-xl hover:bg-blue-500/30"
                        >
                          <Image
                            src={getTokenImage(fromToken)}
                            alt={fromToken.symbol}
                            width={16}
                            height={16}
                            className="rounded-full"
                            unoptimized
                          />
                          <span className="text-xs md:text-sm">{fromToken.symbol}</span>
                          <ArrowDownIcon className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        {bestQuote?.warnings && bestQuote.warnings.length > 0 && (
                          <div className="ml-2 flex items-center gap-1">
                            {bestQuote.warnings.map((warning, index) => (
                              <Tooltip key={index}>
                                <TooltipTrigger>
                                  <div className="flex items-center">
                                    {warning.type === 'high_gas' && (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    )}
                                    {warning.canBurn && (
                                      <button 
                                        onClick={() => handleBurnToken(fromToken.address)}
                                        className="ml-1"
                                      >
                                        <Flame className="h-4 w-4 text-red-500 hover:text-red-400" />
                                      </button>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{warning.message}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div 
                      className="p-1 rounded-full bg-zinc-800 cursor-pointer hover:bg-zinc-700"
                      onClick={() => {
                        const temp = fromToken
                        setFromToken(toToken)
                        setToToken(temp)
                      }}
                    >
                      <ArrowDownIcon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-800/50">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-zinc-400">To (estimated)</span>
                      <span className="text-xs text-zinc-400">
                        Balance: {formatBalance(toBalance, toToken)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={toAmount}
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
                        />
                        <span className="text-sm">{toToken.symbol}</span>
                        <ArrowDownIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-2.5 py-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Price</span>
                      <span>
                        {fromAmount && toAmount
                          ? `1 ${fromToken.symbol} = ${(Number(toAmount) / Number(fromAmount)).toFixed(6)} ${toToken.symbol}`
                          : '--'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-800/50">
                    <SlippageSettings 
                      slippage={slippage}
                      onSlippageChange={setSlippage}
                    />
                  </div>

                  {bestQuote && fromAmount && toAmount && (
                    <div className="p-2.5 rounded-lg bg-zinc-800/50">
                      <SwapRoute
                        quote={bestQuote}
                        fromAmount={fromAmount}
                        fromToken={fromToken}
                        toToken={toToken}
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSwap}
                    disabled={!walletAddress || !fromAmount || !toAmount || isLoading}
                    className="swap-button w-full h-9 relative group text-sm"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="swap-spinner" />
                        <span>
                          {swapStatus === 'swapping' ? 'Swapping...' : 'Processing...'}
                        </span>
                      </div>
                    ) : !walletAddress ? (
                      'Connect Wallet'
                    ) : !fromAmount ? (
                      'Enter Amount'
                    ) : !bestQuote ? (
                      'Finding Best Price...'
                    ) : (
                      'Swap Now'
                    )}
                  </Button>

                  <TokenSelectorWrapper
                    isOpen={isFromTokenOpen}
                    onClose={handleFromTokenClose}
                    onSelect={handleFromTokenSelect}
                    currentToken={fromToken}
                  />

                  <TokenSelectorWrapper
                    isOpen={isToTokenOpen}
                    onClose={handleToTokenClose}
                    onSelect={handleToTokenSelect}
                    currentToken={toToken}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}