"use client"

import { Button } from "@/components/ui/button"
import { useWallet } from "@/hooks/use-wallet"
import Link from "next/link"

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS

export function AdminButton() {
  const { address } = useWallet()
  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS?.toLowerCase()

  if (!isAdmin) return null

  return (
    <Link href="/admin">
      <Button
        variant="outline"
        size="sm"
        className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
      >
        Admin
      </Button>
    </Link>
  )
} 