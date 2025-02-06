import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import type { Token } from '@prisma/client'
import { useToast } from '@/components/ui/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { Pagination } from '@/components/ui/pagination'

interface TokenRoute {
  id: string
  fromTokenId: string
  toTokenId: string
  isEnabled: boolean
}

interface TokenWithRoutes extends Omit<Token, 'createdAt' | 'updatedAt'> {
  fromRoutes: TokenRoute[]
  toRoutes: TokenRoute[]
}

interface TokenListProps {
  tokens: TokenWithRoutes[]
  authHeaders: Record<string, string>
  onDeleteToken: (address: string) => Promise<void>
  onToggleStatus: (address: string, isWhitelisted: boolean) => Promise<void>
}

const ITEMS_PER_PAGE = 6

export function TokenList({ 
  tokens: initialTokens, 
  authHeaders,
  onToggleStatus 
}: TokenListProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  console.log('TokenList received:', {
    initialTokens,
    type: typeof initialTokens,
    isArray: Array.isArray(initialTokens)
  })

  const tokensArray = Array.isArray(initialTokens) ? initialTokens : []

  const filteredTokens = tokensArray.filter(token => 
    token.symbol?.toLowerCase().includes(filter.toLowerCase()) ||
    token.name?.toLowerCase().includes(filter.toLowerCase()) ||
    token.address.toLowerCase().includes(filter.toLowerCase())
  )

  const totalPages = Math.ceil(filteredTokens.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedTokens = filteredTokens.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const handleDelete = useCallback(async (tokenAddress: string) => {
    if (!authHeaders['x-admin-signature']) {
      toast({
        title: "Error",
        description: "Please connect your wallet",
        variant: "destructive"
      })
      return
    }

    try {
      queryClient.setQueryData(['admin-tokens'], (old: TokenWithRoutes[] | undefined) => {
        if (!old) return old
        return old.filter(token => token.address !== tokenAddress)
      })

      const response = await fetch(`/api/admin/tokens/${tokenAddress}`, {
        method: 'DELETE',
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error('Error deleting token')
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.message || "Token deleted successfully",
        variant: "default"
      })

      await queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
    } catch (error) {
      console.error('Error deleting token:', error)
      
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error deleting token",
        variant: "destructive"
      })
    }
  }, [authHeaders, queryClient, toast])

  const handleToggleStatus = async (token: TokenWithRoutes) => {
    try {
      queryClient.setQueryData(['admin-tokens'], (old: TokenWithRoutes[] | undefined) => {
        if (!old) return old
        return old.map(t => 
          t.id === token.id 
            ? { ...t, isWhitelisted: !t.isWhitelisted }
            : t
        )
      })

      await onToggleStatus(token.address, !token.isWhitelisted)

      toast({
        title: "Success",
        description: "Token status updated successfully"
      })
    } catch {
      queryClient.invalidateQueries({ queryKey: ['admin-tokens'] })
      
      toast({
        title: "Error",
        description: "Failed to update token status",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="w-full">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrar tokens..."
        className="mb-2 md:mb-3 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-8 text-xs md:text-sm"
      />
      
      <div className="space-y-1.5 md:space-y-2">
        {paginatedTokens.map((token) => (
          <div 
            key={token.address} 
            className="flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 bg-zinc-800/50 rounded-md border border-zinc-700 text-sm"
          >
            <div className="w-5 h-5 md:w-6 md:h-6 relative shrink-0">
              {token.logoURI ? (
                <Image
                  src={token.logoURI}
                  alt={token.name || ''}
                  width={24}
                  height={24}
                  className="rounded-full w-full h-full"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-zinc-700 rounded-full flex items-center justify-center">
                  <span className="text-[10px] md:text-xs text-zinc-400">
                    {token.symbol?.slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="font-bold text-white text-xs md:text-sm">{token.symbol}</span>
                <span className="text-zinc-400 text-xs md:text-sm truncate hidden xs:block">
                  {token.name}
                </span>
              </div>
              <div className="text-[10px] md:text-xs text-zinc-500 truncate">
                {token.address.slice(0, 8)}...{token.address.slice(-6)}
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              <Switch
                checked={token.isWhitelisted}
                onCheckedChange={() => handleToggleStatus(token)}
                className="scale-[0.65] md:scale-75"
              />
              <span className="text-[10px] md:text-xs text-zinc-400 hidden sm:inline">
                {token.isWhitelisted ? 'Whitelisted' : 'Not Whitelisted'}
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-6 md:h-7 px-1.5 md:px-2 text-[10px] md:text-xs"
                onClick={() => handleDelete(token.address)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 md:mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  )
} 