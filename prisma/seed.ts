import { PrismaClient } from '@prisma/client'
import { BASIC_TOKENS } from '../config/constants'

const prisma = new PrismaClient()

async function main() {
  const cro = await prisma.token.upsert({
    where: { address: 'CRO' },
    update: {},
    create: {
      ...BASIC_TOKENS[0],
      isWhitelisted: true
    }
  })

  const createdTokens = []
  for (const tokenData of BASIC_TOKENS.slice(1)) {
    const token = await prisma.token.upsert({
      where: { address: tokenData.address },
      update: {},
      create: {
        address: tokenData.address,
        name: tokenData.name,
        symbol: tokenData.symbol,
        decimals: tokenData.decimals,
        logoURI: tokenData.logoURI,
        isWhitelisted: true
      }
    })
    createdTokens.push(token)

    await prisma.route.upsert({
      where: {
        fromTokenId_toTokenId: {
          fromTokenId: cro.id,
          toTokenId: token.id
        }
      },
      update: {},
      create: {
        fromTokenId: cro.id,
        toTokenId: token.id,
        isEnabled: true
      }
    })

    await prisma.route.upsert({
      where: {
        fromTokenId_toTokenId: {
          fromTokenId: token.id,
          toTokenId: cro.id
        }
      },
      update: {},
      create: {
        fromTokenId: token.id,
        toTokenId: cro.id,
        isEnabled: true
      }
    })
  }

  for (let i = 0; i < createdTokens.length; i++) {
    for (let j = i + 1; j < createdTokens.length; j++) {
      await prisma.route.upsert({
        where: {
          fromTokenId_toTokenId: {
            fromTokenId: createdTokens[i].id,
            toTokenId: createdTokens[j].id
          }
        },
        update: {},
        create: {
          fromTokenId: createdTokens[i].id,
          toTokenId: createdTokens[j].id,
          isEnabled: true
        }
      })

      await prisma.route.upsert({
        where: {
          fromTokenId_toTokenId: {
            fromTokenId: createdTokens[j].id,
            toTokenId: createdTokens[i].id
          }
        },
        update: {},
        create: {
          fromTokenId: createdTokens[j].id,
          toTokenId: createdTokens[i].id,
          isEnabled: true
        }
      })
    }
  }

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 