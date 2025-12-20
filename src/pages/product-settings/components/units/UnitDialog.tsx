import { useState, useEffect } from 'react'
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
import { unitsService } from '@/api/services/units.service'
import type { Unit } from '@/types/api.types'

const unitSchema = z.object({
  unitName: z.string().min(1, 'Unit name is required'),
  status: z.boolean().default(true),
})

type UnitFormValues = z.infer<typeof unitSchema>

interface UnitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: Unit | null
  onSuccess: () => void
}

export function UnitDialog({ open, onOpenChange, editData, onSuccess }: UnitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: { unitName: '', status: true },
  })

  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({ unitName: editData.unitName, status: (editData.status ?? 1) === 1 })
      } else {
        form.reset({ unitName: '', status: true })
      }
    }
  }, [open, editData, form])

  const onSubmit = async (values: UnitFormValues) => {
    setIsSubmitting(true)
    try {
      if (editData) {
        // Update without status, then status separately if changed
        const payload: Partial<UnitFormValues> = { unitName: values.unitName }
        await unitsService.update(editData.id, payload)
        if ((editData.status ?? 1) !== (values.status ? 1 : 0)) {
          await unitsService.updateStatus(editData.id, values.status)
        }
        toast.success('Unit updated successfully')
      } else {
        await unitsService.create(values)
        toast.success('Unit created successfully')
      }
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error(editData ? 'Failed to update unit' : 'Failed to create unit')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="unitName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., KG, PCS" {...field} />
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
                    <FormDescription>Enable or disable this unit.</FormDescription>
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
