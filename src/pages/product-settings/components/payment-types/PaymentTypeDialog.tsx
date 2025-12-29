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
import { paymentTypesService } from '@/api/services/inventory.service'
import { toast } from 'sonner'
import type { PaymentType } from '@/types/api.types'

interface PaymentTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: PaymentType | null
  onSuccess: () => void
}

interface PaymentTypeFormData {
  name: string
}

export function PaymentTypeDialog({ open, onOpenChange, editData, onSuccess }: PaymentTypeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentTypeFormData>()

  useEffect(() => {
    if (open && editData) {
      reset({
        name: editData.name,
      })
    } else if (open) {
      reset({
        name: '',
      })
    }
  }, [open, editData, reset])

  const onSubmit = async (data: PaymentTypeFormData) => {
    try {
      if (editData) {
        await paymentTypesService.update(editData.id, data)
        toast.success('Payment type updated successfully')
      } else {
        await paymentTypesService.create(data)
        toast.success('Payment type created successfully')
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

      const fallback = `Failed to ${editData ? 'update' : 'create'} payment type`
      toast.error(errorMessage || fallback)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Payment Type' : 'Add Payment Type'}</DialogTitle>
          <DialogDescription>
            {editData
              ? 'Update payment type information below.'
              : 'Enter payment type details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Payment Type Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Cash, Card, Cheque"
                {...register('name', {
                  required: 'Payment type name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
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
