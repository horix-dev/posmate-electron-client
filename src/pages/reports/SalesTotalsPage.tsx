import { useMemo, useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSalesTotalsReport } from './hooks/useSalesTotalsReport'
import { useCurrency } from '@/hooks'
import type { TransactionSummaryParams } from '@/api/services/reports.service'
import type { ReportPeriod } from '@/types/api.types'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores'
import { toast } from 'sonner'

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_year', label: 'Current Year' },
]

export default function SalesTotalsPage() {
  const { format: formatCurrency } = useCurrency()
  const token = useAuthStore((state) => state.token)

  // Filters state
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [branchId, setBranchId] = useState<number | undefined>()
  const [useCustomDates, setUseCustomDates] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Build query params
  const params = useMemo<TransactionSummaryParams>(() => {
    const p: TransactionSummaryParams = {}

    if (useCustomDates) {
      if (fromDate) p.from_date = fromDate
      if (toDate) p.to_date = toDate
    } else {
      p.period = period
    }

    if (branchId) p.branch_id = branchId

    return p
  }, [period, fromDate, toDate, branchId, useCustomDates])

  const { data, isLoading, isError, isOnline } = useSalesTotalsReport(params)

  // Debug: Log data when it changes
  useEffect(() => {
    if (data) {
      console.log('Sales Totals Data:', data)
      console.log('Total Cost:', data.totals.total_cost)
      console.log('Total Sale Price:', data.totals.total_sale_price)
      console.log('Total Profit:', data.totals.total_profit)
    }
  }, [data])

  const handleClearFilters = () => {
    setPeriod('today')
    setFromDate('')
    setToDate('')
    setBranchId(undefined)
    setUseCustomDates(false)
  }

  const getProductTypeLabel = (type: string) => {
    switch (type) {
      case 'single':
        return 'Single'
      case 'variant':
        return 'Variant'
      case 'combo':
        return 'Combo'
      default:
        return type
    }
  }

  const getProductTypeBadgeVariant = (
    type: string
  ): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (type) {
      case 'single':
        return 'default'
      case 'variant':
        return 'secondary'
      case 'combo':
        return 'outline'
      default:
        return 'default'
    }
  }

  const handleExport = async (format: 'excel' | 'csv') => {
    if (!token) {
      toast.error('Authentication required. Please login again.')
      return
    }

    setIsExporting(true)
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
      const queryParams = new URLSearchParams()

      // Add filters to query params
      if (useCustomDates) {
        if (fromDate) queryParams.set('from_date', fromDate)
        if (toDate) queryParams.set('to_date', toDate)
      } else {
        queryParams.set('period', period)
      }

      if (branchId) queryParams.set('branch_id', branchId.toString())

      const endpoint = format === 'excel' ? 'export-excel' : 'export-csv'
      const url = `${baseUrl}/api/v1/reports/sales/totals/${endpoint}?${queryParams.toString()}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `sales-totals-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`

      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (matches?.[1]) {
          filename = matches[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success(`Report exported successfully as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error(`Failed to export report. Please try again.`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Totals Report</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive breakdown of sales by product with cost, profit, and margins
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              Offline Mode
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={isExporting || isLoading || !data}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting || isLoading || !data}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Period or Custom Date Toggle */}
            <div className="space-y-2">
              <Label>Date Range Type</Label>
              <Select
                value={useCustomDates ? 'custom' : 'period'}
                onValueChange={(value) => setUseCustomDates(value === 'custom')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Predefined Period</SelectItem>
                  <SelectItem value="custom">Custom Dates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Selection */}
            {!useCustomDates && (
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Date Range */}
            {useCustomDates && (
              <>
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sale Price</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.totals.total_sale_price)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.totals.total_transactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totals.total_cost)}</div>
                <p className="text-xs text-muted-foreground">
                  {data.totals.total_items_sold} items sold
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.totals.total_profit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.totals.profit_margin.toFixed(2)}% margin
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totals.total_items_sold}</div>
                <p className="text-xs text-muted-foreground">
                  {data.products.length} unique products
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary by Product Type */}
          {Object.keys(data.summary_by_type).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Summary by Product Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(data.summary_by_type).map(([type, summary]) => (
                    <div
                      key={type}
                      className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{type} Products</span>
                        <Badge variant={getProductTypeBadgeVariant(type)}>{summary.count}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quantity:</span>
                          <span className="font-medium">{summary.total_quantity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sales:</span>
                          <span className="font-medium">
                            {formatCurrency(summary.total_sale_price)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Profit:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(summary.total_profit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : isError ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Failed to load product details
                </div>
              ) : data.products.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No sales data found for the selected period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Variant</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Sale Price</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Sales Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.products.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>
                            <Badge variant={getProductTypeBadgeVariant(product.product_type)}>
                              {getProductTypeLabel(product.product_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.variant_name || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {product.batch_no ? (
                              <div>
                                <div className="font-medium">{product.batch_no}</div>
                                {product.expire_date && (
                                  <div className="text-xs text-muted-foreground">
                                    Exp: {new Date(product.expire_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">{product.total_quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.total_cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(product.total_sale_price)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(product.total_profit)}
                          </TableCell>
                          <TableCell className="text-right">{product.sales_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading sales totals report...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load sales totals report. Please try again.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
