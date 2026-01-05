import { DollarSign, Receipt, CreditCard, Cloud, CloudOff } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'
import { useCurrency } from '@/hooks'
import type { SalesStats } from '../hooks'

interface SalesStatsCardsProps {
  stats: SalesStats
  isLoading: boolean
}

export function SalesStatsCards({ stats, isLoading }: SalesStatsCardsProps) {
  const { format: formatCurrency } = useCurrency()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Sales"
        value={stats.total.toString()}
        description={formatCurrency(stats.totalAmount)}
        icon={Receipt}
        iconClassName="text-blue-600 dark:text-blue-500"
        iconContainerClassName="bg-blue-100 dark:bg-blue-900/30"
        loading={isLoading}
      />
      <StatCard
        title="Total Received"
        value={formatCurrency(stats.totalPaid)}
        description={`${stats.paidCount} fully paid`}
        icon={DollarSign}
        iconClassName="text-green-600 dark:text-green-500"
        iconContainerClassName="bg-green-100 dark:bg-green-900/30"
        loading={isLoading}
      />
      <StatCard
        title="Total Due"
        value={formatCurrency(stats.totalDue)}
        description={`${stats.partialCount + stats.unpaidCount} pending`}
        icon={CreditCard}
        iconClassName="text-orange-600 dark:text-orange-500"
        iconContainerClassName="bg-orange-100 dark:bg-orange-900/30"
        loading={isLoading}
      />
      <StatCard
        title="Pending Sync"
        value={stats.pendingSyncCount.toString()}
        description={stats.pendingSyncCount > 0 ? 'Waiting to sync' : 'All synced'}
        icon={stats.pendingSyncCount > 0 ? CloudOff : Cloud}
        iconClassName={
          stats.pendingSyncCount > 0
            ? 'text-yellow-600 dark:text-yellow-500'
            : 'text-green-600 dark:text-green-500'
        }
        iconContainerClassName={
          stats.pendingSyncCount > 0
            ? 'bg-yellow-100 dark:bg-yellow-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
        }
        loading={isLoading}
      />
    </div>
  )
}

export default SalesStatsCards
