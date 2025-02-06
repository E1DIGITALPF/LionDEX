import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, isSuperAdmin } from '@/middleware/auth'
import { BASIC_TOKENS } from '@/config/constants'

export async function POST(request: NextRequest) {
  return withAuth(request, async (adminAddress) => {
    try {
      const superAdminCheck = await isSuperAdmin(adminAddress)
      if (!superAdminCheck.found) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }

      console.log('Initializing basic tokens and routes...')

      const tokens = await Promise.all(
        BASIC_TOKENS.map(token => 
          prisma.token.upsert({
            where: { address: token.address },
            update: { isWhitelisted: true },
            create: {
              ...token,
              isWhitelisted: true
            }
          })
        )
      )

      console.log('Basic tokens initialized:', tokens.map(t => t.symbol))

      const routes = []
      for (let i = 0; i < tokens.length; i++) {
        for (let j = 0; j < tokens.length; j++) {
          if (i !== j) {
            routes.push({
              fromTokenId: tokens[i].id,
              toTokenId: tokens[j].id,
              isEnabled: true
            })
          }
        }
      }

      await prisma.route.createMany({
        data: routes,
        skipDuplicates: true
      })

      console.log(`Created ${routes.length} routes`)

      return NextResponse.json({ 
        success: true,
        tokens,
        routesCount: routes.length,
        message: 'Basic tokens and routes initialized'
      })
    } catch (error) {
      console.error('Error initializing routes:', error)
      return NextResponse.json(
        { error: 'Failed to initialize routes' },
        { status: 500 }
      )
    }
  })
} 