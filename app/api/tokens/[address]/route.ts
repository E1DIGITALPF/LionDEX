import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAddress } from 'viem'
import { ethers } from 'ethers'
import { getProvider } from '@/services/rpc'

interface Params {
  address: string;
}

interface RouteContext {
  params: Params & Promise<Params>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const address = await Promise.resolve(params.address)

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
  const address = await Promise.resolve(params.address)

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

    const existingToken = await prisma.token.findFirst({
      where: {
        OR: [
          { address: normalizedAddress },
          { address: { equals: normalizedAddress, mode: 'insensitive' } }
        ]
      }
    })

    if (existingToken) {
      return NextResponse.json(
        { error: 'Token already exists' },
        { status: 400 }
      )
    }

    let name: string | undefined
    let symbol: string | undefined
    let decimals: number | undefined
    let logoURI: string | undefined

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
        name: name || `Token ${symbol?.toUpperCase() || address}`,
        symbol: symbol?.toUpperCase() || 'UNKNOWN',
        decimals: decimals || 18,
        logoURI: logoURI || null,
        isWhitelisted: false
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
            toTokenId: token.id
          }
        })

        await prisma.route.create({
          data: {
            fromTokenId: token.id,
            toTokenId: croToken.id
          }
        })
      }
    }

    return NextResponse.json(token, { status: 201 })
  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create token' },
      { status: 500 }
    )
  }
}