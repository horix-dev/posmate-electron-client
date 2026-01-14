import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { paymentTypesService } from '@/api/services/inventory.service'
import type { PaymentType } from '@/types/api.types'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

interface PaymentTypesTableProps {
  searchQuery: string
  refreshTrigger: number
  onEdit: (paymentType: PaymentType) => void
}

export function PaymentTypesTable({ searchQuery, refreshTrigger, onEdit }: PaymentTypesTableProps) {
  const [data, setData] = useState<PaymentType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    id: number | null
    name: string
  }>({
    open: false,
    id: null,
    name: '',
  })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await paymentTypesService.getAll()

      let items: PaymentType[] = []
      if (result && result.data) {
        items = Array.isArray(result.data) ? result.data : []
      }

      // Filter by search query if needed
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        items = items.filter((item) => item.name.toLowerCase().includes(q))
      }

      setData(items)
      setSelectedIds([])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load payment types')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshTrigger])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleDelete = async (id: number) => {
    try {
      await paymentTypesService.delete(id)
      toast.success('Payment type deleted successfully')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete payment type')
    }
  }

  const handleToggleStatus = async (id: number, currentStatus: number | undefined) => {
    try {
      const newStatus = currentStatus === 1 ? false : true
      await paymentTypesService.toggleStatus(id, newStatus)
      toast.success(`Payment type ${newStatus ? 'activated' : 'deactivated'} successfully`)
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to update status')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await paymentTypesService.deleteMultiple(selectedIds)
      toast.success(`${selectedIds.length} payment type(s) deleted successfully`)
      setSelectedIds([])
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete payment types')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = paginatedData.map((item) => item.id)
      setSelectedIds(visibleIds)
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean, id: number) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((itemId) => itemId !== id))
    }
  }

  // Pagination
  const totalPages = Math.ceil(data.length / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedData = data.slice(startIndex, startIndex + perPage)
  const startEntry = data.length === 0 ? 0 : startIndex + 1
  const endEntry = Math.min(currentPage * perPage, data.length)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              setPerPage(Number(v))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={perPage} />
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
              {selectedIds.length} payment type(s) selected
            </div>
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((item) => selectedIds.includes(item.id))
                      }
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No payment types found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(checked as boolean, item.id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.is_credit ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                          >
                            Credit
                          </Badge>
                        ) : (
                          <Badge variant="outline">Payment</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.status === 1}
                          onCheckedChange={() => handleToggleStatus(item.id, item.status)}
                          aria-label={`Toggle ${item.name} status`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(item)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeleteDialog({ open: true, id: item.id, name: item.name })
                            }
                            className="text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">
              Showing {startEntry} to {endEntry} of {data.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else {
                    if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        onConfirm={() => {
          if (deleteDialog.id) {
            handleDelete(deleteDialog.id)
          }
          setDeleteDialog({ open: false, id: null, name: '' })
        }}
        itemName={deleteDialog.name}
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={() => {
          handleBulkDelete()
          setBulkDeleteOpen(false)
        }}
        itemCount={selectedIds.length}
        itemLabel="payment types"
      />
    </div>
  )
}
