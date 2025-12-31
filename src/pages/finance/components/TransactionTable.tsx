import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useCurrency } from '@/hooks'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Trash2, Edit2, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { NormalizedTransaction } from '../utils/normalization'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

interface TransactionTableProps {
    data: NormalizedTransaction[]
    isLoading: boolean
    type: 'expense' | 'income'
    onDelete: (id: number) => void
    onEdit?: (item: NormalizedTransaction) => void
    onSelectionChange?: (ids: number[]) => void
    onBulkDelete?: (ids: number[]) => void
}

export function TransactionTable({
    data,
    isLoading,
    type,
    onDelete,
    onEdit,
    onSelectionChange,
    onBulkDelete,
}: TransactionTableProps) {
    const { format: formatCurrency } = useCurrency()
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [page, setPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)

    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; title: string }>(
        { open: false, id: null, title: '' }
    )
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

    // Handle Selection
    const totalPages = Math.ceil(data.length / rowsPerPage)
    const startIndex = (page - 1) * rowsPerPage
    const paginatedData = data.slice(startIndex, startIndex + rowsPerPage)

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = paginatedData.map(d => d.id)
            setSelectedIds(allIds)
            onSelectionChange?.(allIds)
        } else {
            setSelectedIds([])
            onSelectionChange?.([])
        }
    }

    const toggleSelect = (id: number, checked: boolean) => {
        let newSelected = []
        if (checked) {
            newSelected = [...selectedIds, id]
        } else {
            newSelected = selectedIds.filter(sid => sid !== id)
        }
        setSelectedIds(newSelected)
        onSelectionChange?.(newSelected)
    }

    useEffect(() => {
        setPage(1)
        setSelectedIds([])
    }, [data])

    return (
        <div className="space-y-4">
            {/* Controls */}
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

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                            {selectedIds.length} record(s) selected
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setBulkDeleteOpen(true)}
                            disabled={!onBulkDelete}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected
                        </Button>
                    </div>
                )}
            </div>

            <div className="rounded-md border bg-card">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                        <FileText className="h-10 w-10 mb-2 opacity-50" />
                        <p>No {type} records found</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">
                                    <Checkbox
                                        checked={paginatedData.length > 0 && paginatedData.every(d => selectedIds.includes(d.id))}
                                        onCheckedChange={(checked) => toggleSelectAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Description / Ref</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.map((item) => {
                                const date = item.date ? format(new Date(item.date), 'MMM d, yyyy') : '-'

                                return (
                                    <TableRow key={item.id} data-state={selectedIds.includes(item.id) && "selected"} className="h-16 hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={(checked) => toggleSelect(item.id, !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground whitespace-nowrap px-4">{date}</TableCell>
                                        <TableCell className="max-w-[300px] px-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="font-semibold text-base truncate" title={item.title}>
                                                    {item.title}
                                                </span>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {item.referenceNo && (
                                                        <span className="text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-secondary">
                                                            Ref: {item.referenceNo}
                                                        </span>
                                                    )}
                                                    {item.note && (
                                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.note}>
                                                            {item.note}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal opacity-90 whitespace-nowrap">
                                                {item.categoryName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">{item.paymentName}</TableCell>
                                        <TableCell className="text-right font-bold font-mono whitespace-nowrap">
                                            <span className={type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                                {type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {onEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => onEdit(item)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteDialog({ open: true, id: item.id, title: item.title })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-2">
                <div className="text-sm text-muted-foreground">
                    Showing {data.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + rowsPerPage, data.length)} of {data.length} entries
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

            <DeleteConfirmDialog
                isOpen={deleteDialog.open}
                onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
                itemName={deleteDialog.title}
                onConfirm={() => {
                    if (deleteDialog.id) {
                        onDelete(deleteDialog.id)
                    }
                    setDeleteDialog({ open: false, id: null, title: '' })
                }}
            />

            <BulkDeleteConfirmDialog
                isOpen={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                itemCount={selectedIds.length}
                itemLabel="records"
                onConfirm={() => {
                    onBulkDelete?.(selectedIds)
                    setBulkDeleteOpen(false)
                    setSelectedIds([])
                }}
            />
        </div>
    )
}
