import { memo } from 'react'
import { Package, DollarSign, CreditCard, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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
// Stat Card Component
// ============================================

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  isLoading?: boolean
}

const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  isLoading,
}: StatCardProps) {
  const iconColorClass =
    variant === 'success'
      ? 'text-green-600'
      : variant === 'warning'
        ? 'text-yellow-600'
        : variant === 'destructive'
          ? 'text-red-600'
          : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={iconColorClass}>{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="mb-1 h-7 w-24" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
})

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
        value={stats.total}
        subtitle={`${stats.paidCount} paid, ${stats.partialCount} partial, ${stats.unpaidCount} unpaid`}
        icon={<Package className="h-4 w-4" />}
        isLoading={isLoading}
      />

      {/* Total Amount */}
      <StatCard
        title="Total Amount"
        value={formatCurrency(stats.totalAmount)}
        subtitle="Sum of all purchases"
        icon={<DollarSign className="h-4 w-4" />}
        isLoading={isLoading}
      />

      {/* Total Paid */}
      <StatCard
        title="Total Paid"
        value={formatCurrency(stats.totalPaid)}
        subtitle={`${stats.paidCount + stats.partialCount} purchases with payments`}
        icon={<CreditCard className="h-4 w-4" />}
        variant="success"
        isLoading={isLoading}
      />

      {/* Total Due */}
      <StatCard
        title="Total Due"
        value={formatCurrency(stats.totalDue)}
        subtitle={`${stats.partialCount + stats.unpaidCount} purchases with dues`}
        icon={<AlertCircle className="h-4 w-4" />}
        variant={stats.totalDue > 0 ? 'destructive' : 'default'}
        isLoading={isLoading}
      />
    </div>
  )
})

export default PurchasesStatsCards
