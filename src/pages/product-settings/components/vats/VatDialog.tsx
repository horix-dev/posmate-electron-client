import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { vatsService } from '@/api/services/inventory.service'
import { toast } from 'sonner'
import type { Vat } from '@/types/api.types'

interface VatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: Vat | null
  onSuccess: () => void
}

interface VatFormData {
  name: string
  rate?: number
}

export function VatDialog({ open, onOpenChange, editData, onSuccess }: VatDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VatFormData>()

  useEffect(() => {
    if (open && editData) {
      reset({
        name: editData.name,
        rate: editData.rate,
      })
    } else if (open) {
      reset({
        name: '',
        rate: undefined,
      })
    }
  }, [open, editData, reset])

  const onSubmit = async (data: VatFormData) => {
    try {
      if (editData) {
        await vatsService.update(editData.id, data)
        toast.success('Tax updated successfully')
      } else {
        await vatsService.create(data)
        toast.success('Tax created successfully')
      }
      onSuccess()
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error(error)
      const errorMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: unknown }).response === 'object' &&
        (error as { response?: { data?: unknown } }).response !== null &&
        'data' in (error as { response?: { data?: unknown } }).response &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data === 'object' &&
        (error as { response?: { data?: { message?: unknown } } }).response?.data !== null &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined

      const fallback = `Failed to ${editData ? 'update' : 'create'} tax`
      toast.error(errorMessage || fallback)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Tax' : 'Add Tax'}</DialogTitle>
          <DialogDescription>
            {editData ? 'Update tax information below.' : 'Enter tax details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Tax Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Standard VAT"
                {...register('name', {
                  required: 'Tax name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rate">Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                step="0.01"
                placeholder="e.g., 15"
                {...register('rate', {
                  min: { value: 0, message: 'Rate cannot be negative' },
                })}
              />
              {errors.rate && <p className="text-sm text-red-500">{errors.rate.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                reset()
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
