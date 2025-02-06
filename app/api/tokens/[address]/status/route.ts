import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAddress } from 'viem'
import { redisClient } from '@/lib/redis'

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

    return NextResponse.json({ isWhitelisted: token.isWhitelisted })
  } catch (error) {
    console.error('Error fetching token status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token status' },
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

    return NextResponse.json({ isWhitelisted: updatedToken.isWhitelisted })
  } catch (error) {
    console.error('Error updating token status:', error)
    return NextResponse.json(
      { error: 'Failed to update token status' },
      { status: 500 }
    )
  }
}