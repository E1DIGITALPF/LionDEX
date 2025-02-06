import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, isSuperAdmin } from '@/middleware/auth'
import { getAddress } from 'viem'
import { ethers } from 'ethers'
import { getProvider } from '@/services/rpc'
import { redisClient } from '@/lib/redis'

const TOKENS_CACHE_KEY = 'admin:tokens'

interface Params {
  address: string;
}

interface RouteContext {
  params: Promise<Params>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const { address } = await params;

  try {
    let normalizedAddress: string
    if (address.toLowerCase() === 'cro') {
      normalizedAddress = 'CRO'
    } else {
      try {
        normalizedAddress = getAddress(address)
      } catch {
        return NextResponse.json(
          { error: 'Invalid token address' },
          { status: 400 }
        )
      }
    }

    const cachedToken = await redisClient.get(`token:${normalizedAddress}`)
    if (cachedToken) {
      return NextResponse.json(cachedToken)
    }

    const token = await prisma.token.findFirst({
      where: {
        OR: [
          { address: normalizedAddress },
          { address: { equals: normalizedAddress, mode: 'insensitive' } }
        ]
      }
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    await redisClient.set(`token:${normalizedAddress}`, token, { ex: 3600 })

    return NextResponse.json(token)
  } catch (error) {
    console.error('Error fetching token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  const { address } = await params;

  try {
    let normalizedAddress: string
    if (address.toLowerCase() === 'cro') {
      normalizedAddress = 'CRO'
    } else {
      try {
        normalizedAddress = getAddress(address)
      } catch {
        return NextResponse.json(
          { error: 'Invalid token address' },
          { status: 400 }
        )
      }
    }

    return withAuth(request, async (adminAddress) => {
      if (!await isSuperAdmin(adminAddress)) {
        return NextResponse.json(
          { error: 'Unauthorized - Requires super admin permissions' },
          { status: 403 }
        )
      }

      let name: string | undefined
      let symbol: string | undefined
      let decimals: number | undefined

      if (normalizedAddress !== 'CRO') {
        const provider = await getProvider()
        const tokenContract = new ethers.Contract(
          normalizedAddress,
          [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
          ],
          provider
        )

        try {
          name = await tokenContract.name()
          symbol = await tokenContract.symbol()
          decimals = await tokenContract.decimals()
        } catch (error) {
          console.warn('Error fetching token info:', error)
        }
      } else {
        name = 'Cronos'
        symbol = 'CRO'
        decimals = 18
      }

      const token = await prisma.token.create({
        data: {
          address: normalizedAddress,
          name: name || 'Unknown Token',
          symbol: symbol || 'UNKNOWN',
          decimals: decimals || 18,
          isWhitelisted: true
        }
      })

      if (normalizedAddress !== 'CRO') {
        const croToken = await prisma.token.findFirst({
          where: { address: 'CRO' }
        })

        if (croToken) {
          await prisma.route.create({
            data: {
              fromTokenId: croToken.id,
              toTokenId: token.id,
              isEnabled: true
            }
          })

          await prisma.route.create({
            data: {
              fromTokenId: token.id,
              toTokenId: croToken.id,
              isEnabled: true
            }
          })
        }
      }

      const tokenWithRoutes = await prisma.token.findUnique({
        where: { id: token.id },
        include: {
          fromRoutes: true,
          toRoutes: true
        }
      })

      return NextResponse.json(tokenWithRoutes)
    })
  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create token' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const { address } = await params;
  
  try {
    const body = await request.json();
    const { isWhitelisted } = body;

    let normalizedAddress: string
    if (address.toLowerCase() === 'cro') {
      normalizedAddress = 'CRO'
    } else {
      try {
        normalizedAddress = getAddress(address)
      } catch {
        return NextResponse.json(
          { error: 'Invalid token address' },
          { status: 400 }
        )
      }
    }

    const token = await prisma.token.findFirst({
      where: {
        OR: [
          { address: normalizedAddress },
          { address: { equals: normalizedAddress, mode: 'insensitive' } }
        ]
      }
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    const updatedToken = await prisma.token.update({
      where: { id: token.id },
      data: { isWhitelisted }
    })

    await redisClient.del(`token:${normalizedAddress}`)
    await redisClient.del(TOKENS_CACHE_KEY)

    return NextResponse.json(updatedToken)
  } catch (error) {
    console.error('Error updating token:', error)
    return NextResponse.json(
      { error: 'Failed to update token' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  const { address } = await params;

  return withAuth(request, async (adminAddress) => {
    try {
      const superAdminCheck = await isSuperAdmin(adminAddress)
      if (!superAdminCheck.found) {
        return Response.json(
          { error: 'Unauthorized - Requires super admin permissions' },
          { status: 403 }
        )
      }

      let normalizedAddress: string
      try {
        normalizedAddress = address.toLowerCase() === 'cro' 
          ? 'CRO' 
          : getAddress(address)
      } catch {
        return Response.json(
          { error: 'Invalid token address' },
          { status: 400 }
        )
      }

      const token = await prisma.token.findFirst({
        where: {
          OR: [
            { address: normalizedAddress },
            { address: { equals: normalizedAddress, mode: 'insensitive' } }
          ]
        }
      })

      if (!token) {
        return Response.json(
          { error: 'Token not found' },
          { status: 404 }
        )
      }

      await prisma.$transaction(async (tx) => {
        await tx.route.deleteMany({
          where: {
            OR: [
              { fromTokenId: token.id },
              { toTokenId: token.id }
            ]
          }
        })

        await tx.token.delete({
          where: { id: token.id }
        })
      })

      await Promise.all([
        redisClient.del(`token:${normalizedAddress}`),
        redisClient.del(TOKENS_CACHE_KEY)
      ])

      return Response.json({ 
        success: true,
        message: 'Token deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting token:', error)
      return Response.json(
        { 
          error: 'Failed to delete token',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
} 