import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { shelvesService } from '@/api/services/shelves.service'
import type { Shelf } from '@/types/api.types'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

interface ShelvesTableProps {
  searchQuery: string
  refreshTrigger: number
  onEdit: (shelf: Shelf) => void
}

export function ShelvesTable({ searchQuery, refreshTrigger, onEdit }: ShelvesTableProps) {
  const [data, setData] = useState<Shelf[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ open: false, id: null, name: '' })
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const normalizePaginated = useCallback(<T,>(resp: unknown, pageSize: number) => {
    const getNum = (v: unknown, fallback: number) => (typeof v === 'number' ? v : Number(v)) || fallback
    let items: T[] = []
    let total = 0
    let lastPage = 1
    if (!resp || typeof resp !== 'object') return { items, total, lastPage }
    const outer: Record<string, unknown> = resp as Record<string, unknown>
    const payload = (outer && 'data' in outer ? (outer as any).data : outer) as Record<string, unknown>
    if (payload && typeof payload === 'object') {
      if ('data' in payload && payload.data && typeof payload.data === 'object') {
        const inner = payload.data as Record<string, unknown>
        if ('data' in inner && Array.isArray((inner as any).data)) {
          items = (inner as any).data as T[]
          total = getNum((inner as any).total, items.length)
          lastPage = getNum((inner as any).last_page, Math.ceil(total / pageSize))
          return { items, total, lastPage }
        }
      }
      if ('data' in payload && Array.isArray((payload as any).data)) {
        items = (payload as any).data as T[]
        total = getNum((payload as any).total, items.length)
        lastPage = getNum((payload as any).last_page, Math.ceil(total / pageSize))
        return { items, total, lastPage }
      }
      if (Array.isArray(payload)) {
        items = payload as unknown as T[]
        total = items.length
        lastPage = Math.ceil(total / pageSize)
        return { items, total, lastPage }
      }
    }
    return { items, total, lastPage }
  }, [])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = { page: currentPage, per_page: perPage }
      const r = searchQuery?.trim()
        ? await shelvesService.filter({ search: searchQuery.trim(), ...params })
        : await shelvesService.getAll(params)
      const { items, total, lastPage } = normalizePaginated<Shelf>(r, perPage)
      setData(items)
      setTotal(total)
      setLastPage(lastPage)
    } catch (e) {
      console.warn('[ShelvesTable] fetch error', e)
      setData([])
      setTotal(0)
      setLastPage(1)
      toast.error('Failed to load shelves')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, perPage, searchQuery, normalizePaginated])

  useEffect(() => { setCurrentPage(1) }, [searchQuery, perPage])
  useEffect(() => { fetchData() }, [fetchData, refreshTrigger])

  const handleDeleteClick = (id: number, name: string) => setDeleteDialog({ open: true, id, name })
  const confirmDelete = async () => {
    if (!deleteDialog.id) return
    try {
      await shelvesService.delete(deleteDialog.id)
      toast.success('Shelf deleted')
      setDeleteDialog({ open: false, id: null, name: '' })
      fetchData()
    } catch {
      toast.error('Failed to delete shelf')
    }
  }

  const handleStatusToggle = async (shelf: Shelf) => {
    try {
      const newStatus = (shelf.status ?? 1) === 1 ? false : true
      setData(prev => prev.map(r => r.id === shelf.id ? { ...r, status: newStatus ? 1 : 0 } : r))
      await shelvesService.updateStatus(shelf.id, newStatus)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
      fetchData()
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleItems = Array.isArray(data) && data.length > perPage ? data.slice((currentPage - 1) * perPage, currentPage * perPage) : (Array.isArray(data) ? data : [])
      setSelectedIds(visibleItems.map(i => i.id))
    } else setSelectedIds([])
  }
  const handleSelectOne = (checked: boolean, id: number) => setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id))

  if (isLoading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>

  const startEntry = (currentPage - 1) * perPage + 1
  const endEntry = Math.min(currentPage * perPage, total)
  const displayData = Array.isArray(data) ? data : []

  return (
    <div className="space-y-4">
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
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox checked={displayData.length > 0 && displayData.every(item => selectedIds.includes(item.id))} onCheckedChange={handleSelectAll} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">No shelves found.</TableCell>
              </TableRow>
            ) : (
              displayData.map((shelf) => (
                <TableRow key={shelf.id}>
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(shelf.id)} onCheckedChange={(checked) => handleSelectOne(!!checked, shelf.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{shelf.name}</TableCell>
                  <TableCell>
                    <Switch checked={(shelf.status ?? 1) === 1} onCheckedChange={() => handleStatusToggle(shelf)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(shelf)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(shelf.id, shelf.name)}>
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

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null, name: '' })}
        onConfirm={confirmDelete}
        itemName={deleteDialog.name}
        title="Delete Shelf"
        description="This action cannot be undone. This will permanently delete the shelf from the system."
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={async () => {
          try {
            await shelvesService.deleteMultiple(selectedIds)
            toast.success('Shelves deleted')
            setSelectedIds([])
            setBulkDeleteOpen(false)
            fetchData()
          } catch {
            toast.error('Failed to delete shelves')
          }
        }}
        itemCount={selectedIds.length}
        itemLabel="shelves"
      />
    </div>
  )
}

export default ShelvesTable
