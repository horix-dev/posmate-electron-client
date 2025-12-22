import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { unitsService } from '@/api/services/units.service'
import type { Unit } from '@/types/api.types'
import { toast } from 'sonner'
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

  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)

  // Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: '' })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      let result
      if (searchQuery) {
        result = await unitsService.filter({ search: searchQuery, page: currentPage, per_page: perPage })
      } else {
        result = await unitsService.getAll({ page: currentPage, per_page: perPage })
      }

      let items: Unit[] = []
      let responseTotal = 0
      let responseLastPage = 1

      const normalizePaginated = <T,>(resp: unknown, pageSize: number) => {
        if (!resp || typeof resp !== 'object') {
          return { items: [] as T[], total: 0, lastPage: 1 }
        }
        if ('data' in (resp as Record<string, unknown>)) {
          const outer = resp as { data: unknown } & { total?: unknown; last_page?: unknown }
          const d = outer.data
          if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
            const inner = d as { data: unknown; total?: unknown; last_page?: unknown }
            const items = Array.isArray(inner.data) ? (inner.data as T[]) : []
            const totalVal = inner.total
            const lastVal = inner.last_page
            const total = typeof totalVal === 'number' ? totalVal : Number(totalVal) || items.length
            const lastPage = typeof lastVal === 'number' ? lastVal : Number(lastVal) || Math.ceil(total / pageSize)
            return { items, total, lastPage }
          }
          if (Array.isArray(d)) {
            const items = d as T[]
            const totalVal = (outer as { total?: unknown }).total
            const lastVal = (outer as { last_page?: unknown }).last_page
            const total = typeof totalVal === 'number' ? totalVal : Number(totalVal) || items.length
            const lastPage = typeof lastVal === 'number' ? lastVal : Number(lastVal) || Math.ceil(total / pageSize)
            return { items, total, lastPage }
          }
        }
        return { items: [] as T[], total: 0, lastPage: 1 }
      }

      const normalized = normalizePaginated<Unit>(result, perPage)
      items = normalized.items
      responseTotal = normalized.total
      responseLastPage = normalized.lastPage

      setData(items)

      if (responseTotal > 0) {
        setTotal(responseTotal)
        setLastPage(responseLastPage || Math.ceil(responseTotal / perPage))
      } else {
        setTotal(items.length)
        setLastPage(Math.ceil(items.length / perPage))
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load units')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, currentPage, perPage])

  useEffect(() => { fetchData() }, [fetchData, refreshTrigger])
  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  const handleDeleteClick = (id: number, name: string) => { setDeleteDialog({ open: true, id, name }) }
  const confirmDelete = async () => {
    if (!deleteDialog.id) return
    try {
      await unitsService.delete(deleteDialog.id)
      toast.success('Unit deleted')
      setDeleteDialog({ open: false, id: null, name: '' })
      fetchData()
    } catch (error) {
      toast.error('Failed to delete unit')
    }
  }

  const handleStatusToggle = async (unit: Unit) => {
    try {
      const newStatus = (unit.status ?? 1) === 1 ? false : true
      setData(prev => prev.map(u => u.id === unit.id ? { ...u, status: newStatus ? 1 : 0 } : u))
      await unitsService.updateStatus(unit.id, newStatus)
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
      fetchData()
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleItems = Array.isArray(data) && data.length > perPage
        ? data.slice((currentPage - 1) * perPage, currentPage * perPage)
        : (Array.isArray(data) ? data : [])
      setSelectedIds(visibleItems.map(item => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean, id: number) => {
    if (checked) setSelectedIds(prev => [...prev, id])
    else setSelectedIds(prev => prev.filter(i => i !== id))
  }

  const handleBulkDeleteClick = () => { setBulkDeleteOpen(true) }
  const confirmBulkDelete = async () => {
    try {
      await unitsService.deleteMultiple(selectedIds)
      toast.success('Units deleted')
      setSelectedIds([])
      setBulkDeleteOpen(false)
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete units')
    }
  }

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const startEntry = (currentPage - 1) * perPage + 1
  const endEntry = Math.min(currentPage * perPage, total)
  const displayData = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setCurrentPage(1) }}>
            <SelectTrigger className="w-[70px] h-8">
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
                <Checkbox checked={selectedIds.length > 0 && selectedIds.length === displayData.length} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">No units found</TableCell>
              </TableRow>
            ) : (
              displayData.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="w-[50px]">
                    <Checkbox checked={selectedIds.includes(unit.id)} onCheckedChange={(checked: boolean) => handleSelectOne(checked, unit.id)} />
                  </TableCell>
                  <TableCell>{unit.unitName}</TableCell>
                  <TableCell>
                    <Switch checked={(unit.status ?? 1) === 1} onCheckedChange={() => handleStatusToggle(unit)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(unit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(unit.id, unit.unitName)}>
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
        <div className="text-sm text-muted-foreground">Showing {startEntry} to {endEntry} of {total} entries</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
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
                <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                  {pageNum}
                </Button>
              )
            })}
          </div>

          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))} disabled={currentPage === lastPage}>
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
