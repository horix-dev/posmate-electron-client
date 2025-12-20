import { useCallback, useEffect, useState } from 'react'
import { categoriesService } from '@/api/services/categories.service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CachedImage } from '@/components/common/CachedImage'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Category } from '@/types/api.types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { getImageUrl } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

interface CategoriesTableProps {
  searchQuery: string
  refreshTrigger: number
  onEdit: (category: Category) => void
}

export function CategoriesTable({ searchQuery, refreshTrigger, onEdit }: CategoriesTableProps) {
  const [data, setData] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(10)

  // Delete dialog states
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

  // Normalize possible response shapes safely (supports AxiosResponse and payload)
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
      // Case B: payload.data is already an array
      if ('data' in payload && Array.isArray(payload.data)) {
        items = payload.data as T[]
        total = getNum(
          'total' in payload && typeof payload.total === 'number' ? payload.total : undefined,
          items.length
        )
        lastPage = getNum(
          'last_page' in payload && typeof payload.last_page === 'number'
            ? payload.last_page
            : undefined,
          Math.ceil(total / pageSize)
        )
        return { items, total, lastPage }
      }
      // Case C: payload itself is an array
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
      const params = { page: currentPage, per_page: perPage, search: searchQuery?.trim() }
      const r = await categoriesService.getPaginated(params)

      const { items, total, lastPage } = normalizePaginated<Category>(r, perPage)
      console.log('[CategoriesTable] Received data:', items.slice(0, 2))
      setData(items)
      setTotal(total)
      setLastPage(lastPage)

      // Show offline indicator if data came from cache
      if (r.message === 'Data loaded from cache') {
        toast.info('Working offline with cached data', { duration: 3000 })
      }
    } catch (e) {
      console.error('[CategoriesTable] fetch error', e)
      toast.error('Failed to load categories. Please check your connection.')
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
      await categoriesService.delete(deleteDialog.id)
      toast.success('Category deleted successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  const handleBulkDeleteClick = () => {
    setBulkDeleteOpen(true)
  }

  const confirmBulkDelete = async () => {
    try {
      await categoriesService.deleteMultiple(selectedIds)
      toast.success(`${selectedIds.length} categories deleted successfully`)
      setSelectedIds([])
      fetchData()
    } catch (error) {
      toast.error('Failed to delete categories')
    }
  }

  const handleStatusToggle = async (category: Category) => {
    try {
      const newStatus = category.status === 1 ? false : true
      // Optimistic update
      setData((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, status: newStatus ? 1 : 0 } : c))
      )

      await categoriesService.updateStatus(category.id, newStatus)
      toast.success('Status updated')
    } catch (error) {
      toast.error('Failed to update status')
      fetchData() // Re-fetch to revert changes
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select only visible items or all?
      // Usually "Select All" selects visible page. But here let's select all visible for consistency
      // If data > perPage, we should select currently displayed items?
      // Let's stick to selecting available data in the table view.
      // If we use displayData, we should select those ID's.
      // However, existing logic selects `data.map`.
      const visibleItems =
        Array.isArray(data) && data.length > perPage
          ? data.slice((currentPage - 1) * perPage, currentPage * perPage)
          : Array.isArray(data)
            ? data
            : []
      setSelectedIds(visibleItems.map((item) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (checked: boolean, id: number) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const startEntry = (currentPage - 1) * perPage + 1
  const endEntry = Math.min(currentPage * perPage, total)

  // Data from API is already paginated, no need for client-side slicing
  const displayData = Array.isArray(data) ? data : []

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    displayData.length > 0 &&
                    displayData.every((item) => selectedIds.includes(item.id))
                  }
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
                <TableCell colSpan={4} className="h-24 text-center">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(category.id)}
                      onCheckedChange={(checked) => handleSelectOne(!!checked, category.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {category.icon ? (
                        <CachedImage
                          src={getImageUrl(category.icon) || undefined}
                          alt={category.categoryName}
                          className="h-8 w-8 rounded object-cover"
                          fallback={
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                              {category.categoryName?.charAt(0)?.toUpperCase()}
                            </div>
                          }
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          {category.categoryName?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      {category.categoryName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.status === 1}
                      onCheckedChange={() => handleStatusToggle(category)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDeleteClick(category.id, category.categoryName)}
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
              if (lastPage <= 5) {
                pageNum = i + 1
              } else {
                // Sliding window logic
                if (currentPage <= 3) pageNum = i + 1
                else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i
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
        onOpenChange={(open) => setDeleteDialog({ open, id: null, name: '' })}
        title="Delete Category"
        description="Are you sure you want to delete this category? This action cannot be undone and will permanently remove all associated data."
        itemName={deleteDialog.name}
        onConfirm={confirmDelete}
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        itemCount={selectedIds.length}
        itemLabel="categories"
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}
