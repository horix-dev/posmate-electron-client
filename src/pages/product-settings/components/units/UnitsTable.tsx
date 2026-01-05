import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { unitsService } from '@/api/services/units.service'
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
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Unit } from '@/types/api.types'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

interface UnitsTableProps {
  searchQuery: string
  refreshTrigger: number
  onEdit: (unit: Unit) => void
}

export function UnitsTable({ searchQuery, refreshTrigger, onEdit }: UnitsTableProps) {
  const [data, setData] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    id: number | null
    name: string
  }>({ open: false, id: null, name: '' })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Normalize paginated response
  const normalizePaginated = useCallback(<T,>(resp: unknown, pageSize: number) => {
    const getNum = (v: unknown, fallback: number) =>
      (typeof v === 'number' ? v : Number(v)) || fallback
    let items: T[] = []
    let total = 0
    let lastPage = 1

    if (!resp || typeof resp !== 'object') return { items, total, lastPage }

    const outer: Record<string, unknown> = resp as Record<string, unknown>
    // If this is an AxiosResponse, payload is in outer.data; if already payload, also in .data
    const payload = (outer && 'data' in outer ? outer.data : outer) as Record<string, unknown>

    if (payload && typeof payload === 'object') {
      // Case A: payload.data is an object with data array (Laravel paginator)
      if ('data' in payload && payload.data && typeof payload.data === 'object') {
        const inner = payload.data as Record<string, unknown>
        if ('data' in inner && Array.isArray(inner.data)) {
          items = inner.data as T[]
          total = getNum(typeof inner.total === 'number' ? inner.total : undefined, items.length)
          lastPage = getNum(
            typeof inner.last_page === 'number' ? inner.last_page : undefined,
            Math.ceil(total / pageSize)
          )
          return { items, total, lastPage }
        }
      }

      // Case B: payload.data is directly the array
      if ('data' in payload && Array.isArray(payload.data)) {
        items = payload.data as T[]
        total = getNum(payload.total as unknown, items.length)
        lastPage = getNum(
          payload.last_page as unknown,
          Math.ceil(total / pageSize)
        )
        return { items, total, lastPage }
      }

      // Case C: payload is directly the array
      if (Array.isArray(payload)) {
        items = payload as T[]
        total = items.length
        lastPage = Math.ceil(total / pageSize)
        return { items, total, lastPage }
      }
    }

    return { items, total, lastPage }
  }, [])

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: { page?: number; per_page?: number; search?: string | undefined } = { 
        page: currentPage, 
        per_page: perPage, 
        search: searchQuery?.trim() 
      }
      const r = await unitsService.getAll(params)

      const { items, total, lastPage } = normalizePaginated<Unit>(r, perPage)
      console.log('[UnitsTable] Received data:', items.slice(0, 2))
      setData(items)
      setTotal(total)
      setLastPage(lastPage)

      // Show offline indicator if data came from cache
      if (r.message === 'Data loaded from cache') {
        toast.info('Working offline with cached data', { duration: 3000 })
      }
    } catch (e) {
      console.error('[UnitsTable] fetch error', e)
      toast.error('Failed to load units. Please check your connection.')
      // Keep existing data if available, don't clear it
      if (data.length === 0) {
        setData([])
        setTotal(0)
        setLastPage(1)
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, perPage, searchQuery, normalizePaginated, data.length])

  useEffect(() => {
    // reset to first page on search/perPage change
    setCurrentPage(1)
  }, [searchQuery, perPage])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshTrigger])

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id) return
    try {
      await unitsService.delete(deleteDialog.id)
      toast.success('Unit deleted successfully')
      setDeleteDialog({ open: false, id: null, name: '' })
      fetchData()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete unit')
    }
  }

  const handleStatusToggle = async (unit: Unit) => {
    try {
      const newStatus = (unit.status ?? 1) === 1 ? 0 : 1
      await unitsService.updateStatus(unit.id, newStatus === 1)
      toast.success('Status updated successfully')
      fetchData()
    } catch (error) {
      console.error('Status toggle error:', error)
      toast.error('Failed to update status')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((item: Unit) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean, id: number) => {
    if (checked) setSelectedIds((prev) => [...prev, id])
    else setSelectedIds((prev) => prev.filter((i) => i !== id))
  }

  const handleBulkDeleteClick = () => {
    setBulkDeleteOpen(true)
  }

  const confirmBulkDelete = async () => {
    try {
      await unitsService.deleteMultiple(selectedIds)
      toast.success('Units deleted successfully')
      setSelectedIds([])
      setBulkDeleteOpen(false)
      fetchData()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete units')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const startEntry = total > 0 ? (currentPage - 1) * perPage + 1 : 0
  const endEntry = Math.min(currentPage * perPage, total)
  const displayData = data

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
          <Button variant="destructive" size="sm" onClick={handleBulkDeleteClick}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedIds.length > 0 && selectedIds.length === displayData.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No units found
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((unit: Unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.includes(unit.id)}
                      onCheckedChange={(checked: boolean) => handleSelectOne(checked, unit.id)}
                    />
                  </TableCell>
                  <TableCell>{unit.unitName}</TableCell>
                  <TableCell>
                    <Switch
                      checked={(unit.status ?? 1) === 1}
                      onCheckedChange={() => handleStatusToggle(unit)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(unit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteClick(unit.id, unit.unitName)}
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
          Showing {startEntry} to {endEntry} of {total} entries
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
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
              let pageNum
              if (lastPage <= 5) pageNum = i + 1
              else if (currentPage <= 3) pageNum = i + 1
              else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i
              else pageNum = currentPage - 2 + i
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
            onClick={() => setCurrentPage((prev) => Math.min(lastPage, prev + 1))}
            disabled={currentPage === lastPage}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        itemName={deleteDialog.name}
        title="Delete Unit"
        description="This action cannot be undone. This will permanently delete the unit from the system."
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        itemCount={selectedIds.length}
        itemLabel="units"
      />
    </div>
  )
}
