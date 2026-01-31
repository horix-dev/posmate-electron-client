import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Landmark, RefreshCw, Search, Banknote, Edit, MoreHorizontal, Trash2, PlusCircle, XCircle, Loader2, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { Bank } from '@/types/api.types'
import banksService from '@/api/services/banks.service'
import BankFormDialog from './components/BankFormDialog'
import DeleteBankDialog from './components/DeleteBankDialog'
import CloseAccountDialog from './components/CloseAccountDialog'
import DepositModal from './components/DepositModal'
import WithdrawModal from './components/WithdrawModal'
import TransferModal from './components/TransferModal'


export default function BanksPage() {
  const [searchParams] = useSearchParams()
  const { format: formatCurrency } = useCurrency()
  const [banks, setBanks] = useState<Bank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'closed' | 'all'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editBank, setEditBank] = useState<Bank | null>(null)
  const [deleteBank, setDeleteBank] = useState<Bank | null>(null)
  const [closeBank, setCloseBank] = useState<Bank | null>(null)
  const [depositBank, setDepositBank] = useState<Bank | null>(null)
  const [withdrawBank, setWithdrawBank] = useState<Bank | null>(null)
  const [transferBank, setTransferBank] = useState<Bank | null>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const fetchBanks = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 1000 }
      const urlStatus = searchParams.get('status') as 'active' | 'inactive' | 'closed' | null
      if (statusFilter !== 'all') params.status = statusFilter
      else if (urlStatus) params.status = urlStatus

      const res = await banksService.getAll(params)
      const list = (res?.data || []) as Bank[]
      setBanks(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load banks')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchParams])

  useEffect(() => {
    fetchBanks()
  }, [fetchBanks])

  const filteredBanks = banks.filter((b) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      (b.account_number || '').toLowerCase().includes(q) ||
      (b.bank_name || '').toLowerCase().includes(q)
    )
  })

  // Pagination
  const totalPages = Math.ceil(filteredBanks.length / rowsPerPage)
  const startIndex = (page - 1) * rowsPerPage
  const paginatedBanks = filteredBanks.slice(startIndex, startIndex + rowsPerPage)

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  const handleDeleted = () => {
    fetchBanks()
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banks</h1>
          <p className="text-muted-foreground">Manage and track your bank accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchBanks()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Bank
          </Button>
        </div>
      </header>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Banks</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBanks.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredBanks.length === 1 ? 'account' : 'accounts'} • Active: {filteredBanks.filter(b => b.status==='active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(filteredBanks.reduce((sum, b) => sum + (b.current_balance || 0), 0))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across all accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search banks..."
            className="h-10 border border-input bg-background pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'closed' | 'all')}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
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

      {/* Banks Table */}
      <div className="rounded-md border bg-card">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading banks...
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-10 w-10 mb-2 opacity-50" />
            <p>No banks found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account #</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Current Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBanks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.account_number}</TableCell>
                  <TableCell>{b.bank_name}</TableCell>
                  <TableCell>{(((b as unknown) as Record<string, unknown>)?.branch_name || b.branch?.name || '-') as React.ReactNode}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(b.current_balance || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === 'active' ? 'success' : b.status === 'inactive' ? 'secondary' : 'destructive'}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDepositBank(b)}>
                          <Banknote className="mr-2 h-4 w-4" /> Deposit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setWithdrawBank(b)}>
                          <Banknote className="mr-2 h-4 w-4 rotate-180" /> Withdraw
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTransferBank(b)}>
                          <Landmark className="mr-2 h-4 w-4" /> Transfer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCloseBank(b)}>
                          <XCircle className="mr-2 h-4 w-4" /> Close Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditBank(b)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteBank(b)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        {!isLoading && filteredBanks.length > 0 && (
          <div className="flex items-center justify-between py-2 px-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredBanks.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredBanks.length)} of {filteredBanks.length} entries
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

      {/* Create bank dialog should render independently */}
      <BankFormDialog open={isCreateOpen} mode="create" onClose={() => setIsCreateOpen(false)} onSaved={() => fetchBanks()} />

      {(editBank || deleteBank || closeBank || depositBank || withdrawBank || transferBank) && (
        <>
          {editBank && (
            <BankFormDialog open={!!editBank} mode="edit" bank={editBank} onClose={() => setEditBank(null)} onSaved={() => fetchBanks()} />
          )}
          {deleteBank && (
            <DeleteBankDialog open={!!deleteBank} bankId={deleteBank.id} bankName={deleteBank.name} onClose={() => setDeleteBank(null)} onDeleted={handleDeleted} />
          )}
          {closeBank && (
            <CloseAccountDialog open={!!closeBank} bankId={closeBank.id} bankName={closeBank.name} onClose={() => setCloseBank(null)} onClosed={() => fetchBanks()} />
          )}
          {depositBank && (
            <DepositModal open={!!depositBank} bankId={depositBank.id} onClose={() => setDepositBank(null)} onSuccess={() => fetchBanks()} />
          )}
          {withdrawBank && (
            <WithdrawModal open={!!withdrawBank} bankId={withdrawBank.id} onClose={() => setWithdrawBank(null)} onSuccess={() => fetchBanks()} />
          )}
          {transferBank && (
            <TransferModal open={!!transferBank} banks={banks} fromBankId={transferBank.id} onClose={() => setTransferBank(null)} onSuccess={() => fetchBanks()} />
          )}
        </>
      )}
    </div>
  )
}
