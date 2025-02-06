'use client'

import { useState, useEffect } from 'react'
import { useWallet } from './use-wallet'
import { useSignMessage } from 'wagmi'

const MESSAGE_TO_SIGN = 'Sign this message to verify you own this wallet address.'
const AUTH_STORAGE_KEY = 'admin_auth'

export function usePersistentAuth() {
  const { address, isConnected } = useWallet()
  const { signMessageAsync } = useSignMessage()
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({})
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (address) {
      const isAdminAddress = address.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_ADDRESS?.toLowerCase()
      console.log('Admin check:', { address, isAdminAddress })
      setIsAdmin(isAdminAddress)
      if (!isAdminAddress) {
        setAuthHeaders({})
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    } else {
      setIsAdmin(false)
      setAuthHeaders({})
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [address])

  useEffect(() => {
    const authenticate = async () => {
      if (!isConnected || !address || !isAdmin) {
        console.log('No authentication needed:', { isConnected, address, isAdmin })
        setIsInitialized(true)
        return
      }

      try {
        setIsAuthenticating(true)
        console.log('Starting authentication...')
        
        const stored = localStorage.getItem(AUTH_STORAGE_KEY)
        if (stored) {
          const { address: storedAddress, headers } = JSON.parse(stored)
          if (storedAddress.toLowerCase() === address.toLowerCase()) {
            console.log('Verifying stored auth...')
            const response = await fetch('/api/admin/tokens', { headers })
            if (response.ok) {
              console.log('Stored auth valid')
              setAuthHeaders(headers)
              setIsInitialized(true)
              return
            }
          }
        }

        console.log('Requesting new signature...')
        const signature = await signMessageAsync({ message: MESSAGE_TO_SIGN })
        
        const headers = {
          'x-admin-address': address,
          'x-admin-signature': signature
        }

        console.log('Verifying new signature...')
        const response = await fetch('/api/admin/tokens', { headers })
        if (!response.ok) {
          throw new Error('Invalid signature')
        }

        console.log('New signature valid')
        setAuthHeaders(headers)
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ address, headers }))
      } catch (error) {
        console.error('Auth error:', error)
        setAuthHeaders({})
        localStorage.removeItem(AUTH_STORAGE_KEY)
      } finally {
        setIsAuthenticating(false)
        setIsInitialized(true)
      }
    }

    authenticate()
  }, [isConnected, address, isAdmin, signMessageAsync])

  return {
    authHeaders,
    isAuthenticating,
    isAdmin,
    isInitialized,
    isAuthenticated: isAdmin && Object.keys(authHeaders).length > 0
  }
} 