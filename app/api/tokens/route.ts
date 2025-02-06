import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateTokenInput, normalizeAddress } from '@/lib/utils/token'
import type { CreateTokenInput } from '@/types/token'
import { withAuth } from '@/middleware/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const isWhitelisted = searchParams.get('whitelisted') === 'true'
    const symbol = searchParams.get('symbol')
    
    const tokens = await prisma.token.findMany({
      where: {
        ...(isWhitelisted && { isWhitelisted: true }),
        ...(symbol && { symbol: { contains: symbol.toUpperCase(), mode: 'insensitive' } })
      },
      orderBy: {
        symbol: 'asc'
      }
    })
    
    return NextResponse.json(tokens)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const input: CreateTokenInput = await request.json()
      validateTokenInput(input)
      
      const normalizedAddress = normalizeAddress(input.address)
      
      const existingToken = await prisma.token.findUnique({
        where: { address: normalizedAddress }
      })
      
      if (existingToken) {
        return NextResponse.json(
          { error: 'Token already exists' },
          { status: 400 }
        )
      }
      
      const token = await prisma.token.create({
        data: {
          ...input,
          address: normalizedAddress,
          symbol: input.symbol.toUpperCase()
        }
      })
      
      return NextResponse.json(token, { status: 201 })
    } catch (err) {
      if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }
  })
}