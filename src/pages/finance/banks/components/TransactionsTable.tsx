import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Download } from 'lucide-react'
import type { BankTransaction } from '@/types/api.types'
import { useCurrency } from '@/hooks'

interface Props {
  transactions: BankTransaction[]
  isLoading: boolean
  typeFilter: string
  setTypeFilter: (t: string) => void
  fromDate?: string | null
  toDate?: string | null
  setDateRange: (from: string | null, to: string | null) => void
  exportCSV: () => string
}

export default function TransactionsTable({ transactions, isLoading, typeFilter, setTypeFilter, fromDate, toDate, setDateRange, exportCSV }: Props) {
  const { format } = useCurrency()

  const rows = useMemo(() => transactions, [transactions])

  const downloadCSV = () => {
    const csv = exportCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bank-transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">Transactions</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="transfer_in">Transfer In</SelectItem>
              <SelectItem value="transfer_out">Transfer Out</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate ?? ''} onChange={(e) => setDateRange(e.target.value || null, toDate ?? null)} />
          <Input type="date" value={toDate ?? ''} onChange={(e) => setDateRange(fromDate ?? null, e.target.value || null)} />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Balance Before</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={t.type === 'deposit' ? 'success' : t.type === 'withdrawal' ? 'destructive' : 'secondary'}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{format(t.amount ?? 0)}</TableCell>
                  <TableCell>{t.reference || '-'}</TableCell>
                  <TableCell className="text-right">{format(t.balance_before ?? 0)}</TableCell>
                  <TableCell className="text-right">{format(t.balance_after ?? 0)}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={t.description || ''}>{t.description || '-'}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    {isLoading ? 'Loading transactions...' : 'No transactions found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
