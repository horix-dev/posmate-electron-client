import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { expensesService, incomesService } from '@/api/services/expenses.service'

const categorySchema = z.object({
    categoryName: z.string().min(1, 'Category name is required'),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface Category {
    id: number
    categoryName: string
}

interface CategoryManagerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: 'expense' | 'income'
}

export function CategoryManagerDialog({
    open,
    onOpenChange,
    type,
}: CategoryManagerDialogProps) {
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const service = type === 'expense' ? expensesService : incomesService
    const title = type === 'expense' ? 'Expense Categories' : 'Income Categories'

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            categoryName: '',
        },
    })

    const fetchCategories = useCallback(async () => {
        setIsLoading(true)
        try {
            const response = await service.getCategories()
            setCategories(Array.isArray(response) ? response : response.data || [])
        } catch (error) {
            toast.error('Failed to load categories')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [service])

    useEffect(() => {
        if (open) {
            fetchCategories()
            form.reset()
            setEditingId(null)
        }
    }, [open, fetchCategories, form])

    const onSubmit = async (values: CategoryFormValues) => {
        setIsSubmitting(true)
        try {
            if (editingId) {
                await service.updateCategory(editingId, values)
                toast.success('Category updated')
            } else {
                await service.createCategory(values)
                toast.success('Category created')
            }
            form.reset()
            setEditingId(null)
            fetchCategories()
        } catch (error) {
            toast.error('Failed to save category')
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEdit = (category: Category) => {
        setEditingId(category.id)
        form.setValue('categoryName', category.categoryName)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this category?')) return

        try {
            await service.deleteCategory(id)
            toast.success('Category deleted')
            fetchCategories()
        } catch (error) {
            toast.error('Failed to delete category')
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-4 items-end">
                            <FormField
                                control={form.control}
                                name="categoryName"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>
                                            {editingId ? 'Edit Category' : 'New Category'}
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter category name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex gap-2 pb-[2px]">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {editingId ? 'Update' : 'Add'}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    </Form>

                    {/* List */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                            No categories found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">
                                                {category.categoryName}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleEdit(category)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDelete(category.id)}
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
                </div>
            </DialogContent>
        </Dialog>
    )
}
