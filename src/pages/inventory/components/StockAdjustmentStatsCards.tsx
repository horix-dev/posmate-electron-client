/**
 * Stock Adjustment Stats Cards
 * Displays summary statistics for stock adjustments
 */

import { memo } from 'react'
import { StatCard } from '@/components/common/StatCard'
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react'
import type { StockAdjustmentSummary } from '@/types/stockAdjustment.types'

// ============================================
// Types
// ============================================

export interface StockAdjustmentStatsCardsProps {
  summary: StockAdjustmentSummary | undefined
  isLoading?: boolean
}

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
        <StatCard title="Total Stock In" value="0" icon={TrendingUp} loading={true} />
        <StatCard title="Total Stock Out" value="0" icon={TrendingDown} loading={true} />
        <StatCard title="Net Change" value="0" icon={Activity} loading={true} />
        <StatCard title="Pending Sync" value="0" icon={Clock} loading={true} />
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
        icon={TrendingUp}
        iconClassName="text-green-600 dark:text-green-500"
        iconContainerClassName="bg-green-100 dark:bg-green-900/30"
        description="Items added to inventory"
        loading={false}
      />

      {/* Total Stock Out */}
      <StatCard
        title="Total Stock Out"
        value={`-${summary.totalOut}`}
        icon={TrendingDown}
        iconClassName="text-red-600 dark:text-red-500"
        iconContainerClassName="bg-red-100 dark:bg-red-900/30"
        description="Items removed from inventory"
        loading={false}
      />

      {/* Net Change */}
      <StatCard
        title="Net Change"
        value={`${netChangeIsPositive ? '+' : ''}${summary.netChange}`}
        icon={Activity}
        iconClassName={
          netChangeIsPositive
            ? 'text-green-600 dark:text-green-500'
            : 'text-red-600 dark:text-red-500'
        }
        iconContainerClassName={
          netChangeIsPositive
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-red-100 dark:bg-red-900/30'
        }
        description={netChangeIsPositive ? 'Overall increase' : 'Overall decrease'}
        loading={false}
      />

      {/* Pending Sync */}
      <StatCard
        title="Pending Sync"
        value={summary.pendingCount.toString()}
        icon={Clock}
        iconClassName={
          summary.pendingCount > 0
            ? 'text-yellow-600 dark:text-yellow-500'
            : 'text-blue-600 dark:text-blue-500'
        }
        iconContainerClassName={
          summary.pendingCount > 0
            ? 'bg-yellow-100 dark:bg-yellow-900/30'
            : 'bg-blue-100 dark:bg-blue-900/30'
        }
        description={
          summary.pendingCount === 0 ? 'All synced' : `${summary.pendingCount} awaiting sync`
        }
        loading={false}
      />
    </div>
  )
}

export const StockAdjustmentStatsCards = memo(StockAdjustmentStatsCardsComponent)
