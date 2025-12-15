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
import { Pencil, Trash2, Power } from 'lucide-react'
import { modelsService } from '@/api/services/models.service'
import type { ProductModel } from '@/types/api.types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ModelsTableProps {
    searchQuery: string
    refreshTrigger: number
    onEdit: (model: ProductModel) => void
}

export function ModelsTable({ searchQuery, refreshTrigger, onEdit }: ModelsTableProps) {
    const [data, setData] = useState<ProductModel[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    const fetchData = useCallback(async () => {
        setIsLoading(true)
        try {
            if (searchQuery) {
                const response = await modelsService.filter({ search: searchQuery })
                setData(response.data || [])
            } else {
                const result = await modelsService.getAll()
                // Handle pagination structure where data might be nested in data.data
                // @ts-expect-error - Handling disparate response structures (pagination vs array)
                const items = result.data?.data && Array.isArray(result.data.data) ? result.data.data : result.data
                setData(Array.isArray(items) ? items : [])
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load models')
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery])

    useEffect(() => {
        fetchData()
    }, [fetchData, refreshTrigger])

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this model?')) return
        try {
            await modelsService.delete(id)
            toast.success('Model deleted')
            fetchData()
        } catch (error) {
            toast.error('Failed to delete model')
        }
    }

    const handleStatusToggle = async (model: ProductModel) => {
        try {
            const newStatus = model.status === 1 ? false : true;
            await modelsService.updateStatus(model.id, newStatus)
            toast.success('Status updated')
            fetchData()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(data.map(item => item.id))
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

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} models?`)) return
        try {
            await modelsService.deleteMultiple(selectedIds)
            toast.success('Models deleted')
            setSelectedIds([])
            fetchData()
        } catch (error) {
            toast.error('Failed to delete models')
        }
    }

    return (
        <div className="space-y-4">
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({selectedIds.length})
                    </Button>
                </div>
            )}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={data.length > 0 && selectedIds.length === data.length}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No models found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((model) => (
                                <TableRow key={model.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(model.id)}
                                            onCheckedChange={(checked) => handleSelectOne(!!checked, model.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{model.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={model.status === 1 ? 'default' : 'secondary'}>
                                            {model.status === 1 ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(model)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleStatusToggle(model)}>
                                                <Power className={`h-4 w-4 ${model.status === 1 ? 'text-green-500' : 'text-red-500'}`} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(model.id)}>
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
        </div>
    )
}
