import { useEffect, useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { Landmark, RefreshCw, Search, Banknote, Loader2, FileText, ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { BankTransaction, Bank } from '@/types/api.types'
import banksService from '@/api/services/banks.service'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import type { DateRange } from 'react-day-picker'

export default function BankTransactionsPage() {
  const { format: formatCurrency } = useCurrency()
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBankId, setSelectedBankId] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Fetch banks for filter
  const fetchBanks = useCallback(async () => {
    try {
      const res = await banksService.getAll({ limit: 1000 })
      const list = (res?.data || []) as Bank[]
      setBanks(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Failed to load banks', error)
    }
  }, [])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 1000 }
      
      if (selectedBankId !== 'all') {
        params.bank_id = Number(selectedBankId)
      }
      
      // Handle transfer filters - convert to API format
      if (selectedType !== 'all') {
        if (selectedType === 'transfer_in') {
          params.type = 'transfer'
          params.direction = 'in'
        } else if (selectedType === 'transfer_out') {
          params.type = 'transfer'
          params.direction = 'out'
        } else if (selectedType === 'transfer') {
          params.type = 'transfer'
        } else {
          params.type = selectedType
        }
      }
      
      if (dateRange?.from) {
        params.date_from = format(dateRange.from, 'yyyy-MM-dd')
      }
      
      if (dateRange?.to) {
        params.date_to = format(dateRange.to, 'yyyy-MM-dd')
      }

      const res = await banksService.getAllTransactions(params)
      const list = (res?.data || []) as BankTransaction[]
      setTransactions(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }, [selectedBankId, selectedType, dateRange])

  useEffect(() => {
    fetchBanks()
  }, [fetchBanks])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const filteredTransactions = transactions.filter((t) => {
    // Apply type filter client-side for transfer direction
    if (selectedType !== 'all') {
      if (selectedType === 'transfer_in' && (t.type !== 'transfer' || !t.is_inflow)) return false
      if (selectedType === 'transfer_out' && (t.type !== 'transfer' || !t.is_outflow)) return false
      if (selectedType === 'transfer' && t.type !== 'transfer') return false
      if (selectedType === 'deposit' && t.type !== 'deposit') return false
      if (selectedType === 'withdrawal' && t.type !== 'withdrawal') return false
    }

    // Apply search filter
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (t.description || '').toLowerCase().includes(q) ||
      (t.reference || '').toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage)
  const startIndex = (page - 1) * rowsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + rowsPerPage)

  // Reset page when search/filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedBankId, selectedType, dateRange])

  const getTransactionTypeLabel = (type: string, direction?: string) => {
    if (type === 'transfer' && direction) {
      return direction === 'in' ? 'Transfer In' : 'Transfer Out'
    }
    const labels: Record<string, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transfer: 'Transfer',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
    }
    return labels[type] || type
  }

  const getTransactionTypeBadgeColor = (type: string, _direction?: string, is_inflow?: boolean): React.CSSProperties => {
    if (type === 'transfer') {
      return is_inflow 
        ? { backgroundColor: '#dcfce7', color: '#166534' } // Light green text for Transfer In
        : { backgroundColor: '#fee2e2', color: '#991b1b' } // Light red text for Transfer Out
    }
    
    const colors: Record<string, React.CSSProperties> = {
      deposit: { backgroundColor: '#dcfce7', color: '#166534' }, // Green - Deposit
      transfer_in: { backgroundColor: '#dbeafe', color: '#1e40af' }, // Blue - Transfer In
      withdrawal: { backgroundColor: '#fee2e2', color: '#991b1b' }, // Red - Withdrawal
      transfer_out: { backgroundColor: '#fef3c7', color: '#92400e' }, // Amber - Transfer Out
    }
    return colors[type] || { backgroundColor: '#e5e7eb', color: '#374151' } // Default gray
  }

  // Calculate totals
  const totalDeposits = filteredTransactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = filteredTransactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalTransfersOut = filteredTransactions
    .filter(t => t.type === 'transfer' && t.is_outflow)
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Transactions</h1>
          <p className="text-muted-foreground">View and manage all bank transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchTransactions()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 max-w-5xl">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +{formatCurrency(totalDeposits)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Incoming funds</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(totalWithdrawals)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Outgoing funds</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfer Out</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              -{formatCurrency(totalTransfersOut)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Outgoing transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="h-10 border border-input bg-background pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedBankId}
          onChange={(e) => setSelectedBankId(e.target.value)}
        >
          <option value="all">All Banks</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="deposit">Deposits Only</option>
          <option value="withdrawal">Withdrawals Only</option>
          <option value="transfer">Transfers Only</option>
          <option value="transfer_in">Transfers In</option>
          <option value="transfer_out">Transfers Out</option>
        </select>
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          placeholder="Filter by date"
        />
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(v) => {
              setRowsPerPage(Number(v))
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.map((t) => {
                let dateDisplay = '-'
                try {
                  if (t.date) {
                    const date = typeof t.date === 'string' 
                      ? parseISO(t.date) 
                      : new Date(t.date)
                    dateDisplay = format(date, 'MMM dd, yyyy')
                  }
                } catch (error) {
                  console.error('Date parse error:', error, t.date)
                  dateDisplay = String(t.date)
                }

                const bankName = t.bank?.name || t.bank_name || `Bank #${t.bank_id}`
                const accountNumber = t.bank?.account_number || '-'

                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      {dateDisplay}
                    </TableCell>
                    <TableCell className="font-medium">
                      {bankName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {accountNumber}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={getTransactionTypeBadgeColor(t.type, t.direction, t.is_inflow)}
                        className="font-medium"
                      >
                        {getTransactionTypeLabel(t.type, t.direction)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {t.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={t.is_inflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {t.is_inflow ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {t.balance_after ? formatCurrency(t.balance_after) : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {!isLoading && filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between py-2 px-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredTransactions.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, Math.max(totalPages, 1)) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else {
                    if (page <= 3) pageNum = i + 1
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = page - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
