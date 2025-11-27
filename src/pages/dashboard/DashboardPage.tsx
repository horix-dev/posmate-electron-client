import { useEffect, useState } from 'react'
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardService } from '@/api/services'
import { useBusinessStore } from '@/stores'
import type { DashboardSummary, DashboardData } from '@/types/api.types'

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  loading,
}: {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down'
  trendValue?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {trend && (
              <span
                className={`flex items-center ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trendValue}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const business = useBusinessStore((state) => state.business)
  const currencySymbol = business?.business_currency?.symbol || '$'

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, dashboardRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getDashboard('current_month'),
        ])

        setSummary(summaryRes.data)
        setDashboardData(dashboardRes.data)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (value: number) => {
    return `${currencySymbol}${value.toLocaleString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your business.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(summary?.sales || 0)}
          icon={ShoppingCart}
          loading={loading}
          description="Total sales today"
        />
        <StatCard
          title="Today's Income"
          value={formatCurrency(summary?.income || 0)}
          icon={DollarSign}
          loading={loading}
          trend="up"
          trendValue="12%"
          description="from yesterday"
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(summary?.expense || 0)}
          icon={TrendingDown}
          loading={loading}
          description="Total expenses today"
        />
        <StatCard
          title="Today's Purchases"
          value={formatCurrency(summary?.purchase || 0)}
          icon={Package}
          loading={loading}
          description="Total purchases today"
        />
      </div>

      {/* Extended Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={dashboardData?.total_items?.toString() || '0'}
          icon={Package}
          loading={loading}
        />
        <StatCard
          title="Total Categories"
          value={dashboardData?.total_categories?.toString() || '0'}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(dashboardData?.stock_value || 0)}
          icon={DollarSign}
          loading={loading}
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(dashboardData?.total_due || 0)}
          icon={TrendingUp}
          loading={loading}
        />
      </div>

      {/* Profit/Loss Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Total Profit
            </CardTitle>
            <CardDescription>This month's total profit</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div className="text-3xl font-bold text-green-500">
                {formatCurrency(dashboardData?.total_profit || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Total Loss
            </CardTitle>
            <CardDescription>This month's total loss</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <div className="text-3xl font-bold text-red-500">
                {formatCurrency(dashboardData?.total_loss || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Sales trend for this month</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <p>Chart will be implemented with recharts</p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Purchases Overview</CardTitle>
            <CardDescription>Purchases trend for this month</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <p>Chart will be implemented with recharts</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
