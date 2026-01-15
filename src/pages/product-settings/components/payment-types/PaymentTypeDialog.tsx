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
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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
  is_credit: boolean
  status: boolean
}

export function PaymentTypeDialog({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: PaymentTypeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentTypeFormData>({
    defaultValues: {
      name: '',
      is_credit: false,
      status: true,
    },
  })

  const isCredit = watch('is_credit')
  const status = watch('status')

  useEffect(() => {
    if (open && editData) {
      reset({
        name: editData.name,
        is_credit: editData.is_credit || false,
        status: editData.status === 1 || editData.status === undefined,
      })
    } else if (open) {
      reset({
        name: '',
        is_credit: false,
        status: true,
      })
    }
  }, [open, editData, reset])

  const onSubmit = async (data: PaymentTypeFormData) => {
    try {
      const payload = {
        name: data.name,
        is_credit: data.is_credit,
        status: data.status,
      }

      if (editData) {
        await paymentTypesService.update(editData.id, payload)
        toast.success('Payment type updated successfully')
      } else {
        await paymentTypesService.create(payload)
        toast.success('Payment type created successfully')
      }
      onSuccess()
      onOpenChange(false)
      reset()
    } catch (error) {
      console.error(error)
      const response =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: unknown }).response
          : undefined

      const data =
        typeof response === 'object' && response !== null && 'data' in response
          ? (response as { data?: unknown }).data
          : undefined

      const errorMessage =
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message?: string }).message
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
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_credit"
                  checked={isCredit}
                  onCheckedChange={(checked) => setValue('is_credit', checked as boolean)}
                />
                <Label htmlFor="is_credit" className="cursor-pointer font-normal">
                  Credit/Due Payment Type
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Mark this as a credit payment type (e.g., "Due"). Credit payments require a customer
                to be selected.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status">Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable or disable this payment type
                  </p>
                </div>
                <Switch
                  id="status"
                  checked={status}
                  onCheckedChange={(checked) => setValue('status', checked)}
                />
              </div>
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
