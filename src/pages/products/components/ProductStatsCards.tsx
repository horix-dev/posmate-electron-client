import { memo, useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import type { ProductStats } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductStatsCardsProps {
  /** Product statistics */
  stats: ProductStats
  /** Total stock value from API */
  totalStockValue: number
  /** Whether data is loading */
  isLoading?: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

// ============================================
// Stat Card Component
// ============================================

const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  variant = 'default',
  isLoading = false,
}: StatCardProps) {
  const valueColorClass = useMemo(() => {
    switch (variant) {
      case 'success':
        return 'text-green-600 dark:text-green-500'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-500'
      case 'danger':
        return 'text-red-600 dark:text-red-500'
      default:
        return ''
    }
  }, [variant])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-muted" aria-label="Loading..." />
        ) : (
          <div className={cn('text-2xl font-bold', valueColorClass)} aria-live="polite">
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// ============================================
// Main Component
// ============================================

function ProductStatsCardsComponent({
  stats,
  totalStockValue,
  isLoading = false,
}: ProductStatsCardsProps) {
  const { format: formatCurrency } = useCurrency()

  const formattedStockValue = useMemo(() => {
    return formatCurrency(totalStockValue)
  }, [formatCurrency, totalStockValue])

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Product statistics"
    >
      <StatCard
        title="Total Products"
        value={stats.total}
        icon={<Package className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="In Stock"
        value={stats.inStock}
        icon={<TrendingUp className="h-4 w-4" />}
        variant="success"
        isLoading={isLoading}
      />
      <StatCard
        title="Low Stock"
        value={stats.lowStock}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant="warning"
        isLoading={isLoading}
      />
      <StatCard
        title="Stock Value"
        value={formattedStockValue}
        icon={<DollarSign className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  )
}

export const ProductStatsCards = memo(ProductStatsCardsComponent)

ProductStatsCards.displayName = 'ProductStatsCards'

export default ProductStatsCards
