import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { shelvesService } from '@/api/services/shelves.service'
import type { Shelf } from '@/types/api.types'

const shelfSchema = z.object({
  name: z.string().min(1, 'Shelf name is required'),
  status: z.boolean().default(true),
})

type ShelfFormValues = z.infer<typeof shelfSchema>

interface ShelfDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: Shelf | null
  onSuccess: () => void
}

export function ShelfDialog({ open, onOpenChange, editData, onSuccess }: ShelfDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<ShelfFormValues>({
    resolver: zodResolver(shelfSchema),
    defaultValues: { name: '', status: true },
  })

  useEffect(() => {
    if (open) {
      if (editData) form.reset({ name: editData.name, status: (editData.status ?? 1) === 1 })
      else form.reset({ name: '', status: true })
    }
  }, [open, editData, form])

  const onSubmit = async (values: ShelfFormValues) => {
    setIsSubmitting(true)
    try {
      if (editData) {
        await shelvesService.update(editData.id, { name: values.name })
        if ((editData.status ?? 1) !== (values.status ? 1 : 0)) await shelvesService.updateStatus(editData.id, values.status)
        toast.success('Shelf updated successfully')
      } else {
        await shelvesService.create(values)
        toast.success('Shelf created successfully')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(editData ? 'Failed to update shelf' : 'Failed to create shelf')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Shelf' : 'Add New Shelf'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shelf Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Shelf 1" {...field} />
                  </FormControl>
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
                    <FormDescription>Enable or disable this shelf.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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

export default ShelfDialog
