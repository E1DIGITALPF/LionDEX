'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/hooks/use-wallet'
import { usePersistentAuth } from '@/hooks/use-persistent-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TokenList } from '@/components/admin/TokenList'
import Image from 'next/image'
import { useState, useCallback, Suspense } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Label from "@/components/ui/label"
import { useToast } from '@/components/ui/use-toast'
import { ethers } from 'ethers'
import { FeeManager } from '@/components/admin/FeeManager'

interface SearchResult {
  id: string
  name: string
  symbol: string
  thumb: string
  large: string
  market_cap_rank: number
  cronos_address: string
  logoURI?: string
}

interface NewToken {
  symbol: string
  name: string
  address: string
  decimals: number
  logoURI: string
  isWhitelisted: boolean
}

const TokenListSkeleton = () => (
  <div className="animate-pulse space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-zinc-800/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-700/50 rounded-full" />
          <div className="flex-1">
            <div className="h-4 w-20 bg-zinc-700/50 rounded mb-2" />
            <div className="h-3 w-40 bg-zinc-700/30 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
)

const DEFAULT_TOKEN_IMAGE = 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'

export default function AdminPage() {
  const router = useRouter()
  const { address, isConnected } = useWallet()
  const { authHeaders, isAuthenticating, isAdmin, isInitialized, isAuthenticated } = usePersistentAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newToken, setNewToken] = useState<NewToken>({
    symbol: '',
    name: '',
    address: '',
    decimals: 18,
    logoURI: '',
    isWhitelisted: false
  })

  useEffect(() => {
    if (isInitialized && !isAuthenticating) {
      if (!isConnected) {
        toast({
          title: "Access Denied",
          description: "Please connect your wallet",
          variant: "destructive"
        })
        router.push('/')
        return
      }

      if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin access",
          variant: "destructive"
        })
        router.push('/')
      }
    }
  }, [isInitialized, isAuthenticating, isConnected, isAdmin, router, toast])

  const { data: tokens = [], error } = useQuery({
    queryKey: ['admin-tokens', address],
    queryFn: async () => {
      if (!address || !authHeaders['x-admin-signature']) {
        return []
      }

      const response = await fetch('/api/admin/tokens', {
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tokens')
      }

      const result = await response.json()
      console.log('API Response:', result)

      const tokensData = result.data || []
      console.log('Tokens to return:', tokensData)
      
      return tokensData
    },
    enabled: isAuthenticated,
    staleTime: 30000,
    retry: false
  })

  console.log('Current tokens state:', tokens)

  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) return
    
    try {
      setIsSearching(true)
      const response = await fetch(`/api/coingecko?query=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to search tokens')
      }

      const results = await response.json()
      console.log('Search results:', results)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching tokens:', error)
      toast({
        title: "Error",
        description: "Failed to search tokens",
        variant: "destructive"
      })
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, toast])

  const handleSelectToken = useCallback((token: SearchResult) => {
    console.log('Selected token:', token)
    setNewToken({
      symbol: token.symbol.toUpperCase(),
      name: token.name,
      address: token.cronos_address,
      decimals: 18,
      logoURI: token.large || token.thumb,
      isWhitelisted: false
    })
    setSearchQuery('')
    setSearchResults([])
    toast({
      title: "Token Imported",
      description: `${token.name} (${token.symbol}) has been imported successfully`,
      variant: "default"
    })
  }, [toast])

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(handleSearch, 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchQuery, handleSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address || !authHeaders['x-admin-signature'] || isSubmitting) {
      return
    }

    if (!newToken.address || !ethers.isAddress(newToken.address)) {
      toast({
        title: "Error",
        description: "The token address is not valid",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(newToken)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error adding token')
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
      
      setNewToken({
        symbol: '',
        name: '',
        address: '',
        decimals: 18,
        logoURI: '',
        isWhitelisted: false
      })
      
      toast({
        title: "Success",
        description: `The token ${newToken.name} (${newToken.symbol}) has been added successfully`,
      })

    } catch (error) {
      console.error('Error adding token:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error adding token",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteToken = useCallback(async (tokenAddress: string) => {
    if (!address || !authHeaders['x-admin-signature']) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive"
      })
      return
    }
    
    try {
      const response = await fetch(`/api/admin/tokens/${tokenAddress}`, {
        method: 'DELETE',
        headers: authHeaders
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error deleting token')
      }

      await queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
      
      toast({
        title: "Success",
        description: "Token deleted successfully",
      })

    } catch (error) {
      console.error('Error deleting token:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error deleting token",
        variant: "destructive"
      })
    }
  }, [address, authHeaders, queryClient, toast])

  const handleToggleStatus = async (address: string, isWhitelisted: boolean) => {
    try {
      const response = await fetch(`/api/admin/tokens/${address}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ isWhitelisted })
      })

      if (!response.ok) {
        throw new Error('Failed to update token status')
      }

      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
      
      toast({
        title: isWhitelisted ? "Whitelisted" : "Not Whitelisted",
        description: `The token has been ${isWhitelisted ? 'added to' : 'removed from'} the whitelist`,
        variant: isWhitelisted ? "default" : "destructive"
      })
    } catch (error) {
      console.error('Error toggling token status:', error)
      toast({
        title: "Error",
        description: "Failed to update token status",
        variant: "destructive"
      })
    }
  }

  const handleInitRoutes = async () => {
    try {
      const response = await fetch('/api/routes/init', {
        method: 'POST',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error('Failed to initialize routes')
      }

      const result = await response.json()
      console.log('Routes initialized:', result)

      toast({
        title: "Success",
        description: "Basic routes initialized successfully",
      })

      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
    } catch (error) {
      console.error('Error initializing routes:', error)
      toast({
        title: "Error",
        description: "Failed to initialize routes",
        variant: "destructive"
      })
    }
  }

  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-16 h-16 mx-auto border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <h2 className="text-xl font-bold text-white">Verifying access...</h2>
          <p className="text-zinc-400">Please wait while we check your credentials</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950">
        <div className="text-center p-6 max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Error loading tokens</h2>
          <p className="text-zinc-400">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950 pb-20">
      {!address ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-6 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 text-zinc-400">🔒</div>
            <h3 className="text-2xl font-bold text-white">Connect your wallet</h3>
            <p className="text-zinc-400">You need to connect your wallet to access the admin panel</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[1200px] mx-auto px-3 py-4 md:py-6 mt-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Add New Token Card */}
            <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/50 shadow-2xl rounded-xl overflow-hidden">
              <div className="p-4 md:p-5">
                <h2 className="text-lg md:text-xl font-bold mb-4 text-white flex items-center gap-2">
                  <span className="text-blue-500">＋</span> Add new token
                </h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-zinc-300 text-sm">Search token</Label>
                    <div className="relative group">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or paste address..."
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 pl-3 transition-all"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSearch}
                        disabled={isSearching}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                      >
                        {isSearching ? (
                          <div className="w-4 h-4 border-2 border-zinc-500 border-t-blue-500 rounded-full animate-spin" />
                        ) : (
                          <MagnifyingGlassIcon className="h-4 w-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-2 max-h-[300px] overflow-auto rounded-xl border border-zinc-800/50 divide-y divide-zinc-800/50">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleSelectToken(result)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-all"
                          >
                            <div className="w-8 h-8 relative shrink-0">
                              {result.thumb || result.large || result.logoURI ? (
                                <Image
                                  src={result.thumb || result.large || result.logoURI || DEFAULT_TOKEN_IMAGE}
                                  alt={result.name}
                                  width={32}
                                  height={32}
                                  className="rounded-full w-full h-full"
                                  unoptimized
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = DEFAULT_TOKEN_IMAGE
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-zinc-700/50 rounded-full flex items-center justify-center">
                                  <span className="text-[10px] md:text-xs text-gray-400">
                                    {result.symbol.slice(0, 2)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2">
                                <span className="font-bold text-white text-xs md:text-sm">{result.symbol}</span>
                                <span className="text-gray-400 text-xs md:text-sm truncate">{result.name}</span>
                              </div>
                              {result.cronos_address && (
                                <div className="text-xs md:text-sm text-gray-400 truncate">
                                  {result.cronos_address.slice(0, 6)}...{result.cronos_address.slice(-4)}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="text-zinc-300 text-sm">Symbol</Label>
                      <Input
                        value={newToken.symbol}
                        onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
                        placeholder="Token symbol"
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm">Name</Label>
                      <Input
                        value={newToken.name}
                        onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                        placeholder="Token name"
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm">Contract address</Label>
                      <Input
                        value={newToken.address}
                        onChange={(e) => setNewToken({ ...newToken, address: e.target.value })}
                        placeholder="Token contract address"
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm">Logo URI</Label>
                      <Input
                        value={newToken.logoURI}
                        onChange={(e) => setNewToken({ ...newToken, logoURI: e.target.value })}
                        placeholder="Token logo URL"
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 transition-all"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-300 text-sm">Decimals</Label>
                      <Input
                        type="number"
                        value={newToken.decimals}
                        onChange={(e) => setNewToken({ ...newToken, decimals: parseInt(e.target.value) })}
                        placeholder="Token decimals"
                        className="bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white placeholder:text-zinc-500 h-10 transition-all"
                      />
                    </div>
                    <Button 
                      type="submit"
                      disabled={isSubmitting || !authHeaders['x-admin-signature']}
                      className="w-full bg-blue-600 hover:bg-blue-500 focus:bg-blue-700 text-white h-10 font-medium rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-blue-600"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                          <span>Adding token...</span>
                        </div>
                      ) : (
                        'Add Token'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>

            {/* Listed Tokens Card */}
            <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/50 shadow-2xl rounded-xl overflow-hidden">
              <div className="p-4 md:p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-blue-500">📋</span> Listed tokens
                  </h2>
                  <Button 
                    onClick={handleInitRoutes}
                    className="bg-blue-600 hover:bg-blue-500 focus:bg-blue-700 text-white px-4 h-9 font-medium rounded-xl transition-all"
                  >
                    Initialize routes
                  </Button>
                </div>
                <Suspense fallback={<TokenListSkeleton />}>
                  <TokenList
                    tokens={tokens || []}
                    authHeaders={authHeaders}
                    onDeleteToken={handleDeleteToken}
                    onToggleStatus={handleToggleStatus}
                  />
                </Suspense>
              </div>
            </Card>

            {/* Fee Manager Card */}
            <FeeManager />
          </div>
        </div>
      )}
    </main>
  )
} 