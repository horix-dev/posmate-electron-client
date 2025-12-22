import { memo, useState, useEffect, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Plus, Trash2, Loader2, Package, CalendarIcon, Search, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
// Select removed - not currently used, can re-add when payment type selector is needed
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { purchasesService, productsService, partiesService } from '@/api/services'
import type { Product, Party } from '@/types/api.types'
import { useBusinessStore } from '@/stores'

// ============================================
// Form Schema
// ============================================

const purchaseProductSchema = z.object({
  product_id: z.number().min(1, 'Product is required'),
  product_name: z.string().optional(), // For display
  variant_id: z.number().optional(),
  batch_no: z.string().optional(),
  quantities: z.number().min(1, 'Quantity must be at least 1'),
  productPurchasePrice: z.number().min(0, 'Cost price must be positive'),
  productSalePrice: z.number().min(0, 'Sale price must be positive'),
  productDealerPrice: z.number().optional(),
  productWholeSalePrice: z.number().optional(),
  profit_percent: z.number().optional(),
  mfg_date: z.string().optional(),
  expire_date: z.string().optional(),
})

const purchaseFormSchema = z.object({
  party_id: z.number().min(1, 'Supplier is required'),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  payment_type_id: z.number().optional(),
  totalAmount: z.number().min(0),
  discountAmount: z.number().min(0).optional(),
  paidAmount: z.number().min(0),
  dueAmount: z.number().min(0).optional(),
  products: z.array(purchaseProductSchema).min(1, 'At least one product is required'),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

// ============================================
// Types
// ============================================

export interface NewPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// ============================================
// Product Search Component
// ============================================

interface ProductSearchProps {
  onSelect: (product: Product) => void
  excludeIds: number[]
}

const ProductSearch = memo(function ProductSearch({ onSelect, excludeIds }: ProductSearchProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      if (!search.trim() && products.length === 0) {
        // Load initial products
        setIsLoading(true)
        try {
          const response = await productsService.getList({ limit: 50 })
          const data = response?.data
          if (Array.isArray(data)) {
            setProducts(data.filter((p) => !excludeIds.includes(p.id)))
          } else if (data && typeof data === 'object' && 'data' in data) {
            const items = (data as Record<string, unknown>).data as Product[]
            setProducts(items.filter((p) => !excludeIds.includes(p.id)))
          }
        } catch (error) {
          console.error('Failed to fetch products:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchProducts()
  }, [excludeIds, products.length, search])

  // Filter products by search
  const filteredProducts = products.filter(
    (p) =>
      !excludeIds.includes(p.id) &&
      (p.productName.toLowerCase().includes(search.toLowerCase()) ||
        p.productCode?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Search className="mr-2 h-4 w-4" />
          Search and add product...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by name or code..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Loading...' : 'No products found.'}</CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.productName}-${product.id}`}
                  onSelect={() => {
                    onSelect(product)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{product.productName}</span>
                    <span className="text-xs text-muted-foreground">
                      Code: {product.productCode || 'N/A'} | Stock: {product.productStock ?? 0}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

// ============================================
// Main Component
// ============================================

export const NewPurchaseDialog = memo(function NewPurchaseDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewPurchaseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Party[]>([])
  // const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const business = useBusinessStore((state) => state.business)
  const currencySymbol = business?.business_currency?.symbol || '$'

  // Form
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      party_id: 0,
      invoiceNumber: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      payment_type_id: undefined,
      totalAmount: 0,
      discountAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      products: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  })

  // Watch for calculations
  const watchProducts = form.watch('products')
  const watchDiscount = form.watch('discountAmount') || 0
  const watchPaid = form.watch('paidAmount') || 0

  // Update form values for submission (but display uses computed values)
  useEffect(() => {
    const subtotal = watchProducts.reduce(
      (sum, p) => sum + (p.quantities || 0) * (p.productPurchasePrice || 0),
      0
    )
    const total = Math.max(0, subtotal - watchDiscount)
    const due = Math.max(0, total - watchPaid)

    form.setValue('totalAmount', total, { shouldValidate: false, shouldDirty: false })
    form.setValue('dueAmount', due, { shouldValidate: false, shouldDirty: false })
  }, [watchProducts, watchDiscount, watchPaid, form])

  // Fetch initial data
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        setIsLoadingData(true)
        try {
          // Fetch suppliers
          const suppliersData = await partiesService.getSuppliers()
          setSuppliers(suppliersData)

          // Fetch products (for variant support)
          const productsResponse = await productsService.getList({ limit: 1000 })
          const productsData = productsResponse?.data
          if (Array.isArray(productsData)) {
            setProducts(productsData)
          } else if (productsData && typeof productsData === 'object' && 'data' in productsData) {
            setProducts((productsData as Record<string, unknown>).data as Product[])
          }

          // Fetch payment types (if available)
          // setPaymentTypes(...)
        } catch (error) {
          console.error('Failed to fetch data:', error)
        } finally {
          setIsLoadingData(false)
        }
      }
      fetchData()

      // Generate invoice number
      const generateInvoice = async () => {
        try {
          const response = await purchasesService.getNextInvoiceNumber()
          if (response.data?.invoice_number) {
            form.setValue('invoiceNumber', response.data.invoice_number)
          }
        } catch {
          // Use default format
          form.setValue('invoiceNumber', `PUR-${Date.now()}`)
        }
      }
      generateInvoice()
    }
  }, [open, form])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  // Add product
  const handleAddProduct = useCallback(
    (product: Product) => {
      // Get default pricing from first stock if available
      const firstStock = product.stocks?.[0]

      append({
        product_id: product.id,
        product_name: product.productName,
        variant_id: undefined,
        batch_no: '',
        quantities: 1,
        productPurchasePrice: firstStock?.productPurchasePrice ?? 0,
        productSalePrice: firstStock?.productSalePrice ?? 0,
        productDealerPrice: firstStock?.productDealerPrice,
        productWholeSalePrice: firstStock?.productWholeSalePrice,
        profit_percent: firstStock?.profit_percent,
        mfg_date: '',
        expire_date: '',
      })
    },
    [append]
  )

  // Submit
  const onSubmit = async (values: PurchaseFormValues) => {
    setIsSubmitting(true)
    try {
      await purchasesService.create({
        party_id: values.party_id,
        invoiceNumber: values.invoiceNumber,
        purchaseDate: values.purchaseDate,
        payment_type_id: values.payment_type_id,
        totalAmount: values.totalAmount,
        discountAmount: values.discountAmount,
        paidAmount: values.paidAmount,
        dueAmount: values.dueAmount,
        products: values.products.map((p) => ({
          product_id: p.product_id,
          variant_id: p.variant_id,
          batch_no: p.batch_no || undefined,
          quantities: p.quantities,
          productPurchasePrice: p.productPurchasePrice,
          productSalePrice: p.productSalePrice,
          productDealerPrice: p.productDealerPrice,
          productWholeSalePrice: p.productWholeSalePrice,
          profit_percent: p.profit_percent,
          mfg_date: p.mfg_date || undefined,
          expire_date: p.expire_date || undefined,
        })),
      })

      toast.success('Purchase created successfully')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create purchase:', error)
      toast.error('Failed to create purchase. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSupplier = suppliers.find((s) => s.id === form.watch('party_id'))
  const excludeProductIds = fields.map((f) => f.product_id)

  // Calculate totals directly from watched values for real-time updates
  const subtotal = watchProducts.reduce(
    (sum, p) => sum + (p.quantities || 0) * (p.productPurchasePrice || 0),
    0
  )
  const totalAmount = Math.max(0, subtotal - watchDiscount)
  const dueAmount = Math.max(0, totalAmount - watchPaid)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            New Purchase
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ScrollArea
              className="flex-1 overflow-y-auto pr-4"
              style={{ maxHeight: 'calc(90vh - 200px)' }}
            >
              <div className="space-y-6 pb-4">
                {/* Header Fields */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Invoice Number */}
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-generated" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Purchase Date */}
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value
                                  ? format(new Date(field.value), 'MMM d, yyyy')
                                  : 'Select date'}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date: Date | undefined) =>
                                field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Supplier */}
                  <FormField
                    control={form.control}
                    name="party_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  'w-full justify-between',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {selectedSupplier?.name || 'Select supplier'}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput placeholder="Search supplier..." />
                              <CommandList>
                                <CommandEmpty>
                                  {isLoadingData ? 'Loading...' : 'No supplier found.'}
                                </CommandEmpty>
                                <CommandGroup>
                                  {suppliers.map((supplier) => (
                                    <CommandItem
                                      key={supplier.id}
                                      value={supplier.name}
                                      onSelect={() => {
                                        field.onChange(supplier.id)
                                        setSupplierOpen(false)
                                      }}
                                    >
                                      {supplier.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Products Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Products</Label>
                    <ProductSearch onSelect={handleAddProduct} excludeIds={excludeProductIds} />
                  </div>

                  {fields.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      <Package className="mx-auto mb-2 h-8 w-8" />
                      <p>No products added yet</p>
                      <p className="text-sm">Use the search above to add products</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id} className="space-y-4 rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">
                                {field.product_name || `Product #${field.product_id}`}
                              </p>
                              {/* Variant Selection for Variable Products */}
                              {(() => {
                                const product = products.find((p) => p.id === field.product_id)
                                if (
                                  product?.product_type === 'variable' &&
                                  product.variants &&
                                  product.variants.length > 0
                                ) {
                                  return (
                                    <FormField
                                      control={form.control}
                                      name={`products.${index}.variant_id`}
                                      render={({ field: variantField }) => (
                                        <FormItem className="mt-2">
                                          <FormLabel className="text-xs">Variant</FormLabel>
                                          <select
                                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            value={variantField.value ?? ''}
                                            onChange={(e) => {
                                              const variantId = e.target.value
                                                ? Number(e.target.value)
                                                : undefined
                                              variantField.onChange(variantId)
                                              // Update prices from selected variant's stock
                                              if (variantId) {
                                                const variant = product.variants?.find(
                                                  (v) => v.id === variantId
                                                )
                                                const variantStock = variant?.stocks?.[0]
                                                if (variantStock) {
                                                  form.setValue(
                                                    `products.${index}.productPurchasePrice`,
                                                    variantStock.productPurchasePrice
                                                  )
                                                  form.setValue(
                                                    `products.${index}.productSalePrice`,
                                                    variantStock.productSalePrice
                                                  )
                                                  form.setValue(
                                                    `products.${index}.productDealerPrice`,
                                                    variantStock.productDealerPrice
                                                  )
                                                  form.setValue(
                                                    `products.${index}.productWholeSalePrice`,
                                                    variantStock.productWholeSalePrice
                                                  )
                                                }
                                              }
                                            }}
                                          >
                                            <option value="">Select variant...</option>
                                            {product.variants?.map((variant) => (
                                              <option key={variant.id} value={variant.id}>
                                                {variant.variant_name} (Stock:{' '}
                                                {variant.stocks?.[0]?.productStock ?? 0})
                                              </option>
                                            ))}
                                          </select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  )
                                }
                                return null
                              })()}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {/* Quantity */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.quantities`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={1}
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Cost Price */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.productPurchasePrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cost Price *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Sale Price */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.productSalePrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sale Price *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Batch Number */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.batch_no`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Batch/Lot No</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Optional" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Batch Details Row */}
                          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            {/* Mfg Date */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.mfg_date`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Mfg Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Expire Date */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.expire_date`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expire Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Dealer Price */}
                            <FormField
                              control={form.control}
                              name={`products.${index}.productDealerPrice`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dealer Price</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      placeholder="Optional"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value ? Number(e.target.value) : undefined
                                        )
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Subtotal (Read-only) */}
                            <div>
                              <Label>Subtotal</Label>
                              <div className="flex h-10 items-center font-medium">
                                {currencySymbol}
                                {(
                                  (form.watch(`products.${index}.quantities`) || 0) *
                                  (form.watch(`products.${index}.productPurchasePrice`) || 0)
                                ).toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Payment Section */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {/* Discount */}
                  <FormField
                    control={form.control}
                    name="discountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Total (Read-only) */}
                  <div>
                    <Label>Total Amount</Label>
                    <div className="flex h-10 items-center text-lg font-bold">
                      {currencySymbol}
                      {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  {/* Paid Amount */}
                  <FormField
                    control={form.control}
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Due (Read-only) */}
                  <div>
                    <Label>Due Amount</Label>
                    <div
                      className={cn(
                        'flex h-10 items-center text-lg font-bold',
                        dueAmount > 0 && 'text-destructive'
                      )}
                    >
                      {currencySymbol}
                      {dueAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || fields.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
})

export default NewPurchaseDialog
