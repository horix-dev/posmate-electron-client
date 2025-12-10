import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { expensesService, incomesService } from '@/api/services/expenses.service'
import { settingsService } from '@/api/services/settings.service'
import type { Expense, Income } from '@/types/api.types'

const transactionSchema = z.object({
    title: z.string().min(1, 'This field is required'), // Expense For / Income From
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Amount must be a positive number',
    }),
    date: z.string().min(1, 'Date is required'),
    category_id: z.string().min(1, 'Category is required'),
    payment_type_id: z.string().optional(),
    reference_no: z.string().optional(),
    note: z.string().optional(),
})

type TransactionFormValues = z.infer<typeof transactionSchema>

interface AddTransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: 'expense' | 'income'
    editData?: Expense | Income | null
    onSuccess: () => void
}

export function AddTransactionDialog({
    open,
    onOpenChange,
    type,
    editData,
    onSuccess,
}: AddTransactionDialogProps) {
    const [categories, setCategories] = useState<{ id: number; categoryName: string }[]>([])
    const [paymentTypes, setPaymentTypes] = useState<{ id: number; name: string }[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const service = type === 'expense' ? expensesService : incomesService
    const title = editData
        ? `Edit ${type === 'expense' ? 'Expense' : 'Income'}`
        : `Add ${type === 'expense' ? 'Expense' : 'Income'}`

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            title: '',
            amount: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            category_id: '',
            payment_type_id: '',
            reference_no: '',
            note: '',
        },
    })

    // parseDescription removed

    // Fetch dependencies & Handle Edit Data
    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setIsLoading(true)
                try {
                    const [catsResponse, payTypesResponse] = await Promise.all([
                        service.getCategories(),
                        settingsService.getPaymentTypes()
                    ])

                    // @ts-ignore
                    const cats = Array.isArray(catsResponse) ? catsResponse : catsResponse.data || []
                    setCategories(cats)

                    // @ts-ignore
                    const payTypes = Array.isArray(payTypesResponse) ? payTypesResponse : payTypesResponse.data || []
                    setPaymentTypes(payTypes)
                } catch (error) {
                    console.error(error)
                    toast.error('Failed to load form data')
                } finally {
                    setIsLoading(false)
                }
            }

            fetchData()

            if (editData) {
                // Determine fields based on type
                // Note: Backend uses 'expanseFor' (typo with 'a' instead of 'e')
                // @ts-ignore
                const title = editData.expanseFor || editData.expenseFor || editData.incomeFor || editData.expense_for || editData.income_for || editData.description || ''
                // @ts-ignore
                const dateValue = editData.expenseDate || editData.incomeDate || editData.expense_date || editData.income_date || editData.date || editData.created_at || new Date()
                // @ts-ignore
                const categoryId = type === 'expense' ? editData.expense_category_id : editData.income_category_id

                form.reset({
                    title: title,
                    amount: String(editData.amount),
                    date: format(new Date(dateValue), 'yyyy-MM-dd'),
                    category_id: String(categoryId),
                    payment_type_id: editData.payment_type_id ? String(editData.payment_type_id) : '',
                    // @ts-ignore
                    reference_no: editData.referenceNo || editData.reference_no || '',
                    // @ts-ignore
                    note: editData.note || '',
                })
            } else {
                form.reset({
                    title: '',
                    amount: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    category_id: '',
                    payment_type_id: '',
                    reference_no: '',
                    note: '',
                })
            }
        }
    }, [open, editData, form, service, type])

    const onSubmit = async (values: TransactionFormValues) => {
        setIsSubmitting(true)
        try {
            const commonPayload = {
                amount: Number(values.amount),
                payment_type_id: values.payment_type_id ? Number(values.payment_type_id) : undefined,
                referenceNo: values.reference_no,
                note: values.note,
            }

            const payload = type === 'expense'
                ? {
                    ...commonPayload,
                    // Note: Backend uses 'expanseFor' (typo with 'a' instead of 'e')
                    expanseFor: values.title,
                    expenseDate: values.date,
                    expense_category_id: Number(values.category_id),
                }
                : {
                    ...commonPayload,
                    incomeFor: values.title,
                    incomeDate: values.date,
                    income_category_id: Number(values.category_id),
                }

            if (editData) {
                await service.update(editData.id, payload as any)
                toast.success(`${type === 'expense' ? 'Expense' : 'Income'} updated successfully!`)
            } else {
                await service.create(payload as any)
                toast.success(`${type === 'expense' ? 'Expense' : 'Income'} added successfully!`)
            }
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error(`Failed to save ${type === 'expense' ? 'expense' : 'income'}.`)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Title / Expense For */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{type === 'expense' ? 'Expense For' : 'Income From'}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={type === 'expense' ? 'e.g. Office Supplies' : 'e.g. Consulting Service'} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isLoading}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                                        {cat.categoryName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="payment_type_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            disabled={isLoading}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {paymentTypes.length > 0 ? (
                                                    paymentTypes.map((pt) => (
                                                        <SelectItem key={pt.id} value={String(pt.id)}>
                                                            {pt.name}
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="1">Cash (Default)</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="reference_no"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference Number (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Invoice No, Transaction ID, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Note</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any additional details..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editData ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
