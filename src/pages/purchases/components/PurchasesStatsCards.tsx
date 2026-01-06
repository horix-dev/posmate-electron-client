import { memo } from 'react'
import { Package, DollarSign, CreditCard, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'
import { useCurrency } from '@/hooks'
import type { PurchasesStats } from '../hooks'

// ============================================
// Types
// ============================================

export interface PurchasesStatsCardsProps {
  stats: PurchasesStats
  isLoading: boolean
}

// ============================================
// Main Component
// ============================================

export const PurchasesStatsCards = memo(function PurchasesStatsCards({
  stats,
  isLoading,
}: PurchasesStatsCardsProps) {
  // Use centralized currency formatting
  const { format: formatCurrency } = useCurrency()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Purchases */}
      <StatCard
        title="Total Purchases"
        value={stats.total.toString()}
        description={`${stats.paidCount} paid, ${stats.partialCount} partial, ${stats.unpaidCount} unpaid`}
        icon={Package}
        iconContainerClassName="bg-blue-100 dark:bg-blue-900/30"
        loading={isLoading}
      />

      {/* Total Amount */}
      <StatCard
        title="Total Amount"
        value={formatCurrency(stats.totalAmount)}
        description="Sum of all purchases"
        icon={DollarSign}
        iconContainerClassName="bg-purple-100 dark:bg-purple-900/30"
        loading={isLoading}
      />

      {/* Total Paid */}
      <StatCard
        title="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        description={`${stats.paidCount + stats.partialCount} purchases with payments`}
        icon={CreditCard}
        iconClassName="text-green-600 dark:text-green-500"
        iconContainerClassName="bg-green-100 dark:bg-green-900/30"
        loading={isLoading}
      />

      {/* Total Due */}
      <StatCard
        title="Total Due"
        value={formatCurrency(stats.totalDue)}
        description={`${stats.partialCount + stats.unpaidCount} purchases with dues`}
        icon={AlertCircle}
        iconClassName={
          stats.totalDue > 0 ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground'
        }
        iconContainerClassName={
          stats.totalDue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-900/30'
        }
        loading={isLoading}
      />
    </div>
  )
})

export default PurchasesStatsCards
