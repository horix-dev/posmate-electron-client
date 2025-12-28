import { useMemo, useState } from 'react'
import { ShoppingCart, CircleDollarSign, Wallet, AlertCircle, Package, Undo2, Calendar } from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSalesReport } from './hooks/useSalesReport'
import { usePurchasesReport } from './hooks/usePurchasesReport'
import { useSaleReturnsReport } from './hooks/useSaleReturnsReport'
import { usePurchaseReturnsReport } from './hooks/usePurchaseReturnsReport'
import type { TransactionReportParams } from '@/api/services/reports.service'
import type { ReportPeriod } from '@/types/api.types'
import { useDebounce } from '@/hooks/useDebounce'

function toDateOnly(value: unknown): string {
  if (!value) return '-'

  if (value instanceof Date) return value.toISOString().slice(0, 10)

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '-'

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    if (trimmed.includes('T')) return trimmed.split('T')[0] ?? '-'
    if (trimmed.includes(' ')) return trimmed.split(' ')[0] ?? '-'

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
    return trimmed
  }

  const parsed = new Date(String(value))
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return '-'
}

export function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('today')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const baseParams = useMemo<TransactionReportParams>(() => {
    const params: TransactionReportParams = { per_page: 20, page: 1, period }
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
    return params
  }, [period, debouncedSearch])

  const salesQuery = useSalesReport(baseParams)
  const purchasesQuery = usePurchasesReport(baseParams)
  const saleReturnsQuery = useSaleReturnsReport(baseParams)
  const purchaseReturnsQuery = usePurchaseReturnsReport(baseParams)

  const salesRows = useMemo(() => {
    const salesAny = salesQuery.data?.sales as unknown
    if (Array.isArray(salesAny)) return salesAny
    if (salesAny && typeof salesAny === 'object' && 'data' in (salesAny as Record<string, unknown>)) {
      const inner = (salesAny as { data?: unknown }).data
      return Array.isArray(inner) ? inner : []
    }
    return []
  }, [salesQuery.data])

  const purchaseRows = useMemo(() => {
    const purchasesAny = purchasesQuery.data?.purchases as unknown
    if (Array.isArray(purchasesAny)) return purchasesAny
    if (
      purchasesAny &&
      typeof purchasesAny === 'object' &&
      'data' in (purchasesAny as Record<string, unknown>)
    ) {
      const inner = (purchasesAny as { data?: unknown }).data
      return Array.isArray(inner) ? inner : []
    }
    return []
  }, [purchasesQuery.data])

  const saleReturnRows = useMemo(() => {
    const salesAny = saleReturnsQuery.data?.sales as unknown
    const sales: any[] =
      Array.isArray(salesAny)
        ? salesAny
        : salesAny && typeof salesAny === 'object' && 'data' in (salesAny as Record<string, unknown>)
          ? (Array.isArray((salesAny as any).data) ? (salesAny as any).data : [])
          : []

    return sales.flatMap((sale: any) => {
      const returnsAny = sale?.saleReturns ?? sale?.sale_returns
      const returns: any[] = Array.isArray(returnsAny) ? returnsAny : []

      return returns.map((r: any) => ({
        key: `return-${sale?.id ?? 'x'}-${r?.id ?? Math.random()}`,
        invoice: sale?.invoiceNumber ?? sale?.invoice_number ?? '-',
        saleDate: sale?.saleDate ?? sale?.sale_date ?? '-',
        returnDate: r?.return_date ?? r?.returnDate ?? '-',
        party: sale?.party?.name ?? '-',
        returnAmount: r?.total_return_amount ?? r?.totalReturnAmount ?? 0,
        returnQty:
          (r?.details ?? []).reduce(
            (sum: number, d: any) => sum + Number(d?.return_qty ?? d?.returnQty ?? 0),
            0
          ) ?? 0,
      }))
    })
  }, [saleReturnsQuery.data])

  const purchaseReturnRows = useMemo(() => {
    const purchasesAny = purchaseReturnsQuery.data?.purchases as unknown
    const purchases: any[] =
      Array.isArray(purchasesAny)
        ? purchasesAny
        : purchasesAny && typeof purchasesAny === 'object' && 'data' in (purchasesAny as Record<string, unknown>)
          ? (Array.isArray((purchasesAny as any).data) ? (purchasesAny as any).data : [])
          : []

    return purchases.flatMap((purchase: any) => {
      const returnsAny = purchase?.purchaseReturns ?? purchase?.purchase_returns
      const returns: any[] = Array.isArray(returnsAny) ? returnsAny : []

      return returns.map((r: any) => ({
        key: `return-${purchase?.id ?? 'x'}-${r?.id ?? Math.random()}`,
        invoice: purchase?.invoiceNumber ?? purchase?.invoice_number ?? '-',
        purchaseDate: purchase?.purchaseDate ?? purchase?.purchase_date ?? '-',
        returnDate: r?.return_date ?? r?.returnDate ?? '-',
        party: purchase?.party?.name ?? '-',
        returnAmount: r?.total_return_amount ?? r?.totalReturnAmount ?? 0,
        returnQty:
          (r?.details ?? []).reduce(
            (sum: number, d: any) => sum + Number(d?.return_qty ?? d?.returnQty ?? 0),
            0
          ) ?? 0,
      }))
    })
  }, [purchaseReturnsQuery.data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Sales and purchase transaction reports</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Period</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="current_year">Current Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="report-search">Search</Label>
          <Input
            id="report-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice, party, payment type, branch..."
            className="w-[320px]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              salesQuery.refetch()
              purchasesQuery.refetch()
              saleReturnsQuery.refetch()
              purchaseReturnsQuery.refetch()
            }}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPeriod('today')
              setSearch('')
            }}
          >
            Reset
          </Button>
        </div>

        {!salesQuery.isOnline && (
          <p className="text-sm text-muted-foreground">Offline: showing cached data when available</p>
        )}
      </div>

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Sales Report</TabsTrigger>
          <TabsTrigger value="purchases">Purchase Report</TabsTrigger>
          <TabsTrigger value="sale-returns">Sale Returns</TabsTrigger>
          <TabsTrigger value="purchase-returns">Purchase Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {salesQuery.data?.summary?.total_sales ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      Total Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(salesQuery.data?.summary?.total_amount ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(salesQuery.data?.summary?.total_paid ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      Total Due
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(salesQuery.data?.summary?.total_due ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : salesQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          Failed to load sales report.
                        </TableCell>
                      </TableRow>
                    ) : salesRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          No sales found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      salesRows.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.invoiceNumber ?? row.invoice_number ?? '-'}
                          </TableCell>
                          <TableCell>{toDateOnly(row.saleDate ?? row.sale_date)}</TableCell>
                          <TableCell>{row.party?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {(row.totalAmount ?? row.total_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(row.paidAmount ?? row.paid_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(row.dueAmount ?? row.due_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>{row.payment_type?.name ?? row.paymentType ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Total Purchases
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {purchasesQuery.data?.summary?.total_purchases ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      Total Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(purchasesQuery.data?.summary?.total_amount ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(purchasesQuery.data?.summary?.total_paid ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      Total Due
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(purchasesQuery.data?.summary?.total_due ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchasesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : purchasesQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          Failed to load purchases report.
                        </TableCell>
                      </TableRow>
                    ) : purchaseRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-muted-foreground">
                          No purchases found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseRows.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.invoiceNumber ?? row.invoice_number ?? '-'}
                          </TableCell>
                          <TableCell>{toDateOnly(row.purchaseDate ?? row.purchase_date)}</TableCell>
                          <TableCell>{row.party?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {(row.totalAmount ?? row.total_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(row.paidAmount ?? row.paid_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(row.dueAmount ?? row.due_amount ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell>{row.payment_type?.name ?? row.paymentType ?? '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sale-returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sale Returns Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                      Total Returns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {saleReturnsQuery.data?.summary?.total_returns ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      Return Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(saleReturnsQuery.data?.summary?.total_return_amount ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                      Return Quantity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(saleReturnsQuery.data?.summary?.total_return_quantity ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {toDateOnly(saleReturnsQuery.data?.summary?.period?.from)} -{' '}
                    {toDateOnly(saleReturnsQuery.data?.summary?.period?.to)}
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Sale Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Return Qty</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleReturnsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : saleReturnsQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Failed to load sale returns report.
                        </TableCell>
                      </TableRow>
                    ) : saleReturnRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No sale returns found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      saleReturnRows.map((row: any) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.invoice}</TableCell>
                          <TableCell>{toDateOnly(row.saleDate)}</TableCell>
                          <TableCell>{toDateOnly(row.returnDate)}</TableCell>
                          <TableCell>{row.party}</TableCell>
                          <TableCell className="text-right">{Number(row.returnQty ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {Number(row.returnAmount ?? 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Returns Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                      Total Returns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {purchaseReturnsQuery.data?.summary?.total_returns ?? 0}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      Return Amount
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(purchaseReturnsQuery.data?.summary?.total_return_amount ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Undo2 className="h-4 w-4 text-muted-foreground" />
                      Return Quantity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-semibold">
                    {(purchaseReturnsQuery.data?.summary?.total_return_quantity ?? 0).toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {toDateOnly(purchaseReturnsQuery.data?.summary?.period?.from)} -{' '}
                    {toDateOnly(purchaseReturnsQuery.data?.summary?.period?.to)}
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Return Qty</TableHead>
                      <TableHead className="text-right">Return Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseReturnsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : purchaseReturnsQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          Failed to load purchase returns report.
                        </TableCell>
                      </TableRow>
                    ) : purchaseReturnRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-muted-foreground">
                          No purchase returns found for the selected period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchaseReturnRows.map((row: any) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.invoice}</TableCell>
                          <TableCell>{toDateOnly(row.purchaseDate)}</TableCell>
                          <TableCell>{toDateOnly(row.returnDate)}</TableCell>
                          <TableCell>{row.party}</TableCell>
                          <TableCell className="text-right">{Number(row.returnQty ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {Number(row.returnAmount ?? 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ReportsPage
