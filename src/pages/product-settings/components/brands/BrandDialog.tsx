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
import { Textarea } from '@/components/ui/textarea'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form'
import { brandsService } from '@/api/services/brands.service'
import type { Brand } from '@/types/api.types'

const brandSchema = z.object({
    brandName: z.string().min(1, 'Brand name is required'),
    description: z.string().optional(),
    icon: z.any().optional(),
    status: z.boolean().default(true),
})

type BrandFormValues = z.infer<typeof brandSchema>

interface BrandDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editData?: Brand | null
    onSuccess: () => void
}

export function BrandDialog({
    open,
    onOpenChange,
    editData,
    onSuccess,
}: BrandDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<BrandFormValues>({
        resolver: zodResolver(brandSchema),
        defaultValues: {
            brandName: '',
            description: '',
            status: true,
        },
    })

    useEffect(() => {
        if (open) {
            if (editData) {
                form.reset({
                    brandName: editData.brandName,
                    description: editData.description || '',
                    status: editData.status === 1,
                })
            } else {
                form.reset({
                    brandName: '',
                    description: '',
                    status: true,
                })
            }
        }
    }, [open, editData, form])

    const onSubmit = async (values: BrandFormValues) => {
        setIsSubmitting(true)
        try {
            const payload = {
                ...values,
                icon: values.icon?.[0],
            }

            if (editData) {
                // Update brand without status
                const updatePayload = { ...payload }
                delete (updatePayload as Partial<BrandFormValues>).status
                await brandsService.update(editData.id, updatePayload)
                
                // Update status separately if it changed
                if (editData.status !== (values.status ? 1 : 0)) {
                    await brandsService.updateStatus(editData.id, values.status)
                }
                toast.success('Brand updated successfully')
            } else {
                await brandsService.create(payload)
                toast.success('Brand created successfully')
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(editData ? 'Failed to update brand' : 'Failed to create brand')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editData ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="brandName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Brand Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Apple" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Brand description..." {...field} />
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
                                    <FormDescription>Optional brand icon.</FormDescription>
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
                                            Enable or disable this brand.
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
