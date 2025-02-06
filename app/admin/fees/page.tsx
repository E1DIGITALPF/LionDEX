'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useWallet } from '@/hooks/use-wallet'
import { ethers } from 'ethers'
import { FeeManager__factory } from "@/typechain-types"

type ContractError = {
  code: string
  message: string
  data?: {
    message?: string
  }
}

export default function FeesAdmin() {
  const [newCollector, setNewCollector] = useState('')
  const [newPercentage, setNewPercentage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentCollector, setCurrentCollector] = useState('')
  const [currentPercentage, setCurrentPercentage] = useState('')
  const { toast } = useToast()
  const { signer } = useWallet()

  useEffect(() => {
    const loadCurrentValues = async () => {
      if (!signer) return

      try {
        const feeManager = FeeManager__factory.connect(
          process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
          signer
        )

        const collector = await feeManager.feeCollector()
        const percentage = await feeManager.feePercentage()
        
        setCurrentCollector(collector)
        setCurrentPercentage((Number(percentage) / 100).toString())
      } catch (error) {
        console.error('Error loading current values:', error)
      }
    }

    loadCurrentValues()
  }, [signer])

  const updateFeeCollector = useCallback(async () => {
    if (!signer || !ethers.isAddress(newCollector)) return

    try {
      setIsLoading(true)
      const feeManager = FeeManager__factory.connect(
        process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
        signer
      )

      const tx = await feeManager.setFeeCollector(newCollector)
      await tx.wait()

      toast({
        title: "Success",
        description: "Fee collector updated successfully",
        variant: "success"
      })
    } catch (error: unknown) {
      console.error(error)
      const contractError = error as ContractError
      toast({
        title: "Error",
        description: contractError.data?.message || contractError.message || "Failed to update fee collector",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [signer, newCollector, toast])

  const updateFeePercentage = useCallback(async () => {
    if (!signer || !newPercentage) return

    try {
      setIsLoading(true)
      const feeManager = FeeManager__factory.connect(
        process.env.NEXT_PUBLIC_FEE_MANAGER_ADDRESS!,
        signer
      )

      const percentageBase = Math.floor(Number(newPercentage) * 100)
      const tx = await feeManager.setFeePercentage(percentageBase)
      await tx.wait()

      toast({
        title: "Success",
        description: "Fee percentage updated successfully",
        variant: "success"
      })
    } catch (error: unknown) {
      console.error(error)
      const contractError = error as ContractError
      toast({
        title: "Error",
        description: contractError.data?.message || contractError.message || "Failed to update fee percentage",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [signer, newPercentage, toast])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Fee Management</h1>
      
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Fee Collector</h2>
          <p className="text-sm text-zinc-500">Current collector: {currentCollector}</p>
          <div className="flex gap-2">
            <Input
              value={newCollector}
              onChange={(e) => setNewCollector(e.target.value)}
              placeholder="New fee collector address"
              className="flex-1"
            />
            <Button 
              onClick={updateFeeCollector}
              disabled={isLoading || !ethers.isAddress(newCollector)}
            >
              Update Collector
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Fee Percentage</h2>
          <p className="text-sm text-zinc-500">Current percentage: {currentPercentage}%</p>
          <div className="flex gap-2">
            <Input
              type="number"
              value={newPercentage}
              onChange={(e) => setNewPercentage(e.target.value)}
              placeholder="New fee percentage (e.g. 1.5)"
              className="flex-1"
              step="0.1"
              min="0"
              max="5"
            />
            <Button 
              onClick={updateFeePercentage}
              disabled={isLoading || !newPercentage}
            >
              Update Percentage
            </Button>
          </div>
          <p className="text-sm text-zinc-400">
            Enter percentage between 0 and 5 (e.g. 1.5 for 1.5%)
          </p>
        </div>
      </div>
    </div>
  )
} 