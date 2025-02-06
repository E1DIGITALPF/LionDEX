import { Card } from '@/components/ui/card'
import type { Token, Route } from '@prisma/client'

interface TokenWithRoutes extends Token {
  fromRoutes: Route[];
  toRoutes: Route[];
}

interface TokenStatsProps {
  tokens: TokenWithRoutes[];
}

interface StatCardProps {
  title: string;
  value: number;
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <Card className="bg-[#2c2d32] p-3 md:p-4 text-center">
      <p className="text-xs md:text-sm text-gray-400">{title}</p>
      <p className="text-xl md:text-2xl font-bold text-white mt-1">{value}</p>
    </Card>
  )
}

export function TokenStats({ tokens }: TokenStatsProps) {
  const totalTokens = tokens.length
  const enabledTokens = tokens.filter(token => token.isWhitelisted).length
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      <StatCard
        title="Total tokens"
        value={totalTokens}
      />
      <StatCard
        title="Enabled tokens"
        value={enabledTokens}
      />
      <StatCard
        title="Disabled tokens"
        value={totalTokens - enabledTokens}
      />
    </div>
  )
} 