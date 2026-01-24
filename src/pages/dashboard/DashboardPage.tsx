import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  WifiOff,
  Download,
  AlertTriangle,
  Zap,
  ArrowRight,
  BarChart3,
  CreditCard,
  Wallet,
  Clock,
  CalendarIcon,
  X,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { SaleDetailsDialog } from '@/components/shared'
import { StatCard } from '@/components/common/StatCard'
import { dashboardService, stocksListService, partiesService, salesService } from '@/api/services'
import { useSyncStore, useAuthStore } from '@/stores'
import { useCurrency } from '@/hooks'
import { getCache, setCache, CacheKeys } from '@/lib/cache'
import { cn } from '@/lib/utils'
import {
  format,
  parseISO,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type {
  ChartDataPoint,
  DashboardData,
  DashboardDuration,
  DashboardSummary,
  Stock,
  Party,
  Sale,
  SaleDetail,
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

function getDateRangeForDuration(duration: DashboardDuration): DateRange | undefined {
  const today = new Date()
  switch (duration) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const yest = subDays(today, 1)
      return { from: yest, to: yest }
    }
    case 'last_seven_days':
      return { from: subDays(today, 6), to: today }
    case 'last_thirty_days':
      return { from: subDays(today, 29), to: today }
    case 'current_month':
      return { from: startOfMonth(today), to: endOfMonth(today) }
    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'current_year':
      return { from: startOfYear(today), to: today }
    default:
      return undefined
  }
}

function DateRangeFilter({
  currentDuration,
  currentDateRange,
  onApply,
}: {
  currentDuration: DashboardDuration
  currentDateRange: { from: Date | undefined; to: Date | undefined }
  onApply: (
    duration: DashboardDuration,
    range: { from: Date | undefined; to: Date | undefined }
  ) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DashboardDuration>(currentDuration)
  const [date, setDate] = useState<DateRange | undefined>({
    from: currentDateRange.from,
    to: currentDateRange.to,
  })

  // Initialize state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedPreset(currentDuration)
      if (currentDuration === 'custom_date') {
        setDate({ from: currentDateRange.from, to: currentDateRange.to })
      } else {
        setDate(getDateRangeForDuration(currentDuration))
      }
    }
  }, [isOpen, currentDuration, currentDateRange])

  const handlePresetSelect = (preset: DashboardDuration) => {
    setSelectedPreset(preset)
    if (preset === 'custom_date') {
      // Keep existing date or clear if undefined?
      // Usually keep existing for valid transition
    } else {
      const range = getDateRangeForDuration(preset)
      if (range) setDate(range)
    }
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range)
    setSelectedPreset('custom_date')
  }

  const handleApply = () => {
    onApply(selectedPreset, { from: date?.from, to: date?.to })
    setIsOpen(false)
  }

  const getButtonLabel = () => {
    if (currentDuration === 'custom_date') {
      if (currentDateRange.from) {
        if (currentDateRange.to) {
          return `${format(currentDateRange.from, 'MMM dd, yyyy')} - ${format(currentDateRange.to, 'MMM dd, yyyy')}`
        }
        return format(currentDateRange.from, 'MMM dd, yyyy')
      }
      return 'Select Dates'
    }
    return DASHBOARD_DURATION_LABELS[currentDuration]
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 gap-2 border-dashed',
            currentDuration === 'custom_date' && 'border-primary bg-primary/5 text-primary'
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          <span className="whitespace-nowrap font-medium">{getButtonLabel()}</span>
          {currentDuration === 'custom_date' && (
            <span
              role="button"
              className="ml-1 rounded-full p-0.5 hover:bg-background/20 hover:text-foreground/70"
              onClick={(e) => {
                e.stopPropagation()
                onApply('last_thirty_days', { from: undefined, to: undefined })
              }}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex h-full flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="flex min-w-[150px] flex-col border-b bg-muted/10 p-2 sm:border-b-0 sm:border-r">
            <div className="mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              Quick Select
            </div>
            <div className="flex flex-col gap-1">
              {(Object.keys(DASHBOARD_DURATION_LABELS) as DashboardDuration[])
                .filter((k) => k !== 'custom_date')
                .map((key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 justify-start px-2 font-normal',
                      selectedPreset === key && 'bg-primary/10 font-medium text-primary'
                    )}
                    onClick={() => handlePresetSelect(key)}
                  >
                    {DASHBOARD_DURATION_LABELS[key]}
                    {selectedPreset === key && <Check className="ml-auto h-3 w-3 opacity-50" />}
                  </Button>
                ))}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 justify-start px-2 font-normal',
                  selectedPreset === 'custom_date' && 'bg-primary/10 font-medium text-primary'
                )}
                onClick={() => handlePresetSelect('custom_date')}
              >
                Custom Range
                {selectedPreset === 'custom_date' && (
                  <Check className="ml-auto h-3 w-3 opacity-50" />
                )}
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col p-3">
            <div className="mb-3 flex flex-col gap-1 px-1">
              <span className="text-sm font-semibold">
                {selectedPreset === 'custom_date'
                  ? 'Select Range'
                  : DASHBOARD_DURATION_LABELS[selectedPreset]}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {date?.from ? (
                  <>
                    {format(date.from, 'MMM dd, yyyy')} -{' '}
                    {date.to ? format(date.to, 'MMM dd, yyyy') : '...'}
                  </>
                ) : (
                  'Pick a date range'
                )}
              </span>
            </div>
            <CalendarComponent
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="rounded-md border p-0"
            />
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BarChart({
  data,
  colorClass,
  emptyLabel,
  prefix = '',
}: {
  data: ChartDataPoint[]
  colorClass: string
  emptyLabel: string
  prefix?: string
}) {
  const points = useMemo(() => {
    if (!Array.isArray(data)) return []

    // 1. FILTER: ensure date exists
    const validData = data.filter((d) => d.date)

    // 2. SORT: oldest to newest
    const sorted = validData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // 3. Show all data points (removed the slice to show full range)
    return sorted
  }, [data])

  const max = useMemo(() => {
    if (points.length === 0) return 0
    return Math.max(...points.map((p) => p.amount || 0))
  }, [points])

  if (points.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed bg-muted/20 text-sm text-muted-foreground duration-500 animate-in fade-in">
        <div className="flex flex-col items-center gap-2">
          <BarChart3 className="h-8 w-8 opacity-20" />
          <p>{emptyLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[240px] items-end justify-between gap-2 pt-6 sm:gap-4">
      {points.map((point, i) => {
        const value = point.amount || 0
        const heightPct = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8
        const isPeak = value === max && value > 0

        return (
          <div
            key={point.date}
            className="group relative flex h-full w-full flex-col justify-end gap-2"
          >
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover:-top-10 group-hover:opacity-100">
              <div className="whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-semibold text-popover-foreground shadow-sm duration-200 animate-in zoom-in-95">
                {prefix}
                {value.toLocaleString()}
              </div>
            </div>

            <div className="relative flex h-full w-full items-end overflow-hidden transition-transform duration-200 hover:scale-[1.02]">
              <div
                className={cn(
                  'w-full rounded-t-lg transition-all duration-700 ease-out animate-in slide-in-from-bottom-10',
                  colorClass,
                  isPeak
                    ? 'opacity-100 ring-2 ring-primary/20 ring-offset-2'
                    : 'opacity-80 group-hover:opacity-100'
                )}
                style={{
                  height: `${heightPct}%`,
                  transitionDelay: `${i * 75}ms`,
                }}
              />
            </div>
            <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              {formatShortDateLabel(point.date)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  colorClass, // Expecting format like "bg-blue-600 text-blue-600" or "bg-primary text-primary"
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  colorClass: string
}) {
  // Extract the color name part from the bg- class (e.g., 'blue-600' from 'bg-blue-600')
  const bgClass = colorClass.split(' ').find((c) => c.startsWith('bg-'))
  const textClass = colorClass.split(' ').find((c) => c.startsWith('text-'))

  // Construct new classes manually to ensure compatibility
  // If bg-primary is passed, we want bg-primary/10. If bg-blue-600 is passed, we want bg-blue-600/10.
  const bgWithOpacity = bgClass ? `${bgClass}/10` : 'bg-muted'
  const hoverBgWithOpacity = bgClass ? `hover:${bgClass}/20` : 'hover:bg-muted/80'

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        'border-dashed/0 h-9 gap-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        bgWithOpacity,
        textClass,
        hoverBgWithOpacity
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </Button>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOfflineData, setIsOfflineData] = useState(false)
  const [duration, setDuration] = useState<DashboardDuration>('last_thirty_days')
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockItems, setLowStockItems] = useState<Stock[]>([])
  const [expiredItems, setExpiredItems] = useState<Stock[]>([])
  const [topProducts, setTopProducts] = useState<
    Array<{ name: string; revenue: number; qty: number }>
  >([])
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleDetailsOpen, setSaleDetailsOpen] = useState(false)

  const isOnline = useSyncStore((state) => state.isOnline)
  const isShopOwner = user?.role === 'shop-owner'
  const currencyData = useCurrency()
  const { format: formatCurrency, symbol: currencySymbol } = currencyData

  const dashboardCacheKey = useMemo(
    () =>
      getDashboardCacheKey(
        duration,
        fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
        toDate ? format(toDate, 'yyyy-MM-dd') : undefined
      ),
    [duration, fromDate, toDate]
  )

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
          dashboardService.getDashboard(
            duration,
            fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
            toDate ? format(toDate, 'yyyy-MM-dd') : undefined
          ),
        ])

        let dashboardDataResult = dashboardRes.data

        // Calculate stock_value if not provided by API
        if (
          dashboardDataResult &&
          (dashboardDataResult.stock_value === undefined || dashboardDataResult.stock_value === 0)
        ) {
          try {
            const stocksRes = await stocksListService.getAll({ limit: 1000 })
            const stocks = (Array.isArray(stocksRes.data) ? stocksRes.data : []) as Stock[]
            const calculatedStockValue = stocks.reduce(
              (sum, stock) => sum + stock.productStock * stock.productPurchasePrice,
              0
            )
            dashboardDataResult = {
              ...dashboardDataResult,
              stock_value: calculatedStockValue,
            }
          } catch (err) {
            console.warn('Failed to calculate stock value:', err)
          }
        }

        // Calculate total_due using the same logic as Due page
        try {
          const partiesRes = await partiesService.getAll()
          let parties: Party[] = []
          const payload = partiesRes?.data as unknown
          if (Array.isArray(payload)) {
            parties = payload
          } else if (
            typeof payload === 'object' &&
            payload !== null &&
            'data' in payload &&
            Array.isArray((payload as { data: unknown }).data)
          ) {
            parties = (payload as { data: Party[] }).data
          }
          const calculatedTotalDue = parties.reduce((acc, party) => acc + (party.due || 0), 0)
          dashboardDataResult = {
            ...dashboardDataResult,
            total_due: calculatedTotalDue,
          }
        } catch (err) {
          console.warn('Failed to calculate total due:', err)
        }

        setSummary(summaryRes.data)
        setDashboardData(dashboardDataResult)
        setIsOfflineData(false)

        // Cache for offline use (5 minutes TTL)
        setCache(CacheKeys.DASHBOARD_SUMMARY, summaryRes.data, { ttl: 5 * 60 * 1000 })
        setCache(dashboardCacheKey, dashboardDataResult, { ttl: 5 * 60 * 1000 })
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
  }, [isOnline, duration, fromDate, toDate, dashboardCacheKey])

  // Fetch additional data for recent sales, low stock, and top products
  useEffect(() => {
    const fetchExtraData = async () => {
      if (!isOnline || !navigator.onLine) return

      setLoadingExtra(true)
      try {
        // Fetch recent sales
        const salesRes = await salesService.getAll(false)
        const salesList = Array.isArray(salesRes?.data) ? salesRes.data : []
        setRecentSales(salesList.slice(0, 5))

        // Fetch low stock items using API filter (includes products & variants)
        const lowStockRes = await stocksListService.getLowStocks({ limit: 100 })
        const lowStock = Array.isArray(lowStockRes?.data) ? lowStockRes.data.slice(0, 5) : []
        setLowStockItems(lowStock)

        // Fetch expired items using API filter (includes products & variants)
        const expiredRes = await stocksListService.getExpiredStocks({ limit: 100 })
        const expired = Array.isArray(expiredRes?.data) ? expiredRes.data.slice(0, 5) : []
        setExpiredItems(expired)

        // Calculate top products by revenue
        if (salesList.length > 0) {
          const productRevenue: { [key: string]: { name: string; revenue: number; qty: number } } =
            {}
          salesList.forEach((sale: Sale) => {
            // Check for details (standard) or items (legacy/alternative)
            const items = Array.isArray(sale.details) ? sale.details : []

            items.forEach((item: SaleDetail) => {
              const key = item.product_id
              if (key) {
                // Try to get name from nested product object first, then direct properties
                const name = item.product?.productName || 'Unknown Product'

                // Try to get amount from subTotal, or calculate it
                let amount = item.subTotal || 0
                if (!amount && item.price && item.quantities) {
                  amount = item.price * item.quantities
                }

                const quantity = item.quantities

                productRevenue[key] = {
                  name,
                  revenue: (productRevenue[key]?.revenue || 0) + amount,
                  qty: (productRevenue[key]?.qty || 0) + quantity,
                }
              }
            })
          })
          const topProds = Object.values(productRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
          setTopProducts(topProds)
        }
      } catch (err) {
        console.warn('Failed to fetch extra dashboard data:', err)
      } finally {
        setLoadingExtra(false)
      }
    }

    fetchExtraData()
  }, [isOnline])

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
      {/* Header Section */}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Dashboard
            </h1>
            {isOfflineData && (
              <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                <WifiOff className="h-3 w-3" />
                Offline Mode
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            Overview of your store's performance and recent activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DateRangeFilter
            currentDuration={duration}
            currentDateRange={{ from: fromDate, to: toDate }}
            onApply={(newDuration, newRange) => {
              setDuration(newDuration)
              if (newDuration === 'custom_date') {
                setFromDate(newRange.from)
                setToDate(newRange.to)
              } else {
                setFromDate(undefined)
                setToDate(undefined)
              }
            }}
          />

          <Button
            variant="default"
            onClick={handleExport}
            className="gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Quick Actions */}
        {/* Quick Actions */}
        <section className="flex flex-wrap items-center justify-end gap-2">
          <QuickActionButton
            icon={Zap}
            label="New Sale"
            onClick={() => navigate('/pos')}
            colorClass="bg-primary text-primary"
          />
          <QuickActionButton
            icon={Package}
            label="New Purchase"
            onClick={() => navigate('/purchases')}
            colorClass="bg-blue-600 text-blue-600"
          />
          <QuickActionButton
            icon={Wallet}
            label="Add Income"
            onClick={() => navigate('/finance?tab=income')}
            colorClass="bg-emerald-600 text-emerald-600"
          />
          <QuickActionButton
            icon={CreditCard}
            label="Add Expense"
            onClick={() => navigate('/finance?tab=expenses')}
            colorClass="bg-rose-600 text-rose-600"
          />
          <QuickActionButton
            icon={AlertTriangle}
            label="Stock Alert"
            onClick={() => navigate('/stocks')}
            colorClass="bg-amber-500 text-amber-500"
          />
        </section>

        {/* Primary Stats - Only for shop owners */}
        {isShopOwner && (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Sales"
              value={formatCurrency(dashboardData?.total_sales || 0)}
              icon={ShoppingCart}
              iconContainerClassName="bg-primary/10 text-primary ring-1 ring-primary/20"
              iconClassName="text-primary"
              loading={loading}
            />
            <StatCard
              title="Total Income"
              value={formatCurrency(dashboardData?.total_income || 0)}
              icon={DollarSign}
              iconContainerClassName="bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
              iconClassName="text-emerald-500"
              loading={loading}
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(dashboardData?.total_expense || 0)}
              icon={TrendingDown}
              iconContainerClassName="bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20"
              iconClassName="text-rose-500"
              loading={loading}
            />
            <StatCard
              title="Net Profit"
              value={formatCurrency(dashboardData?.total_profit || 0)}
              icon={TrendingUp}
              iconContainerClassName="bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20"
              iconClassName="text-blue-500"
              loading={loading}
            />
          </section>
        )}

        {/* Secondary Stats & Inventory Health */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid gap-6 md:col-span-2">
            {/* Top Products */}
            <Card className="flex flex-col border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Top Selling Products
                </CardTitle>
                <CardDescription>Best performing items by revenue</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="flex flex-col">
                  {loadingExtra ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))
                  ) : topProducts.length > 0 ? (
                    topProducts.map((product, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center justify-between border-b p-4 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="mr-1 flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.qty} sold</p>
                          </div>
                        </div>
                        <div className="text-sm font-semibold">
                          {formatCurrency(product.revenue)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <Package className="mb-2 h-10 w-10 opacity-20" />
                      <p>No products sold yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="flex flex-col border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest invoiced sales</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <div className="flex flex-col">
                  {loadingExtra ? (
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="border-b p-4 last:border-0">
                        <Skeleton className="mb-2 h-6 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ))
                  ) : recentSales.length > 0 ? (
                    recentSales.map((sale: Sale, idx) => (
                      <div
                        key={idx}
                        className="flex cursor-pointer items-center justify-between border-b p-4 transition-colors last:border-0 hover:bg-muted/30"
                        onClick={() => {
                          setSelectedSale(sale)
                          setSaleDetailsOpen(true)
                        }}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Invoice #{sale.invoiceNumber || String(sale.id).padStart(6, '0')}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                              {sale.payment_type?.name || 'Cash'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {sale.saleDate
                              ? format(parseISO(sale.saleDate), 'MMM dd, hh:mm a')
                              : 'Just now'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {formatCurrency(sale.totalAmount || 0)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground opacity-50" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <CreditCard className="mb-2 h-10 w-10 opacity-20" />
                      <p>No transactions yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Inventory Health - Only for shop owners */}
            {isShopOwner && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Inventory Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-dashed p-3 transition-colors hover:border-primary hover:bg-primary/5"
                    onClick={() => navigate('/stocks')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Stock Value</p>
                        <p className="text-xs text-muted-foreground">Total inventory worth</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(dashboardData?.stock_value || 0)}</p>
                    </div>
                  </div>

                  <div
                    className="group flex cursor-pointer items-center justify-between rounded-lg border border-dashed p-3 transition-colors hover:border-red-500 hover:bg-red-50"
                    onClick={() => navigate('/due')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Due</p>
                        <p className="text-xs text-muted-foreground">Pending payments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(dashboardData?.total_due || 0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Stock Alert */}
            <Card
              className={cn(
                'border-border/50 shadow-sm',
                lowStockItems.length > 0 &&
                  'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        'h-4 w-4',
                        lowStockItems.length > 0
                          ? 'text-amber-600 dark:text-amber-500'
                          : 'text-muted-foreground'
                      )}
                    />
                    <span>Low Stock</span>
                  </div>
                  {lowStockItems.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-500">
                      {lowStockItems.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockItems.length > 0 ? (
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 4).map((item: Stock, idx) => {
                      const variantName = item.variant?.variant_name || item.variant_name
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-md bg-background/60 p-2 text-sm shadow-sm ring-1 ring-inset ring-border"
                        >
                          <div className="flex flex-col">
                            <span
                              className="max-w-[120px] truncate font-medium"
                              title={item.product?.productName || item.product_name}
                            >
                              {item.product?.productName || item.product_name || 'Unknown'}
                            </span>
                            {variantName && (
                              <span className="text-[10px] text-muted-foreground">
                                {variantName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Qty:{' '}
                              <span className="font-semibold text-foreground">
                                {item.productStock}
                              </span>
                            </span>
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                          </div>
                        </div>
                      )
                    })}
                    {lowStockItems.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-xs"
                        onClick={() => navigate('/stocks')}
                      >
                        View all {lowStockItems.length} items
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <p className="text-sm">Stock levels are healthy</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expired Products Alert */}
            <Card
              className={cn(
                'border-border/50 shadow-sm',
                expiredItems.length > 0 &&
                  'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
              )}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        'h-4 w-4',
                        expiredItems.length > 0
                          ? 'text-red-600 dark:text-red-500'
                          : 'text-muted-foreground'
                      )}
                    />
                    <span>Expired Items</span>
                  </div>
                  {expiredItems.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-900 dark:text-red-500">
                      {expiredItems.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiredItems.length > 0 ? (
                  <div className="space-y-3">
                    {expiredItems.slice(0, 4).map((item: Stock, idx) => {
                      const variantName = item.variant?.variant_name || item.variant_name
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-md bg-background/60 p-2 text-sm shadow-sm ring-1 ring-inset ring-border"
                        >
                          <div className="flex flex-col">
                            <span
                              className="max-w-[120px] truncate font-medium"
                              title={item.product?.productName || item.product_name}
                            >
                              {item.product?.productName || item.product_name || 'Unknown'}
                            </span>
                            {variantName && (
                              <span className="text-[10px] text-muted-foreground">
                                {variantName}
                              </span>
                            )}
                            <span className="text-[10px] font-medium text-red-500">
                              Expired:{' '}
                              {item.expire_date
                                ? format(parseISO(item.expire_date), 'MMM dd')
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Qty:{' '}
                              <span className="font-semibold text-foreground">
                                {item.productStock}
                              </span>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {expiredItems.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-xs"
                        onClick={() => navigate('/stocks')}
                      >
                        View all {expiredItems.length} items
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                    <p className="text-sm">No expired items</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Sales Overview</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Revenue performance over time
                  </CardDescription>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <BarChart
                  data={dashboardData?.sales || []}
                  colorClass="bg-gradient-to-t from-primary/60 to-primary"
                  emptyLabel="No sales data available"
                  prefix={currencySymbol}
                />
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="border-b bg-muted/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Purchases Overview</CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Inventory acquisition costs
                  </CardDescription>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <BarChart
                  data={dashboardData?.purchases || []}
                  colorClass="bg-gradient-to-t from-blue-500/60 to-blue-500"
                  emptyLabel="No purchase data available"
                  prefix={currencySymbol}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        sale={selectedSale}
        open={saleDetailsOpen}
        onOpenChange={setSaleDetailsOpen}
      />
    </div>
  )
}

export default DashboardPage
