import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { RefreshCw, Search, FileText, ChevronLeft, ChevronRight, Landmark, BadgeCheck, AlertTriangle } from 'lucide-react'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import type { DateRange } from 'react-day-picker'
import type { Cheque, ChequeStatus, ChequeType } from '@/types/api.types'
import { useCheques } from './hooks/useCheques'
import ChequeFormDialog from './components/ChequeFormDialog'

const STATUS_OPTIONS: Array<ChequeStatus | 'all'> = [
  'all',
  'pending',
  'deposited',
  'cleared',
  'bounced',
  'cancelled',
  'issued',
]

const TYPE_OPTIONS: Array<ChequeType | 'all'> = ['all', 'received', 'issued']

export default function ChequesPage() {
  const { format: formatCurrency } = useCurrency()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ChequeStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ChequeType | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [queuedCheques, setQueuedCheques] = useState<Cheque[]>([])
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const { cheques, isLoading, refetch, isOffline } = useCheques({
    status: statusFilter,
    type: typeFilter,
    date_from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    date_to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  })

  const mergedCheques = useMemo(() => {
    if (!queuedCheques.length) return cheques
    const existingIds = new Set(cheques.map((c) => c.id))
    const merged = [...queuedCheques.filter((c) => !existingIds.has(c.id)), ...cheques]
    return merged
  }, [queuedCheques, cheques])

  const filteredCheques = mergedCheques.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (c.cheque_number || '').toLowerCase().includes(q) ||
      (c.bank_name || '').toLowerCase().includes(q) ||
      (c.account_holder || '').toLowerCase().includes(q) ||
      (c.party?.name || '').toLowerCase().includes(q) ||
      (c.dueCollect?.purpose || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredCheques.length / rowsPerPage)
  const startIndex = (page - 1) * rowsPerPage
  const paginatedCheques = filteredCheques.slice(startIndex, startIndex + rowsPerPage)

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, typeFilter, dateRange, rowsPerPage])

  const totals = useMemo(() => {
    const pending = filteredCheques.filter((c) => c.status === 'pending').length
    const cleared = filteredCheques.filter((c) => c.status === 'cleared').length
    const issued = filteredCheques.filter((c) => c.type === 'issued').length
    return { pending, cleared, issued }
  }, [filteredCheques])

  const getStatusVariant = (status: ChequeStatus) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'deposited':
        return 'secondary'
      case 'cleared':
        return 'success'
      case 'bounced':
        return 'destructive'
      case 'cancelled':
        return 'outline'
      case 'issued':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: ChequeStatus) => {
    const labels: Record<ChequeStatus, string> = {
      pending: 'Pending',
      deposited: 'Deposited',
      cleared: 'Cleared',
      bounced: 'Bounced',
      cancelled: 'Cancelled',
      issued: 'Issued',
    }
    return labels[status] || status
  }

  const renderReference = (cheque: Cheque) => {
    if (cheque.party?.name) return cheque.party.name
    if (cheque.dueCollect?.purpose) return cheque.dueCollect.purpose
    if (cheque.note) return cheque.note
    return '—'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
          <p className="text-muted-foreground">Track received and issued cheques</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>Add Cheque</Button>
        </div>
      </header>

      {isOffline && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          You are currently offline. Showing cached cheques (if available).
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 max-w-3xl">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cheques</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCheques.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">All cheque records</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totals.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting deposit/clear</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleared</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.cleared}</div>
            <p className="mt-1 text-xs text-muted-foreground">Successfully cleared</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cheques..."
            className="h-10 border border-input bg-background pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ChequeStatus | 'all')}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : getStatusLabel(status as ChequeStatus)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ChequeType | 'all')}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>{type === 'all' ? 'All Types' : type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
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

      {/* Cheques Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <FileText className="h-6 w-6 mr-2" /> Loading cheques...
          </div>
        ) : filteredCheques.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p>No cheques found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cheque #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party / Purpose</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCheques.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {c.cheque_number}
                    {c.local_only && (
                      <span className="ml-2 text-xs text-muted-foreground">(queued)</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{c.type}</TableCell>
                  <TableCell>{renderReference(c)}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(c.amount || 0)}</TableCell>
                  <TableCell>{c.issue_date ? format(parseISO(c.issue_date), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>{c.due_date ? format(parseISO(c.due_date), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(c.status)}>{getStatusLabel(c.status)}</Badge>
                  </TableCell>
                  <TableCell>{c.bank_name || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredCheques.length)} of {filteredCheques.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ChequeFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={() => refetch()}
        onQueued={(cheque) => setQueuedCheques((prev) => [cheque, ...prev])}
      />
    </div>
  )
}
