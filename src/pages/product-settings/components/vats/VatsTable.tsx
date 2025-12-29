import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { vatsService } from '@/api/services/inventory.service'
import type { Vat } from '@/types/api.types'
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

interface VatsTableProps {
  searchQuery: string
  refreshTrigger: number
  onEdit: (vat: Vat) => void
}

export function VatsTable({ searchQuery, refreshTrigger, onEdit }: VatsTableProps) {
  const [data, setData] = useState<Vat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>(
    {
      open: false,
      id: null,
      name: '',
    }
  )
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await vatsService.getAll()

      let items: Vat[] = []
      if (result && result.data) {
        items = Array.isArray(result.data) ? result.data : []
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        items = items.filter((item) => {
          const nameMatch = item.name?.toLowerCase().includes(q)
          const rateMatch = `${item.rate ?? ''}`.toLowerCase().includes(q)
          return nameMatch || rateMatch
        })
      }

      setData(items)
      setSelectedIds([])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load tax settings')
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
      await vatsService.delete(id)
      toast.success('Tax deleted successfully')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete tax')
    }
  }

  const handleBulkDelete = async () => {
    try {
      await vatsService.deleteMultiple(selectedIds)
      toast.success(`${selectedIds.length} tax record(s) deleted successfully`)
      setSelectedIds([])
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete tax records')
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

  const totalPages = Math.ceil(data.length / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedData = data.slice(startIndex, startIndex + perPage)
  const startEntry = data.length === 0 ? 0 : startIndex + 1
  const endEntry = Math.min(currentPage * perPage, data.length)

  return (
    <div className="space-y-4">
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
              {selectedIds.length} tax record(s) selected
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
                  <TableHead>Rate (%)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No tax settings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectOne(checked as boolean, item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.rate ?? 0}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDialog({ open: true, id: item.id, name: item.name })}
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
        itemLabel="tax settings"
      />
    </div>
  )
}
