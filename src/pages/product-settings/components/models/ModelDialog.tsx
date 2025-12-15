import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form'
import { modelsService } from '@/api/services/models.service'
import type { ProductModel } from '@/types/api.types'

const modelSchema = z.object({
    name: z.string().min(1, 'Model name is required'),
    status: z.boolean().default(true),
})

type ModelFormValues = z.infer<typeof modelSchema>

interface ModelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editData?: ProductModel | null
    onSuccess: () => void
}

export function ModelDialog({
    open,
    onOpenChange,
    editData,
    onSuccess,
}: ModelDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<ModelFormValues>({
        resolver: zodResolver(modelSchema),
        defaultValues: {
            name: '',
            status: true,
        },
    })

    useEffect(() => {
        if (open) {
            if (editData) {
                form.reset({
                    name: editData.name,
                    status: editData.status === 1,
                })
            } else {
                form.reset({
                    name: '',
                    status: true,
                })
            }
        }
    }, [open, editData, form])

    const onSubmit = async (values: ModelFormValues) => {
        setIsSubmitting(true)
        try {
            if (editData) {
                await modelsService.update(editData.id, values)
                toast.success('Model updated successfully')
            } else {
                await modelsService.create(values)
                toast.success('Model created successfully')
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(editData ? 'Failed to update model' : 'Failed to create model')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editData ? 'Edit Model' : 'Add New Model'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Model Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="iPhone 14" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            Active
                                        </FormLabel>
                                        <FormDescription>
                                            This model will be available for selection.
                                        </FormDescription>
                                    </div>
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
