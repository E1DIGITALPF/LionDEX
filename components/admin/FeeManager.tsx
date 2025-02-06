'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from '@/hooks/use-wallet'
import { ethers } from 'ethers'
import { Card } from "@/components/ui/card"
import { XCircle } from 'lucide-react'
import { FEE_MANAGER_ABI, FEE_PERCENTAGE_LIMITS } from '@/config/constants'

interface ContractError {
  code: string
  message: string
  data?: {
    message?: string
  }
}

interface EthereumError extends Error {
  code: number | string;
  action?: string;
  reason?: string;
}

function isContractError(error: unknown): error is ContractError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}

export function FeeManager() {
  const [newCollector, setNewCollector] = useState('')
  const [newPercentage, setNewPercentage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentCollector, setCurrentCollector] = useState('')
  const [currentPercentage, setCurrentPercentage] = useState('')
  const { toast } = useToast()
  const { signer } = useWallet()

  const loadCurrentFees = useCallback(async () => {
    if (!signer) return

    try {
      const feeManager = new ethers.Contract(
        process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
        FEE_MANAGER_ABI,
        signer
      )

      const collector = await feeManager.feeCollector()
      const percentage = await feeManager.feePercentage()
      
      setCurrentCollector(collector)
      setCurrentPercentage((Number(percentage) / 100).toString())
    } catch (error) {
      console.error('Error loading current values:', error)
    }
  }, [signer])

  useEffect(() => {
    loadCurrentFees()
  }, [loadCurrentFees])

  const updateFeeCollector = useCallback(async () => {
    if (!signer || !ethers.isAddress(newCollector)) return

    try {
      setIsLoading(true)
      const feeManager = new ethers.Contract(
        process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
        FEE_MANAGER_ABI,
        signer
      )

      const tx = await feeManager.setFeeCollector(newCollector)
      await tx.wait()
      await loadCurrentFees()

      toast({
        title: "Success",
        description: "Fee collector updated successfully",
        variant: "success"
      })
      setNewCollector('')
    } catch (error: unknown) {
      if (error instanceof Error && 
          ((error as EthereumError).code === 4001 || 
           (error as EthereumError).action === 'sendTransaction' && 
           (error as EthereumError).reason === 'rejected')
      ) {
        return
      }

      console.error('Fee collector update error:', error)
      
      let errorMessage = 'An unknown error occurred'
      if (isContractError(error)) {
        errorMessage = error.data?.message || error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [signer, newCollector, toast, loadCurrentFees])

  const updateFeePercentage = useCallback(async () => {
    if (!signer || !newPercentage) return

    try {
      setIsLoading(true)
      const feeManager = new ethers.Contract(
        process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
        FEE_MANAGER_ABI,
        signer
      )

      const percentageBase = Math.floor(Number(newPercentage) * 100)
      const tx = await feeManager.setFeePercentage(percentageBase)
      await tx.wait()
      await loadCurrentFees()

      toast({
        title: "Success",
        description: "Fee percentage updated successfully",
        variant: "success"
      })
      setNewPercentage('')
    } catch (error: unknown) {
      if (error instanceof Error && 
          ((error as EthereumError).code === 4001 || 
           (error as EthereumError).action === 'sendTransaction' && 
           (error as EthereumError).reason === 'rejected')
      ) {
        return
      }

      console.error('Fee percentage update error:', error)
      
      let errorMessage = 'An unknown error occurred'
      if (isContractError(error)) {
        errorMessage = error.data?.message || error.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        ),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [signer, newPercentage, toast, loadCurrentFees])

  return (
    <Card className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/50 shadow-2xl rounded-xl overflow-hidden lg:col-span-2">
      <div className="p-4 md:p-5">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-white flex items-center gap-2">
          <span className="text-blue-500">💰</span> Fee Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Fee Collector</h3>
            <p className="text-sm text-zinc-400">Current collector: {currentCollector}</p>
            <div className="flex gap-2">
              <Input
                value={newCollector}
                onChange={(e) => setNewCollector(e.target.value)}
                placeholder="New fee collector address"
                className="flex-1 bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white"
              />
              <Button 
                onClick={updateFeeCollector}
                disabled={isLoading || !ethers.isAddress(newCollector)}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                Update
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Fee Percentage</h3>
            <p className="text-sm text-zinc-400">Current percentage: {currentPercentage}%</p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={newPercentage}
                onChange={(e) => setNewPercentage(e.target.value)}
                placeholder="New fee percentage (e.g. 1.5)"
                className="flex-1 bg-zinc-800/50 border-zinc-700/50 focus:border-blue-500/50 text-white"
                step={FEE_PERCENTAGE_LIMITS.STEP}
                min={FEE_PERCENTAGE_LIMITS.MIN}
                max={FEE_PERCENTAGE_LIMITS.MAX}
              />
              <Button 
                onClick={updateFeePercentage}
                disabled={isLoading || !newPercentage}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                Update
              </Button>
            </div>
            <p className="text-sm text-zinc-500">
              Enter percentage between {FEE_PERCENTAGE_LIMITS.MIN} and {FEE_PERCENTAGE_LIMITS.MAX} (e.g. 1.5 for 1.5%)
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
} 