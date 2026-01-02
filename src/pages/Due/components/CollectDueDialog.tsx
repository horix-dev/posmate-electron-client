import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from 'lucide-react'
import { duesService, type DueInvoicesResponse, type DueInvoice } from '@/api/services/dues.service'
import { paymentTypesService } from '@/api/services/inventory.service'
import type { Party } from '@/types/api.types'

interface Invoice {
  id: number
  invoiceNumber: string
  dueAmount: number
  paidAmount: number
  totalAmount: number
}

interface PaymentType {
  id: number
  name: string
}

interface CollectDueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  party: Party | null
  onSubmit?: (data: CollectDueFormData) => void
  isLoading?: boolean
}

export interface CollectDueFormData {
  party_id: number
  payment_type_id: number
  paymentDate: string
  payDueAmount: number
  invoiceNumber?: string
}

export function CollectDueDialog({
  open,
  onOpenChange,
  party,
  onSubmit,
  isLoading,
}: CollectDueDialogProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentType, setPaymentType] = useState('1') // Default to Cash
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [isLoadingPaymentTypes, setIsLoadingPaymentTypes] = useState(false)

  // Fetch invoices from API endpoint
  useEffect(() => {
    if (open && party) {
      setIsLoadingInvoices(true)

      duesService
        .getInvoices(party.id)
        .then((response) => {
          // Response structure: { message, data: { party, invoices } }
          const invoiceData: DueInvoicesResponse | undefined = response?.data
          const dues = Array.isArray(invoiceData?.invoices) ? invoiceData?.invoices : []

          const mappedInvoices: Invoice[] = dues.map((due: DueInvoice) => ({
            id: due.id,
            invoiceNumber: due.invoiceNumber ?? due.invoice_number ?? '',
            dueAmount: Number(due.dueAmount ?? due.due_amount ?? 0),
            paidAmount: 0, // Not provided in API response
            totalAmount: Number(due.totalAmount ?? due.total_amount ?? 0),
          }))

          setInvoices(mappedInvoices)
        })
        .catch((error) => {
          console.error('Error fetching invoices:', error)
          toast.error('Failed to load invoices')
          setInvoices([])
        })
        .finally(() => {
          setIsLoadingInvoices(false)
        })

      // Reset form
      setSelectedInvoice(null)
      setPaidAmount(0)
      setPaymentDate(new Date().toISOString().split('T')[0])
      setPaymentType('1')
    }
  }, [open, party])

  // Fetch payment types
  useEffect(() => {
    if (open) {
      setIsLoadingPaymentTypes(true)
      paymentTypesService
        .getAll()
        .then((response) => {
          setPaymentTypes(response.data || [])
          // Set default to first payment type if available
          if (response.data && response.data.length > 0) {
            setPaymentType(response.data[0].id.toString())
          }
        })
        .catch((error) => {
          console.error('Error fetching payment types:', error)
          toast.error('Failed to load payment types')
        })
        .finally(() => {
          setIsLoadingPaymentTypes(false)
        })
    }
  }, [open])

  const totalAmount = selectedInvoice?.totalAmount || 0
  const dueAmount = selectedInvoice?.dueAmount || 0

  const handleReset = () => {
    setSelectedInvoice(null)
    setPaidAmount(0)
    setPaymentDate(new Date().toISOString().split('T')[0])
    setPaymentType('1')
  }

  const handleSave = () => {
    if (!party || !selectedInvoice || !paymentType) {
      toast.error('Please fill all required fields')
      return
    }

    if (paidAmount <= 0) {
      toast.error('Paid amount must be greater than 0')
      return
    }

    if (paidAmount > selectedInvoice.dueAmount) {
      toast.error('Paid amount cannot exceed due amount')
      return
    }

    const formData: CollectDueFormData = {
      party_id: party.id,
      payment_type_id: parseInt(paymentType),
      paymentDate,
      payDueAmount: paidAmount,
      invoiceNumber: selectedInvoice.invoiceNumber,
    }

    onSubmit?.(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Collect Due</DialogTitle>
          <DialogDescription>
            Record a due collection payment for {party?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Invoice */}
          <div className="grid gap-3">
            <Label htmlFor="invoice" className="text-base font-semibold">
              Select Invoice
            </Label>
            <Select
              value={selectedInvoice?.id.toString() || ''}
              onValueChange={(value) => {
                const invoice = invoices.find((inv) => inv.id.toString() === value)
                setSelectedInvoice(invoice || null)
                setPaidAmount(invoice?.dueAmount || 0)
              }}
              disabled={isLoadingInvoices}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select an Invoice" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id.toString()}>
                    {invoice.invoiceNumber} - Due: ${invoice.dueAmount.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="grid gap-3">
              <Label htmlFor="date" className="text-base font-semibold">
                Date
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  id="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-10 pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Payment Type */}
            <div className="grid gap-3">
              <Label htmlFor="payment-type" className="text-base font-semibold">
                Payment Type
              </Label>
              <Select 
                value={paymentType} 
                onValueChange={setPaymentType}
                disabled={isLoadingPaymentTypes}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder={isLoadingPaymentTypes ? "Loading..." : "Select payment type"} />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id.toString()}>
                      {pt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer Name */}
          <div className="grid gap-3">
            <Label htmlFor="customer-name" className="text-base font-semibold">
              Customer Name
            </Label>
            <Input
              id="customer-name"
              value={party?.name || ''}
              readOnly
              className="h-10 bg-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Total Amount */}
            <div className="grid gap-3">
              <Label htmlFor="total-amount" className="text-base font-semibold">
                Total Amount
              </Label>
              <Input
                id="total-amount"
                value={totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'}
                readOnly
                className="h-10 bg-muted"
              />
            </div>

            {/* Due Amount */}
            <div className="grid gap-3">
              <Label htmlFor="due-amount" className="text-base font-semibold">
                Due Amount
              </Label>
              <Input
                id="due-amount"
                value={dueAmount > 0 ? dueAmount.toFixed(2) : '0.00'}
                readOnly
                className="h-10 bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Paid Amount */}
            <div className="grid gap-3">
              <Label htmlFor="paid-amount" className="text-base font-semibold">
                Paid Amount
              </Label>
              <Input
                id="paid-amount"
                type="number"
                min="0"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount paid"
                className="h-10"
                disabled={!selectedInvoice}
              />
            </div>

            {/* Remaining Due */}
            <div className="grid gap-3">
              <Label htmlFor="remaining-due" className="text-base font-semibold">
                Remaining Due
              </Label>
              <Input
                id="remaining-due"
                value={Math.max(0, dueAmount - paidAmount).toFixed(2)}
                readOnly
                className="h-10 bg-muted"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleReset}
              className="border-red-200 text-red-600 hover:bg-red-50 flex-1"
            >
              Reset
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
