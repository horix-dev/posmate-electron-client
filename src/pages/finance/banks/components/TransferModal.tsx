import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import banksService from '@/api/services/banks.service'
import type { Bank } from '@/types/api.types'

interface Props {
  open: boolean
  banks: Bank[]
  fromBankId: number | null
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  to_bank_id: number | ''
  amount: number
  description: string
}

export default function TransferModal({ open, banks, fromBankId, onClose, onSuccess }: Props) {
  const form = useForm<FormValues>({
    defaultValues: { to_bank_id: '', amount: 0, description: '' },
  })

  const onSubmit = async (values: FormValues) => {
    if (!fromBankId) return
    if (!values.to_bank_id) return form.setError('to_bank_id', { message: 'Select destination bank' })
    if (!values.amount || values.amount < 0.01) return form.setError('amount', { message: 'Min amount is 0.01' })
    if (!values.description?.trim()) return form.setError('description', { message: 'Description is required' })

    try {
      await banksService.transfer({ from_bank_id: fromBankId, to_bank_id: Number(values.to_bank_id), amount: values.amount, description: values.description })
      toast.success('Transfer successful')
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Transfer failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Between Banks</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label>From Bank</Label>
              <Input disabled value={(banks.find(b => b.id === fromBankId)?.name) || ''} />
            </div>
            <FormField control={form.control} name="to_bank_id" render={({ field }) => (
              <FormItem>
                <FormLabel>To Bank</FormLabel>
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination bank" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {banks.filter(b => b.id !== fromBankId && b.status !== 'closed').map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name} • {b.bank_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Purpose" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Transfer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
