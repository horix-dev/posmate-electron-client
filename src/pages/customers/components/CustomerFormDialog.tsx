import React from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import type { Party } from '@/types/api.types'

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(200),
  contact_person: z.string().max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  zip_code: z.string().max(30).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  tax_number: z.string().max(100).optional().or(z.literal('')),
  payment_terms: z.string().max(50).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

export type CustomerFormValues = z.infer<typeof customerSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Party | Partial<CustomerFormValues> | null
  onSave: (data: CustomerFormValues) => Promise<unknown>
  isSaving?: boolean
}

export function CustomerFormDialog({ open, onOpenChange, initialData, onSave, isSaving }: Props) {
  const init = (initialData as Partial<CustomerFormValues>) ?? {}

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: (initialData as Party)?.name ?? init.name ?? '',
      contact_person: init.contact_person ?? '',
      email: init.email ?? (initialData as Party)?.email ?? '',
      phone: init.phone ?? (initialData as Party)?.phone ?? '',
      address: init.address ?? (initialData as Party)?.address ?? '',
      city: init.city ?? '',
      state: init.state ?? '',
      zip_code: init.zip_code ?? '',
      country: init.country ?? '',
      tax_number: init.tax_number ?? '',
      payment_terms: init.payment_terms ?? '',
      notes: init.notes ?? '',
      is_active: init.is_active ?? true,
    },
  })

  React.useEffect(() => {
    const next = (initialData as Partial<CustomerFormValues>) ?? {}
    form.reset({
      name: (initialData as Party)?.name ?? next.name ?? '',
      contact_person: next.contact_person ?? '',
      email: next.email ?? (initialData as Party)?.email ?? '',
      phone: next.phone ?? (initialData as Party)?.phone ?? '',
      address: next.address ?? (initialData as Party)?.address ?? '',
      city: next.city ?? '',
      state: next.state ?? '',
      zip_code: next.zip_code ?? '',
      country: next.country ?? '',
      tax_number: next.tax_number ?? '',
      payment_terms: next.payment_terms ?? '',
      notes: next.notes ?? '',
      is_active: next.is_active ?? true,
    })
  }, [initialData])

  const submit = form.handleSubmit(async (values) => {
    await onSave(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update customer details' : 'Create a new customer'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="grid gap-4 pt-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.name.message as string}
                </p>
              )}
            </div>

            <div>
              <Label>Contact Person</Label>
              <Input {...form.register('contact_person')} />
            </div>

            <div>
              <Label>Email</Label>
              <Input {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message as string}
                </p>
              )}
            </div>

            <div>
              <Label>Phone</Label>
              <Input {...form.register('phone')} />
            </div>

            <div className="col-span-2">
              <Label>Address</Label>
              <textarea
                {...form.register('address')}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <Label>City</Label>
              <Input {...form.register('city')} />
            </div>

            <div>
              <Label>State/Province</Label>
              <Input {...form.register('state')} />
            </div>

            <div>
              <Label>ZIP/Postal Code</Label>
              <Input {...form.register('zip_code')} />
            </div>

            <div>
              <Label>Country</Label>
              <Input {...form.register('country')} />
            </div>

            <div>
              <Label>Tax / VAT Number</Label>
              <Input {...form.register('tax_number')} />
            </div>

            <div>
              <Label>Payment Terms</Label>
              <Select onValueChange={(val) => form.setValue('payment_terms', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="mb-0">Active</Label>
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(v) => form.setValue('is_active', !!v)}
              />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <textarea
                {...form.register('notes')}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerFormDialog
