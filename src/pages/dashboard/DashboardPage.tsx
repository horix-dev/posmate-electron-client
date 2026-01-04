import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  WifiOff,
  Calendar,
  Download,
  MoreHorizontal,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { dashboardService } from '@/api/services'
import { useSyncStore } from '@/stores'
import { useCurrency } from '@/hooks'
import { getCache, setCache, CacheKeys } from '@/lib/cache'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import type {
  ChartDataPoint,
  DashboardData,
  DashboardDuration,
  DashboardSummary,
} from '@/types/api.types'

const DASHBOARD_DURATION_LABELS: Record<DashboardDuration, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_seven_days: 'Last 7 Days',
  last_thirty_days: 'Last 30 Days',
  current_month: 'Current Month',
  last_month: 'Last Month',
  current_year: 'Current Year',
  custom_date: 'Custom',
}

function getDashboardCacheKey(duration: DashboardDuration, fromDate?: string, toDate?: string) {
  if (duration === 'custom_date' && fromDate && toDate) {
    return `${CacheKeys.DASHBOARD_DATA}:${duration}:${fromDate}:${toDate}`
  }
  return `${CacheKeys.DASHBOARD_DATA}:${duration}`
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function formatShortDateLabel(isoDate: string) {
  try {
    return format(parseISO(isoDate), 'EEE')
  } catch {
    return isoDate
  }
}

function BarChart({
  data,
  colorClassName,
  emptyLabel,
}: {
  data: ChartDataPoint[]
  colorClassName: string
  emptyLabel: string
}) {
  const points = useMemo(() => {
    if (!Array.isArray(data)) return []
    // Keep the most recent 7 points for a clean dashboard look
    return data.slice(-7)
  }, [data])

  const max = useMemo(() => {
    if (points.length === 0) return 0
    return Math.max(...points.map((p) => p.amount || 0))
  }, [points])

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="flex h-56 flex-col justify-between">
      <div className="flex flex-1 items-end justify-between gap-2 px-2">
        {points.map((point) => {
          const value = point.amount || 0
          const heightPct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8
          const isPeak = value === max
          return (
            <div key={point.date} className="flex w-full flex-col items-center gap-2">
              <div className="relative flex w-full items-end">
                <div className="h-36 w-full rounded-t-sm bg-muted/50" />
                <div
                  className={cn(
                    'absolute bottom-0 w-full rounded-t-sm transition-colors',
                    colorClassName,
                    isPeak ? 'shadow-sm' : ''
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {formatShortDateLabel(point.date)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  iconContainerClassName,
  trend,
  trendValue,
  loading,
}: {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  iconClassName?: string
  iconContainerClassName?: string
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
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground',
            iconContainerClassName
          )}
        >
          <Icon className={cn('h-4 w-4', iconClassName)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
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
  const [isOfflineData, setIsOfflineData] = useState(false)
  const [duration, setDuration] = useState<DashboardDuration>('last_thirty_days')

  const isOnline = useSyncStore((state) => state.isOnline)
  const currencyData = useCurrency()
  const { format: formatCurrency } = currencyData

  const durationLabel = DASHBOARD_DURATION_LABELS[duration]
  const dashboardCacheKey = useMemo(() => getDashboardCacheKey(duration), [duration])

  useEffect(() => {
    const fetchDashboardData = async () => {
      // If offline, load from cache only
      if (!isOnline || !navigator.onLine) {
        const cachedSummary = getCache<DashboardSummary>(CacheKeys.DASHBOARD_SUMMARY)
        const cachedDashboard = getCache<DashboardData>(dashboardCacheKey)

        if (cachedSummary) setSummary(cachedSummary)
        if (cachedDashboard) setDashboardData(cachedDashboard)

        setIsOfflineData(true)
        setLoading(false)
        return
      }

      try {
        const [summaryRes, dashboardRes] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getDashboard(duration),
        ])

        setSummary(summaryRes.data)
        setDashboardData(dashboardRes.data)
        setIsOfflineData(false)

        // Cache for offline use (5 minutes TTL)
        setCache(CacheKeys.DASHBOARD_SUMMARY, summaryRes.data, { ttl: 5 * 60 * 1000 })
        setCache(dashboardCacheKey, dashboardRes.data, { ttl: 5 * 60 * 1000 })
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)

        // Try to load from cache on error
        const cachedSummary = getCache<DashboardSummary>(CacheKeys.DASHBOARD_SUMMARY)
        const cachedDashboard = getCache<DashboardData>(dashboardCacheKey)

        if (cachedSummary) setSummary(cachedSummary)
        if (cachedDashboard) setDashboardData(cachedDashboard)

        if (cachedSummary || cachedDashboard) {
          setIsOfflineData(true)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [isOnline, duration, dashboardCacheKey])

  const handleExport = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      duration,
      summary,
      dashboardData,
    }

    const filename = `dashboard-${duration}-${format(new Date(), 'yyyy-MM-dd')}.json`
    downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your store today.
            {isOfflineData && (
              <span className="ml-2 inline-flex items-center gap-1 text-pos-warning">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs">(Cached data)</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {durationLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(
                [
                  'today',
                  'yesterday',
                  'last_seven_days',
                  'last_thirty_days',
                  'current_month',
                  'last_month',
                  'current_year',
                ] as DashboardDuration[]
              ).map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDuration(d)}>
                  {DASHBOARD_DURATION_LABELS[d]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="gap-2 shadow-md transition-shadow hover:shadow-lg"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(summary?.sales || 0)}
          icon={ShoppingCart}
          iconContainerClassName="bg-primary/10 text-primary"
          iconClassName="text-primary"
          loading={loading}
          description="Total sales today"
        />
        <StatCard
          title="Today's Income"
          value={formatCurrency(summary?.income || 0)}
          icon={DollarSign}
          iconContainerClassName="bg-pos-success/10 text-pos-success"
          iconClassName="text-pos-success"
          loading={loading}
          trend="up"
          trendValue="12%"
          description="from yesterday"
        />
        <StatCard
          title="Today's Expenses"
          value={formatCurrency(summary?.expense || 0)}
          icon={TrendingDown}
          iconContainerClassName="bg-pos-danger/10 text-pos-danger"
          iconClassName="text-pos-danger"
          loading={loading}
          description="Total expenses today"
        />
        <StatCard
          title="Today's Purchases"
          value={formatCurrency(summary?.purchase || 0)}
          icon={Package}
          iconContainerClassName="bg-pos-warning/10 text-pos-warning"
          iconClassName="text-pos-warning"
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
          iconContainerClassName="bg-primary/10 text-primary"
          iconClassName="text-primary"
          loading={loading}
        />
        <StatCard
          title="Total Categories"
          value={dashboardData?.total_categories?.toString() || '0'}
          icon={Users}
          iconContainerClassName="bg-primary/10 text-primary"
          iconClassName="text-primary"
          loading={loading}
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(dashboardData?.stock_value || 0)}
          icon={DollarSign}
          iconContainerClassName="bg-chart-2/10 text-chart-2"
          iconClassName="text-chart-2"
          loading={loading}
        />
        <StatCard
          title="Total Due"
          value={formatCurrency(dashboardData?.total_due || 0)}
          icon={TrendingUp}
          iconContainerClassName="bg-chart-5/10 text-chart-5"
          iconClassName="text-chart-5"
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
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Sales trend for {durationLabel.toLowerCase()}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-primary">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <BarChart
                data={dashboardData?.sales || []}
                colorClassName="bg-primary/30 hover:bg-primary/50"
                emptyLabel="Not enough data to display chart"
              />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Purchases Overview</CardTitle>
              <CardDescription>Purchases trend for {durationLabel.toLowerCase()}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="text-primary">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <BarChart
                data={dashboardData?.purchases || []}
                colorClassName="bg-primary/20 hover:bg-primary/40"
                emptyLabel="Not enough data to display chart"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
