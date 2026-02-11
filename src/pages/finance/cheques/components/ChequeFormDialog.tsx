import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import chequesService from '@/api/services/cheques.service'
import type { Cheque, ChequeManualEntryRequest } from '@/types/api.types'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createAppError } from '@/lib/errors'
import { storage } from '@/lib/storage'
import { generateIdempotencyKey } from '@/lib/db/types/enhancedSync.types'
import { API_ENDPOINTS } from '@/api/endpoints'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (cheque: Cheque) => void
  onQueued?: (cheque: Cheque) => void
}

interface FormValues {
  cheque_number: string
  amount: number
  issue_date: string
  due_date?: string
  bank_name: string
  account_holder: string
  purpose: string
  note?: string
}

export default function ChequeFormDialog({ open, onClose, onSaved, onQueued }: Props) {
  const { isOnline } = useOnlineStatus()

  const form = useForm<FormValues>({
    defaultValues: {
      cheque_number: '',
      amount: 0,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: '',
      bank_name: '',
      account_holder: '',
      purpose: '',
      note: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        cheque_number: '',
        amount: 0,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: '',
        bank_name: '',
        account_holder: '',
        purpose: '',
        note: '',
      })
    }
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    if (!values.cheque_number?.trim()) return form.setError('cheque_number', { message: 'Cheque number is required' })
    if (!values.amount || values.amount <= 0) return form.setError('amount', { message: 'Amount must be greater than 0' })
    if (!values.issue_date) return form.setError('issue_date', { message: 'Issue date is required' })
    if (!values.bank_name?.trim()) return form.setError('bank_name', { message: 'Bank name is required' })
    if (!values.account_holder?.trim()) return form.setError('account_holder', { message: 'Account holder is required' })
    if (!values.purpose?.trim()) return form.setError('purpose', { message: 'Purpose is required' })

    const payload: ChequeManualEntryRequest = {
      cheque_number: values.cheque_number.trim(),
      amount: Number(values.amount),
      issue_date: values.issue_date,
      due_date: values.due_date || undefined,
      bank_name: values.bank_name.trim(),
      account_holder: values.account_holder.trim(),
      purpose: values.purpose.trim(),
      note: values.note?.trim() || undefined,
    }

    try {
      if (!isOnline) {
        const offlineId = `offline-${Date.now()}`
        await storage.syncQueue.enqueue({
          idempotencyKey: generateIdempotencyKey('cheque', 'CREATE'),
          operation: 'CREATE',
          entity: 'cheque',
          entityId: offlineId,
          data: payload,
          endpoint: API_ENDPOINTS.CHEQUES.MANUAL_ENTRY,
          method: 'POST',
          offlineTimestamp: new Date().toISOString(),
          maxAttempts: 5,
          attempts: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
        })

        const localCheque: Cheque = {
          id: -Date.now(),
          type: 'received',
          cheque_number: payload.cheque_number,
          amount: payload.amount,
          issue_date: payload.issue_date,
          due_date: payload.due_date,
          status: 'pending',
          bank_name: payload.bank_name,
          account_holder: payload.account_holder,
          note: payload.note,
          dueCollect: {
            id: -Date.now(),
            purpose: payload.purpose,
            amount: payload.amount,
            sale_id: null,
            party_id: null,
          },
          local_only: true,
        }

        toast.success('Cheque queued for sync (offline)')
        onQueued?.(localCheque)
        onClose()
        return
      }

      const res = await chequesService.createManualEntry(payload)
      const saved = res?.data as Cheque
      toast.success('Cheque created')
      onSaved(saved)
      onClose()
    } catch (err) {
      console.error(err)
      const appError = createAppError(err, 'Failed to create cheque')
      toast.error(appError.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Cheque Entry</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit as any)}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <FormField control={form.control as any} name="cheque_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Cheque Number</FormLabel>
                <FormControl>
                  <Input placeholder="CHQ-001234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" value={field.value ?? 0} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="issue_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="due_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="bank_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="State Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="account_holder" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <FormField control={form.control as any} name="purpose" render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Input placeholder="Advance payment for future orders" {...field} />
                  </FormControl>
                  <FormDescription>Required for manual entry cheques</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <FormField control={form.control as any} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Customer provided advance payment" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Submit Cheque</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
