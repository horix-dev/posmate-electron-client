import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form'
import { categoriesService } from '@/api/services/categories.service'
import type { Category } from '@/types/api.types'

const categorySchema = z.object({
    categoryName: z.string().min(1, 'Category name is required'),
    icon: z.any().optional(),
    status: z.boolean().default(true),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editData?: Category | null
    onSuccess: () => void
}

export function CategoryDialog({
    open,
    onOpenChange,
    editData,
    onSuccess,
}: CategoryDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            categoryName: '',
            status: true,
        },
    })

    useEffect(() => {
        if (open) {
            if (editData) {
                form.reset({
                    categoryName: editData.categoryName,
                    status: editData.status === 1,
                })
            } else {
                form.reset({
                    categoryName: '',
                    status: true,
                })
            }
        }
    }, [open, editData, form])

    const onSubmit = async (values: CategoryFormValues) => {
        setIsSubmitting(true)
        try {
            const payload = {
                ...values,
                icon: values.icon?.[0],
            }

            if (editData) {
                // Update category without status
                const updatePayload = { ...payload }
                delete (updatePayload as Partial<CategoryFormValues>).status
                await categoriesService.update(editData.id, updatePayload)
                
                // Update status separately if it changed
                if (editData.status !== (values.status ? 1 : 0)) {
                    await categoriesService.updateStatus(editData.id, values.status)
                }
                toast.success('Category updated successfully')
            } else {
                await categoriesService.create(payload)
                toast.success('Category created successfully')
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(editData ? 'Failed to update category' : 'Failed to create category')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editData ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="categoryName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Electronics" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                className="cursor-pointer"
                                                onChange={(e) => field.onChange(e.target.files)}
                                            />
                                            <Upload className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </FormControl>
                                    <FormDescription>Optional category icon.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Active Status</FormLabel>
                                        <FormDescription>
                                            Enable or disable this category.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editData ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
