import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Bank } from '@/types/api.types'
import banksService from '@/api/services/banks.service'

type Mode = 'create' | 'edit'

interface Props {
  open: boolean
  mode: Mode
  bank?: Bank | null
  onClose: () => void
  onSaved: (bank: Bank) => void
}

interface FormValues {
  name: string
  account_number: string
  account_holder: string
  bank_name: string
  branch_name?: string
  opening_balance: number
  opening_date?: string
  status?: 'active' | 'inactive' | 'closed'
}

export default function BankFormDialog({ open, mode, bank, onClose, onSaved }: Props) {
  const form = useForm<FormValues>({
    defaultValues: {
      name: bank?.name || '',
      account_number: bank?.account_number || '',
      account_holder: bank?.account_holder || '',
      bank_name: bank?.bank_name || '',
      branch_name: ((((bank as unknown) as Record<string, unknown>)?.branch_name || bank?.branch?.name) || '') as string,
      opening_balance: bank?.opening_balance ?? 0,
      opening_date: new Date().toISOString().split('T')[0],
      status: bank?.status || 'active',
    },
  })

  useEffect(() => {
    if (bank && form) {
      const formData: FormValues = {
        name: bank?.name || '',
        account_number: bank?.account_number || '',
        account_holder: bank?.account_holder || '',
        bank_name: bank?.bank_name || '',
        branch_name: (((bank as unknown) as Record<string, unknown>)?.branch_name || bank?.branch?.name || '') as string,
        opening_balance: bank?.opening_balance ?? 0,
        opening_date: new Date().toISOString().split('T')[0],
        status: bank?.status || 'active',
      }
      form.reset(formData)
    }
  }, [bank, form])

  const onSubmit = async (values: FormValues) => {
    // Basic validations
    if (!values.name?.trim()) return form.setError('name', { message: 'Name is required' })
    if (!values.account_number?.trim()) return form.setError('account_number', { message: 'Account number is required' })
    if (!values.account_holder?.trim()) return form.setError('account_holder', { message: 'Account holder is required' })
    if (!values.bank_name?.trim()) return form.setError('bank_name', { message: 'Bank name is required' })
    if (values.opening_balance == null || values.opening_balance < 0) return form.setError('opening_balance', { message: 'Opening balance is required and must be 0 or positive' })

    try {
      const payload: Partial<Bank> = {
        name: values.name,
        account_number: values.account_number,
        account_holder: values.account_holder,
        bank_name: values.bank_name,
        opening_balance: values.opening_balance,
        status: values.status,
      }

      // Add branch_name if provided
      if (values.branch_name?.trim()) {
        (payload as unknown as Record<string, unknown>).branch_name = values.branch_name
      }

      // Always send opening_date (required by backend)
      (payload as unknown as Record<string, unknown>).opening_date = values.opening_date || new Date().toISOString().split('T')[0]

      const res = mode === 'create'
        ? await banksService.create(payload)
        : await banksService.update(bank!.id, payload)

      const saved = res?.data as Bank
      toast.success(mode === 'create' ? 'Bank created' : 'Bank updated')
      onSaved(saved)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error(mode === 'create' ? 'Failed to create bank' : 'Failed to update bank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Bank' : 'Edit Bank'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit as any)}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <FormField control={form.control as any} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Account nickname" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <FormField control={form.control as any} name="account_holder" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Holder</FormLabel>
                <FormControl>
                  <Input placeholder="Account holder name" {...field} />
                </FormControl>
                <FormDescription>Required</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="account_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormDescription>Unique per business</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="bank_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Bank of Example" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="branch_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <FormControl>
                    <Input placeholder="Main Branch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="opening_balance" render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" value={field.value ?? 0} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
                  </FormControl>
                  <FormDescription>Required (0 or more)</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="opening_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Defaults to today</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">{mode === 'create' ? 'Create' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
