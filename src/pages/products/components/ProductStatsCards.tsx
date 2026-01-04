import { memo, useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { StatCard } from '@/components/common/StatCard'
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
        value={stats.total.toString()}
        icon={Package}
        iconContainerClassName="bg-blue-100 dark:bg-blue-900/30"
        loading={isLoading}
      />
      <StatCard
        title="In Stock"
        value={stats.inStock.toString()}
        icon={TrendingUp}
        iconClassName="text-green-600 dark:text-green-500"
        iconContainerClassName="bg-green-100 dark:bg-green-900/30"
        loading={isLoading}
      />
      <StatCard
        title="Low Stock"
        value={stats.lowStock.toString()}
        icon={AlertTriangle}
        iconClassName="text-yellow-600 dark:text-yellow-500"
        iconContainerClassName="bg-yellow-100 dark:bg-yellow-900/30"
        loading={isLoading}
      />
      <StatCard
        title="Stock Value"
        value={formattedStockValue}
        icon={DollarSign}
        iconContainerClassName="bg-purple-100 dark:bg-purple-900/30"
        loading={isLoading}
      />
    </div>
  )
}

export const ProductStatsCards = memo(ProductStatsCardsComponent)

ProductStatsCards.displayName = 'ProductStatsCards'

export default ProductStatsCards
