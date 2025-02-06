import { NextRequest, NextResponse } from 'next/server'
import { redisClient } from '@/lib/redis'

const CACHE_TTL = 60 * 60
const TOKENS_CACHE_TTL = 60 * 60 * 24
const RATE_LIMIT_TTL = 60
const RATE_LIMIT_MAX = 30
const BASE_URL = 'https://api.coingecko.com/api/v3'

interface CoinGeckoToken {
  id: string
  name: string
  symbol: string
  image: string
  market_cap_rank: number
}

interface CoinGeckoDetails {
  platforms: Record<string, string>
}

interface SearchResult {
  id: string
  name: string
  symbol: string
  thumb: string
  large: string
  market_cap_rank: number
  cronos_address: string
  logoURI: string
}

async function getCronosTokensList(): Promise<CoinGeckoToken[]> {
  const cacheKey = 'coingecko:cronos:tokens:list'
  
  try {
    const cached = await redisClient.get<CoinGeckoToken[]>(cacheKey)
    if (cached) {
      console.log('Using cached Cronos tokens list')
      return cached
    }

    const response = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&category=cronos-ecosystem&order=market_cap_desc&per_page=250&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LionDEX/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Cronos tokens')
    }

    const tokens = await response.json() as CoinGeckoToken[]
    await redisClient.set(cacheKey, tokens, { ex: TOKENS_CACHE_TTL })
    console.log(`Cached ${tokens.length} Cronos tokens`)
    return tokens
  } catch (error) {
    console.error('Error fetching Cronos tokens list:', error)
    return []
  }
}

async function searchTokens(query: string): Promise<SearchResult[]> {
  const cacheKey = `coingecko:search:${query}`
  
  try {
    const cached = await redisClient.get<SearchResult[]>(cacheKey)
    if (cached) {
      console.log('Using cached search results for:', query)
      return cached
    }

    const tokens = await getCronosTokensList()
    console.log('Searching through', tokens.length, 'tokens')

    const matchingTokens = tokens.filter(token => 
      token.symbol.toLowerCase().includes(query.toLowerCase()) ||
      token.name.toLowerCase().includes(query.toLowerCase())
    )

    console.log('Matching tokens:', matchingTokens.length)

    const results: SearchResult[] = []

    for (const token of matchingTokens.slice(0, 5)) {
      const tokenCacheKey = `coingecko:token:${token.id}`
      const cachedToken = await redisClient.get<CoinGeckoDetails>(tokenCacheKey)

      let platforms: Record<string, string> = {}

      if (cachedToken) {
        platforms = cachedToken.platforms
      } else {
        try {
          const detailsResponse = await fetch(
            `${BASE_URL}/coins/${token.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
            {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'LionDEX/1.0'
              }
            }
          )

          if (detailsResponse.ok) {
            const details = await detailsResponse.json() as CoinGeckoDetails
            platforms = details.platforms || {}
            await redisClient.set(tokenCacheKey, { platforms }, { ex: TOKENS_CACHE_TTL })
          }

          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.error(`Error fetching details for ${token.id}:`, error)
          continue
        }
      }

      const cronosEntry = Object.entries(platforms).find(([key]) => 
        key.toLowerCase().includes('cronos')
      )

      if (cronosEntry && typeof cronosEntry[1] === 'string') {
        const cronosAddress = cronosEntry[1]
        console.log(`Found Cronos token: ${token.symbol} at ${cronosAddress}`)
        results.push({
          id: token.id,
          name: token.name,
          symbol: token.symbol.toUpperCase(),
          thumb: token.image,
          large: token.image,
          market_cap_rank: token.market_cap_rank || 0,
          cronos_address: cronosAddress,
          logoURI: token.image?.replace('coin-images.coingecko.com', 'assets.coingecko.com') || token.image
        })
      }
    }

    if (results.length > 0) {
      console.log(`Found ${results.length} Cronos tokens with addresses`)
      await redisClient.set(cacheKey, results, { ex: CACHE_TTL })
    }

    return results
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')?.toLowerCase()

    if (!query) {
      return NextResponse.json([])
    }

    const rateLimitKey = `rate_limit:${ip}`
    const requestCount = await redisClient.incr(rateLimitKey)
    
    if (requestCount === 1) {
      await redisClient.expire(rateLimitKey, RATE_LIMIT_TTL)
    }

    if (requestCount > RATE_LIMIT_MAX) {
      console.log('Rate limit exceeded for IP:', ip)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const results = await searchTokens(query)
    return NextResponse.json(results)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to search tokens' },
      { status: 500 }
    )
  }
}