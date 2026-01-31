import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import banksService from '@/api/services/banks.service'

interface Props {
  open: boolean
  bankId: number | null
  onClose: () => void
  onSuccess: () => void
}

interface FormValues {
  amount: number
  description: string
  reference?: string
}

export default function DepositModal({ open, bankId, onClose, onSuccess }: Props) {
  const form = useForm<FormValues>({
    defaultValues: { amount: 0, description: '', reference: '' },
  })

  const onSubmit = async (values: FormValues) => {
    if (!bankId) return
    if (!values.amount || values.amount < 0.01) return form.setError('amount', { message: 'Min amount is 0.01' })
    if (!values.description?.trim()) return form.setError('description', { message: 'Description is required' })

    try {
      await banksService.deposit(bankId, values)
      toast.success('Deposit successful')
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Deposit failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
            <FormField control={form.control} name="reference" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit">Deposit</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
