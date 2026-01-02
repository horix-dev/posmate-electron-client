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
import { useCurrency } from '@/hooks'
import type { TransactionReportParams } from '@/api/services/reports.service'
import type { ReportPeriod } from '@/types/api.types'
import { useDebounce } from '@/hooks/useDebounce'

type UnknownRecord = Record<string, unknown>

interface SalesReportRow {
  id?: number
  invoiceNumber?: string
  invoice_number?: string
  saleDate?: string
  sale_date?: string
  totalAmount?: number
  total_amount?: number
  
  // Old fields (backward compatibility)
  paidAmount?: number
  paid_amount?: number
  dueAmount?: number
  due_amount?: number
  
  // New fields (due collection tracking)
  total_paid_amount?: number
  remaining_due_amount?: number
  initial_paidAmount?: number
  initial_dueAmount?: number
  due_collections_total?: number
  due_collections_count?: number
  is_fully_paid?: boolean
  
  paymentType?: string
  payment_type?: { name?: string }
  party?: { name?: string }
}

interface PurchaseReportRow {
  id?: number
  invoiceNumber?: string
  invoice_number?: string
  purchaseDate?: string
  purchase_date?: string
  totalAmount?: number
  total_amount?: number
  paidAmount?: number
  paid_amount?: number
  dueAmount?: number
  due_amount?: number
  paymentType?: string
  payment_type?: { name?: string }
  party?: { name?: string }
}

interface ReturnDetail {
  return_qty?: number
  returnQty?: number
}

interface SaleReturnEntry {
  id?: number
  return_date?: string
  returnDate?: string
  total_return_amount?: number
  totalReturnAmount?: number
  details?: ReturnDetail[]
}

type PurchaseReturnEntry = SaleReturnEntry

type SaleWithReturns = SalesReportRow & {
  saleReturns?: SaleReturnEntry[]
  sale_returns?: SaleReturnEntry[]
}

type PurchaseWithReturns = PurchaseReportRow & {
  purchaseReturns?: PurchaseReturnEntry[]
  purchase_returns?: PurchaseReturnEntry[]
}

interface SaleReturnRow {
  key: string
  invoice: string
  saleDate: string
  returnDate: string
  party: string
  returnAmount: number
  returnQty: number
}

interface PurchaseReturnRow {
  key: string
  invoice: string
  purchaseDate: string
  returnDate: string
  party: string
  returnAmount: number
  returnQty: number
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null

const unwrapDataArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[]
  if (isRecord(value) && Array.isArray(value.data)) {
    return value.data as T[]
  }
  return []
}

const sumReturnQuantity = (details: ReturnDetail[] | undefined): number =>
  (details ?? []).reduce(
    (sum, detail) => sum + Number(detail.return_qty ?? detail.returnQty ?? 0),
    0
  )

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
  const { format: formatCurrency } = useCurrency()
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

  const salesRows = useMemo<SalesReportRow[]>(() => {
    return unwrapDataArray<SalesReportRow>(salesQuery.data?.sales)
  }, [salesQuery.data])

  const purchaseRows = useMemo<PurchaseReportRow[]>(() => {
    return unwrapDataArray<PurchaseReportRow>(purchasesQuery.data?.purchases)
  }, [purchasesQuery.data])

  const saleReturnRows = useMemo<SaleReturnRow[]>(() => {
    const sales = unwrapDataArray<SaleWithReturns>(saleReturnsQuery.data?.sales)

    return sales.flatMap((sale, saleIndex) => {
      const returns = unwrapDataArray<SaleReturnEntry>(sale.saleReturns ?? sale.sale_returns)

      return returns.map((r, returnIndex) => ({
        key: `return-${sale.id ?? saleIndex}-${r.id ?? returnIndex}`,
        invoice: sale.invoiceNumber ?? sale.invoice_number ?? '-',
        saleDate: sale.saleDate ?? sale.sale_date ?? '-',
        returnDate: r.return_date ?? r.returnDate ?? '-',
        party: sale.party?.name ?? '-',
        returnAmount: Number(r.total_return_amount ?? r.totalReturnAmount ?? 0),
        returnQty: sumReturnQuantity(Array.isArray(r.details) ? r.details : []),
      }))
    })
  }, [saleReturnsQuery.data])

  const purchaseReturnRows = useMemo<PurchaseReturnRow[]>(() => {
    const purchases = unwrapDataArray<PurchaseWithReturns>(purchaseReturnsQuery.data?.purchases)

    return purchases.flatMap((purchase, purchaseIndex) => {
      const returns = unwrapDataArray<PurchaseReturnEntry>(
        purchase.purchaseReturns ?? purchase.purchase_returns
      )

      return returns.map((r, returnIndex) => ({
        key: `return-${purchase.id ?? purchaseIndex}-${r.id ?? returnIndex}`,
        invoice: purchase.invoiceNumber ?? purchase.invoice_number ?? '-',
        purchaseDate: purchase.purchaseDate ?? purchase.purchase_date ?? '-',
        returnDate: r.return_date ?? r.returnDate ?? '-',
        party: purchase.party?.name ?? '-',
        returnAmount: Number(r.total_return_amount ?? r.totalReturnAmount ?? 0),
        returnQty: sumReturnQuantity(Array.isArray(r.details) ? r.details : []),
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
                    {formatCurrency(salesQuery.data?.summary?.total_amount ?? 0)}
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
                    {formatCurrency(salesQuery.data?.summary?.total_paid ?? 0)}
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
                    {formatCurrency(salesQuery.data?.summary?.total_due ?? 0)}
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
                      salesRows.map((row) => {
                        // Calculate payment details with fallback logic
                        const totalAmount = row.totalAmount ?? row.total_amount ?? 0
                        const initialPaid = row.initial_paidAmount ?? row.paidAmount ?? row.paid_amount ?? 0
                        const currentDue = row.dueAmount ?? row.due_amount ?? 0
                        
                        // Calculate collections: original due minus current due
                        const originalDue = totalAmount - initialPaid
                        const collectionsTotal = row.due_collections_total ?? (originalDue - currentDue)
                        const hasDueCollections = collectionsTotal > 0
                        const collectionsCount = row.due_collections_count ?? (hasDueCollections ? 1 : 0)
                        
                        // Calculate total paid: initial + collections
                        const totalPaid = row.total_paid_amount ?? (initialPaid + collectionsTotal)
                        const remainingDue = row.remaining_due_amount ?? currentDue
                        
                        return (
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
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {totalPaid.toLocaleString()}
                                </span>
                                {hasDueCollections && (
                                  <div className="flex flex-col items-end text-xs text-muted-foreground space-y-0.5 mt-1 pl-2 border-l-2 border-muted">
                                    <span>Initial: {initialPaid.toLocaleString()}</span>
                                    <span className="text-green-600 dark:text-green-400">
                                      +Collections: {collectionsTotal.toLocaleString()} ({collectionsCount})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {remainingDue > 0 ? (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  {remainingDue.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>{row.payment_type?.name ?? row.paymentType ?? '-'}</TableCell>
                          </TableRow>
                        )
                      })
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
                    {formatCurrency(purchasesQuery.data?.summary?.total_amount ?? 0)}
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
                    {formatCurrency(purchasesQuery.data?.summary?.total_paid ?? 0)}
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
                    {formatCurrency(purchasesQuery.data?.summary?.total_due ?? 0)}
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
                      purchaseRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.invoiceNumber ?? row.invoice_number ?? '-'}
                          </TableCell>
                          <TableCell>{toDateOnly(row.purchaseDate ?? row.purchase_date)}</TableCell>
                          <TableCell>{row.party?.name ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.totalAmount ?? row.total_amount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.paidAmount ?? row.paid_amount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.dueAmount ?? row.due_amount ?? 0)}
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
                    {formatCurrency(saleReturnsQuery.data?.summary?.total_return_amount ?? 0)}
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
                      saleReturnRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.invoice}</TableCell>
                          <TableCell>{toDateOnly(row.saleDate)}</TableCell>
                          <TableCell>{toDateOnly(row.returnDate)}</TableCell>
                          <TableCell>{row.party}</TableCell>
                          <TableCell className="text-right">{Number(row.returnQty ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.returnAmount ?? 0)}
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
                    {formatCurrency(purchaseReturnsQuery.data?.summary?.total_return_amount ?? 0)}
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
                      purchaseReturnRows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="font-medium">{row.invoice}</TableCell>
                          <TableCell>{toDateOnly(row.purchaseDate)}</TableCell>
                          <TableCell>{toDateOnly(row.returnDate)}</TableCell>
                          <TableCell>{row.party}</TableCell>
                          <TableCell className="text-right">{Number(row.returnQty ?? 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.returnAmount ?? 0)}
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
