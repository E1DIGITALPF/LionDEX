import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAddress } from 'viem'
import { withAuth, isSuperAdmin } from '@/middleware/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (adminAddress) => {
    try {
      if (!await isSuperAdmin(adminAddress)) {
        return NextResponse.json(
          { error: 'Unauthorized - Requires super admin' },
          { status: 403 }
        )
      }

      const admins = await prisma.admin.findMany({
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json(admins)
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch admins' },
        { status: 500 }
      )
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { address, role = 'ADMIN' } = await request.json()
    
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    const normalizedAddress = getAddress(address)
    
    const adminCount = await prisma.admin.count()
    
    if (adminCount === 0) {
      const superAdmin = await prisma.admin.create({
        data: {
          address: normalizedAddress,
          role: 'SUPER_ADMIN'
        }
      })
      return NextResponse.json(superAdmin, { status: 201 })
    }
    
    return withAuth(request, async (adminAddress) => {
      if (!await isSuperAdmin(adminAddress)) {
        return NextResponse.json(
          { error: 'Unauthorized - Requires super admin' },
          { status: 403 }
        )
      }

      const newAdmin = await prisma.admin.create({
        data: {
          address: normalizedAddress,
          role
        }
      })

      return NextResponse.json(newAdmin, { status: 201 })
    })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    )
  }
} 