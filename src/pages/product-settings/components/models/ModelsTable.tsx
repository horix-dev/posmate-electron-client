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
import { Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { modelsService } from '@/api/services/models.service'
import type { ProductModel } from '@/types/api.types'
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

interface ModelsTableProps {
    searchQuery: string
    refreshTrigger: number
    onEdit: (model: ProductModel) => void
}

export function ModelsTable({ searchQuery, refreshTrigger, onEdit }: ModelsTableProps) {
    const [data, setData] = useState<ProductModel[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [perPage, setPerPage] = useState(10)

    // Delete dialog states
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({
        open: false,
        id: null,
        name: '',
    })
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            let result
            if (searchQuery) {
                result = await modelsService.filter({ search: searchQuery, page: currentPage, per_page: perPage })
            } else {
                result = await modelsService.getAll({ page: currentPage, per_page: perPage })
            }

            // Handle pagination structure
            // API returns: { message, data: { current_page, data: [...], per_page, total, last_page } }
            let items: ProductModel[] = []
            let responseTotal = 0
            let responseLastPage = 0
            const r = result as any

            // Extract items and pagination from the response
            if (r?.data) {
                // Check if data contains pagination metadata (nested structure)
                if (r.data?.data && Array.isArray(r.data.data)) {
                    items = r.data.data
                    responseTotal = r.data.total ? Number(r.data.total) : 0
                    responseLastPage = r.data.last_page ? Number(r.data.last_page) : Math.ceil(responseTotal / perPage)
                } else if (Array.isArray(r.data)) {
                    // Flat array structure
                    items = r.data
                    responseTotal = r.total ? Number(r.total) : items.length
                    responseLastPage = r.last_page ? Number(r.last_page) : Math.ceil(responseTotal / perPage)
                }
            }

            setData(items)

            // Use server-side pagination values if available
            if (responseTotal > 0) {
                setTotal(responseTotal)
                setLastPage(responseLastPage || Math.ceil(responseTotal / perPage))
            } else {
                // Fallback for when metadata is not available
                setTotal(items.length)
                setLastPage(Math.ceil(items.length / perPage))
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load models')
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, currentPage, perPage])

    useEffect(() => {
        fetchData()
    }, [fetchData, refreshTrigger])

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    const handleDeleteClick = (id: number, name: string) => {
        setDeleteDialog({ open: true, id, name })
    }

    const confirmDelete = async () => {
        if (!deleteDialog.id) return
        try {
            await modelsService.delete(deleteDialog.id)
            toast.success('Model deleted successfully')
            fetchData()
        } catch (error) {
            toast.error('Failed to delete model')
        }
    }

    const handleBulkDeleteClick = () => {
        setBulkDeleteOpen(true)
    }

    const confirmBulkDelete = async () => {
        try {
            await modelsService.deleteMultiple(selectedIds)
            toast.success(`${selectedIds.length} models deleted successfully`)
            setSelectedIds([])
            fetchData()
        } catch (error) {
            toast.error('Failed to delete models')
        }
    }

    const handleStatusToggle = async (model: ProductModel) => {
        try {
            const newStatus = model.status === 1 ? false : true;
            // Optimistic update
            setData(prev => prev.map(item => item.id === model.id ? { ...item, status: newStatus ? 1 : 0 } : item))

            await modelsService.updateStatus(model.id, newStatus)
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
        if (checked) {
            setSelectedIds(prev => [...prev, id])
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id))
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
                    <Select
                        value={String(perPage)}
                        onValueChange={(v) => {
                            setPerPage(Number(v))
                            setCurrentPage(1)
                        }}
                    >
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
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteClick}
                    >
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
                                    checked={displayData.length > 0 && displayData.every(item => selectedIds.includes(item.id))}
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
                                    No models found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayData.map((model) => (
                                <TableRow key={model.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(model.id)}
                                            onCheckedChange={(checked) => handleSelectOne(!!checked, model.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{model.name}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={model.status === 1}
                                            onCheckedChange={() => handleStatusToggle(model)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(model)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(model.id, model.name)}>
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
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                            let pageNum;
                            if (lastPage <= 5) {
                                pageNum = i + 1;
                            } else {
                                // Sliding window logic
                                if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i;
                                else pageNum = currentPage - 2 + i;
                            }

                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => setCurrentPage(pageNum)}
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
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
                title="Delete Model"
                description="Are you sure you want to delete this model? This action cannot be undone and will permanently remove all associated data."
                itemName={deleteDialog.name}
                onConfirm={confirmDelete}
            />

            <BulkDeleteConfirmDialog
                isOpen={bulkDeleteOpen}
                onOpenChange={setBulkDeleteOpen}
                itemCount={selectedIds.length}
                itemLabel="models"
                onConfirm={confirmBulkDelete}
            />
        </div>
    )
}
