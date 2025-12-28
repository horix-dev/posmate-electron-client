/**
 * Stock Adjustment Stats Cards
 * Displays summary statistics for stock adjustments
 */

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { StockAdjustmentSummary } from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentStatsCardsProps {
  summary: StockAdjustmentSummary | undefined
  isLoading?: boolean
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  trend?: 'up' | 'down' | 'neutral'
}

// ============================================
// Sub-components
// ============================================

const StatCard = memo(function StatCard({ title, value, icon, description, trend }: StatCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getTrendColor()}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  )
})

const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
})

// ============================================
// Main Component
// ============================================

function StockAdjustmentStatsCardsComponent({
  summary,
  isLoading = false,
}: StockAdjustmentStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const netChangeIsPositive = summary.netChange >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Stock In */}
      <StatCard
        title="Total Stock In"
        value={`+${summary.totalIn}`}
        icon={<TrendingUp className="h-4 w-4" />}
        description="Items added to inventory"
        trend="up"
      />

      {/* Total Stock Out */}
      <StatCard
        title="Total Stock Out"
        value={`-${summary.totalOut}`}
        icon={<TrendingDown className="h-4 w-4" />}
        description="Items removed from inventory"
        trend="down"
      />

      {/* Net Change */}
      <StatCard
        title="Net Change"
        value={`${netChangeIsPositive ? '+' : ''}${summary.netChange}`}
        icon={<Activity className="h-4 w-4" />}
        description={netChangeIsPositive ? 'Overall increase' : 'Overall decrease'}
        trend={netChangeIsPositive ? 'up' : 'down'}
      />

      {/* Pending Sync */}
      <StatCard
        title="Pending Sync"
        value={summary.pendingCount}
        icon={<Clock className="h-4 w-4" />}
        description={
          summary.pendingCount === 0 ? 'All synced' : `${summary.pendingCount} awaiting sync`
        }
        trend="neutral"
      />
    </div>
  )
}

export const StockAdjustmentStatsCards = memo(StockAdjustmentStatsCardsComponent)
