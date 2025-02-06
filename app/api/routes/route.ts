import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAddress } from 'viem'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing from or to parameters' },
        { status: 400 }
      )
    }

    const fromAddress = from.toLowerCase() === 'cro' ? 'CRO' : getAddress(from)
    const toAddress = to.toLowerCase() === 'cro' ? 'CRO' : getAddress(to)

    const [fromToken, toToken] = await Promise.all([
      prisma.token.findFirst({
        where: {
          OR: [
            { address: fromAddress },
            { address: { equals: fromAddress, mode: 'insensitive' } }
          ]
        }
      }),
      prisma.token.findFirst({
        where: {
          OR: [
            { address: toAddress },
            { address: { equals: toAddress, mode: 'insensitive' } }
          ]
        }
      })
    ])

    if (!fromToken || !toToken) {
      return NextResponse.json(
        { error: 'One or both tokens not found' },
        { status: 404 }
      )
    }

    const route = await prisma.route.findFirst({
      where: {
        AND: [
          { fromTokenId: fromToken.id },
          { toTokenId: toToken.id },
          { isEnabled: true }
        ]
      }
    })

    if (!route) {
      return NextResponse.json(
        { error: 'No route found between tokens' },
        { status: 404 }
      )
    }

    return NextResponse.json(route)
  } catch (error) {
    console.error('Error fetching route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch route' },
      { status: 500 }
    )
  }
} 