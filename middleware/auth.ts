import { NextRequest } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { prisma } from '@/lib/prisma'
import { redisClient } from '@/lib/redis'
import { 
  AUTH_CONSTANTS, 
  type AdminDetails 
} from '@/config/constants'

interface CacheItem<T> {
  timestamp: number
  data: T
}

function ensureString(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function setRedisCache(key: string, value: unknown, ttl: number): Promise<void> {
  const stringValue = ensureString(value)
  await redisClient.set(key, stringValue, { ex: ttl })
}

async function getRedisCache(key: string): Promise<string | null> {
  const value = await redisClient.get(key)
  if (!value || typeof value !== 'string') return null
  return value
}

const memoryAuthCache = new Map<string, CacheItem<unknown>>()

function getFromMemoryCache<T>(key: string): T | null {
  const item = memoryAuthCache.get(key)
  if (!item) return null
  if (Date.now() - item.timestamp > AUTH_CONSTANTS.CACHE_TTL * 1000) {
    memoryAuthCache.delete(key)
    return null
  }
  return item.data as T
}

function setInMemoryCache<T>(key: string, value: T): void {
  memoryAuthCache.set(key, {
    timestamp: Date.now(),
    data: value
  })
}

export async function verifySignature(message: string, signature: string, address: string): Promise<boolean> {
  try {
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`
    })

    return recoveredAddress.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

export async function isAdmin(address: string): Promise<{ isAdmin: boolean; adminDetails: AdminDetails | null }> {
  const cacheKey = `${AUTH_CONSTANTS.ADMIN_CACHE_PREFIX}${address.toLowerCase()}`
  
  try {
    const cachedAdmin = await getRedisCache(cacheKey)
    if (cachedAdmin) {
      console.log('Admin found in Redis cache:', cachedAdmin)
      return { isAdmin: true, adminDetails: JSON.parse(cachedAdmin) as AdminDetails }
    }
  } catch {
    const memoryCachedAdmin = getFromMemoryCache<AdminDetails>(cacheKey)
    if (memoryCachedAdmin) {
      console.log('Admin found in memory cache:', memoryCachedAdmin)
      return { isAdmin: true, adminDetails: memoryCachedAdmin }
    }
  }

  console.log('Searching for admin in database:', address)
  const admin = await prisma.admin.findUnique({
    where: { address: address.toLowerCase() }
  })

  console.log('Database search result:', admin)

  if (admin) {
    try {
      await setRedisCache(cacheKey, admin, AUTH_CONSTANTS.CACHE_TTL)
    } catch {
      setInMemoryCache(cacheKey, admin)
    }
    return { isAdmin: true, adminDetails: admin }
  }

  return { isAdmin: false, adminDetails: null }
}

export async function isSuperAdmin(address: string): Promise<{ found: boolean; adminDetails: AdminDetails | null }> {
  const cacheKey = `${AUTH_CONSTANTS.SUPER_ADMIN_CACHE_PREFIX}${address.toLowerCase()}`
  
  try {
    const cachedAdmin = await getRedisCache(cacheKey)
    if (cachedAdmin) {
      return { found: true, adminDetails: JSON.parse(cachedAdmin) as AdminDetails }
    }
  } catch {
    const memoryCachedAdmin = getFromMemoryCache<AdminDetails>(cacheKey)
    if (memoryCachedAdmin) {
      return { found: true, adminDetails: memoryCachedAdmin }
    }
  }

  const admin = await prisma.admin.findFirst({
    where: {
      address: address.toLowerCase(),
      role: 'SUPER_ADMIN'
    }
  })

  if (admin) {
    try {
      await setRedisCache(cacheKey, admin, AUTH_CONSTANTS.CACHE_TTL)
    } catch {
      setInMemoryCache(cacheKey, admin)
    }
    return { found: true, adminDetails: admin }
  }

  return { found: false, adminDetails: null }
}

type HandlerFunction<T> = (adminAddress: string) => Promise<T>

export async function withAuth<T>(
  request: NextRequest,
  handler: HandlerFunction<T>
): Promise<T> {
  const adminAddress = request.headers.get('x-admin-address')
  const signature = request.headers.get('x-admin-signature')

  if (!adminAddress || !signature) {
    throw new Error('Missing authentication headers')
  }

  console.log('Auth attempt:', {
    adminAddress,
    signature,
    method: request.method,
    url: request.url
  })

  const normalizedAddress = adminAddress.toLowerCase()
  const authCacheKey = `auth:${normalizedAddress}:${signature}`
  
  try {
    const cachedAuth = await redisClient.get(authCacheKey)
    if (cachedAuth) {
      console.log('Using Redis cached authentication')
      return handler(normalizedAddress)
    }
  } catch {
    const memoryCachedAuth = getFromMemoryCache(authCacheKey)
    if (memoryCachedAuth) {
      console.log('Using memory cached authentication')
      return handler(normalizedAddress)
    }
  }

  const isValid = await verifySignature(AUTH_CONSTANTS.MESSAGE_TO_SIGN, signature, normalizedAddress)
  if (!isValid) {
    throw new Error('Invalid signature')
  }

  const { isAdmin: isAdminUser, adminDetails } = await isAdmin(normalizedAddress)
  if (!isAdminUser) {
    throw new Error('Unauthorized')
  }

  console.log('Admin check:', {
    address: normalizedAddress,
    isAdmin: isAdminUser,
    adminDetails
  })

  try {
    await redisClient.set(authCacheKey, true, { ex: AUTH_CONSTANTS.CACHE_TTL })
  } catch {
    setInMemoryCache(authCacheKey, true)
  }

  return handler(normalizedAddress)
} 