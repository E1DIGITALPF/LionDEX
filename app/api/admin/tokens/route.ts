import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, isSuperAdmin } from '@/middleware/auth'
import { getAddress } from 'viem'
import { redisClient } from '@/lib/redis'

const TOKENS_CACHE_KEY = 'admin:tokens'

export async function GET(request: NextRequest) {
  try {
    const cachedTokens = await redisClient.get(TOKENS_CACHE_KEY)
    if (cachedTokens) {
      console.log('Returning cached tokens:', cachedTokens)
      return NextResponse.json({ data: cachedTokens })
    }

    return withAuth(request, async (adminAddress: string) => {
      try {
        console.log('Checking super admin status for:', adminAddress)
        const superAdminCheck = await isSuperAdmin(adminAddress)
        
        if (!superAdminCheck.found) {
          console.log('Not a super admin:', adminAddress)
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }

        console.log('Fetching tokens from database')
        const tokens = await prisma.token.findMany({
          select: {
            id: true,
            address: true,
            name: true,
            symbol: true,
            decimals: true,
            logoURI: true,
            isWhitelisted: true,
            fromRoutes: true,
            toRoutes: true
          },
          orderBy: { createdAt: 'desc' }
        })

        const processedTokens = tokens.map(token => ({
          ...token,
          fromRoutes: token.fromRoutes || [],
          toRoutes: token.toRoutes || [],
          logoURI: token.logoURI?.replace('coin-images.coingecko.com', 'assets.coingecko.com') || null
        }))

        console.log('Processed tokens:', processedTokens)

        await redisClient.set(TOKENS_CACHE_KEY, processedTokens, { ex: 300 })

        console.log('Returning fresh tokens')
        return NextResponse.json({ data: processedTokens })
      } catch (error) {
        console.error('Error in GET handler:', error)
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Server error' },
          { status: 500 }
        )
      }
    })
  } catch (error) {
    console.error('Error in outer GET handler:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (adminAddress) => {
    try {
      const superAdminCheck = await isSuperAdmin(adminAddress)
      if (!superAdminCheck.found) {
        return NextResponse.json(
          { error: 'Unauthorized - Requires super admin permissions' },
          { status: 403 }
        )
      }

      const data = await request.json()
      
      if (!data.address || !data.symbol || !data.name) {
        return NextResponse.json(
          { error: 'Required fields are missing' },
          { status: 400 }
        )
      }

      let normalizedAddress: string
      try {
        normalizedAddress = data.address.toLowerCase() === 'cro' 
          ? 'CRO' 
          : getAddress(data.address)
      } catch {
        return NextResponse.json(
          { error: 'Invalid token address' },
          { status: 400 }
        )
      }

      const existingToken = await prisma.token.findFirst({
        where: { address: normalizedAddress }
      })

      if (existingToken) {
        return NextResponse.json(
          { error: 'Token already exists' },
          { status: 409 }
        )
      }

      const token = await prisma.token.create({
        data: {
          address: normalizedAddress,
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          decimals: data.decimals || 18,
          logoURI: data.logoURI?.replace('coin-images.coingecko.com', 'assets.coingecko.com') || null,
          isWhitelisted: true
        }
      })

      const [croToken, whitelistedTokens] = await Promise.all([
        prisma.token.findFirst({ 
          where: { 
            OR: [
              { address: 'CRO' },
              { address: { equals: 'CRO', mode: 'insensitive' } }
            ],
            isWhitelisted: true
          } 
        }),
        prisma.token.findMany({
          where: {
            isWhitelisted: true,
            NOT: { 
              address: { 
                in: [normalizedAddress, 'CRO', 'cro', 'Cro'] 
              } 
            }
          }
        })
      ])

      if (croToken && normalizedAddress !== 'CRO') {
        await prisma.route.createMany({
          data: [
            {
              fromTokenId: croToken.id,
              toTokenId: token.id,
              isEnabled: true
            },
            {
              fromTokenId: token.id,
              toTokenId: croToken.id,
              isEnabled: true
            }
          ],
          skipDuplicates: true
        })
      }

      if (whitelistedTokens.length > 0) {
        await prisma.route.createMany({
          data: whitelistedTokens.flatMap(whitelistedToken => [
            {
              fromTokenId: token.id,
              toTokenId: whitelistedToken.id,
              isEnabled: true
            },
            {
              fromTokenId: whitelistedToken.id,
              toTokenId: token.id,
              isEnabled: true
            }
          ]),
          skipDuplicates: true
        })
      }

      const tokenWithRoutes = await prisma.token.findUnique({
        where: { id: token.id },
        include: {
          fromRoutes: {
            include: {
              toToken: true
            }
          },
          toRoutes: {
            include: {
              fromToken: true
            }
          }
        }
      })

      await redisClient.del(TOKENS_CACHE_KEY)
      
      return NextResponse.json(tokenWithRoutes)
    } catch (error) {
      console.error('Error creating token:', error)
      return NextResponse.json(
        { error: 'Failed to create token' },
        { status: 500 }
      )
    }
  })
} 