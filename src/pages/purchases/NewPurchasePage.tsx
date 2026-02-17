import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Plus,
  Trash2,
  Loader2,
  Package,
  CalendarIcon,
  ChevronsUpDown,
  ArrowLeft,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { cn } from '@/lib/utils'
import { storage } from '@/lib/storage'
import {
  purchasesService,
  productsService,
  partiesService,
  paymentTypesService,
  vatsService,
} from '@/api/services'
import {
  SupplierFormDialog,
  type SupplierFormData,
} from '@/pages/suppliers/components/SupplierFormDialog'
import { VariantBulkEntryDialog, type VariantEntry } from './components/VariantBulkEntryDialog'
import { ProductLookup } from '@/components/shared/ProductLookup'
import { useCurrency } from '@/hooks'
import { calculatePurchaseTotals, buildCreatePurchaseRequest } from './utils/purchaseCalculations'
import type { Product, Party, PaymentType, Vat } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'

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
  vat_id: z.number().optional(),
  vat_amount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  discountAmount: z.number().min(0).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  discount_type: z.enum(['fixed', 'percentage']).optional(),
  shipping_charge: z.number().min(0).optional(),
  paidAmount: z.number().min(0),
  dueAmount: z.number().min(0).optional(),
  products: z.array(purchaseProductSchema).min(1, 'At least one product is required'),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

// ============================================
// Main Component
// ============================================

export function NewPurchasePage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const purchaseId = id ? Number(id) : null
  const isEditMode = Number.isFinite(purchaseId) && purchaseId !== null
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDueConfirmOpen, setIsDueConfirmOpen] = useState(false)
  const [pendingPurchase, setPendingPurchase] = useState<PurchaseFormValues | null>(null)
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false)
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [vats, setVats] = useState<Vat[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  // Bulk Variant Entry State
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [selectedProductForBulk, setSelectedProductForBulk] = useState<Product | null>(null)

  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()

  // Supplier Dialog State
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false)
  const [isSavingSupplier, setIsSavingSupplier] = useState(false)

  // Form
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      party_id: 0,
      invoiceNumber: '',
      purchaseDate: format(new Date(), 'yyyy-MM-dd'),
      payment_type_id: undefined,
      vat_id: undefined,
      vat_amount: 0,
      totalAmount: 0,
      discountAmount: 0,
      discount_percent: 0,
      discount_type: 'fixed',
      shipping_charge: 0,
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
  const watchDiscountType = form.watch('discount_type') || 'fixed'
  const watchDiscountPercent = form.watch('discount_percent') || 0
  const watchShipping = form.watch('shipping_charge') || 0
  const watchVatId = form.watch('vat_id')
  const watchPaid = form.watch('paidAmount') || 0

  // Get selected VAT rate for calculations
  const selectedVat = vats.find((v) => v.id === watchVatId)
  const vatPercent = selectedVat?.rate || 0

  // Update form values for submission (but display uses computed values)
  useEffect(() => {
    const totals = calculatePurchaseTotals(watchProducts, {
      discountAmount: watchDiscount,
      discountPercent: watchDiscountPercent,
      discountType: watchDiscountType,
      vatPercent,
      shippingCharge: watchShipping,
      paidAmount: watchPaid,
    })

    form.setValue('totalAmount', totals.totalAmount, { shouldValidate: false, shouldDirty: false })
    form.setValue('vat_amount', totals.vatAmount, { shouldValidate: false, shouldDirty: false })
    form.setValue('dueAmount', totals.dueAmount, { shouldValidate: false, shouldDirty: false })

    // If discount type is percentage, update the fixed amount
    if (watchDiscountType === 'percentage') {
      form.setValue('discountAmount', totals.discountAmount, {
        shouldValidate: false,
        shouldDirty: false,
      })
    }
  }, [
    watchProducts,
    watchDiscount,
    watchDiscountType,
    watchDiscountPercent,
    watchShipping,
    vatPercent,
    watchPaid,
    form,
  ])

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true)
      try {
        // Fetch suppliers
        const suppliersData = await partiesService.getSuppliers()
        setSuppliers(suppliersData)

        // Fetch VATs
        const vatsResponse = await vatsService.getAll()
        if (vatsResponse.data) {
          setVats(Array.isArray(vatsResponse.data) ? vatsResponse.data : [])
        }

        // Fetch payment types
        const paymentTypesData = await paymentTypesService.getAll()
        const types = Array.isArray(paymentTypesData)
          ? paymentTypesData
          : (paymentTypesData as { data: PaymentType[] }).data || []
        setPaymentTypes(types)

        // Set default payment type to Cash if available
        if (!isEditMode) {
          const cashType = types.find((pt: PaymentType) => pt.name.toLowerCase() === 'cash')
          if (cashType) {
            form.setValue('payment_type_id', cashType.id)
          }
        }

        // Fetch products (for variant support)
        const productsResponse = await productsService.getList({ limit: 1000 })
        const productsData = productsResponse?.data
        if (Array.isArray(productsData)) {
          setProducts(productsData)
        } else if (productsData && typeof productsData === 'object' && 'data' in productsData) {
          setProducts((productsData as Record<string, unknown>).data as Product[])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load initial data')
      } finally {
        setIsLoadingData(false)
      }
    }
    fetchData()

    // Generate invoice number
    if (!isEditMode) {
      const generateInvoice = async () => {
        try {
          const invoiceNumber = await purchasesService.getNextInvoiceNumber()
          if (invoiceNumber) {
            form.setValue('invoiceNumber', invoiceNumber)
          }
        } catch {
          // Use default format
          form.setValue('invoiceNumber', `PUR-${Date.now()}`)
        }
      }
      generateInvoice()
    }
  }, [form, isEditMode])

  useEffect(() => {
    if (!isEditMode || !purchaseId) return

    const loadPurchase = async () => {
      setIsLoadingPurchase(true)
      try {
        const response = await purchasesService.getById(purchaseId)
        const purchase = response.data
        const products = (purchase.details ?? []).map((detail) => ({
          product_id: detail.product_id,
          product_name: detail.product?.productName || detail.product?.product_name,
          variant_id: detail.variant_id ?? undefined,
          batch_no: detail.stock?.batch_no || '',
          quantities: detail.quantities,
          productPurchasePrice: detail.productPurchasePrice,
          productSalePrice: detail.productSalePrice,
          productDealerPrice: detail.productDealerPrice,
          productWholeSalePrice: detail.productWholeSalePrice,
          profit_percent: detail.profit_percent,
          mfg_date: detail.mfg_date || '',
          expire_date: detail.expire_date || '',
        }))

        form.reset({
          party_id: purchase.party?.id ?? 0,
          invoiceNumber: purchase.invoiceNumber ?? '',
          purchaseDate: purchase.purchaseDate ?? format(new Date(), 'yyyy-MM-dd'),
          payment_type_id: purchase.payment_type?.id,
          vat_id: purchase.vat?.id,
          vat_amount: purchase.vat_amount ?? 0,
          totalAmount: purchase.totalAmount ?? 0,
          discountAmount: purchase.discountAmount ?? 0,
          discount_percent: purchase.discount_percent ?? 0,
          discount_type: (purchase.discount_type as 'fixed' | 'percentage') ?? 'fixed',
          shipping_charge: purchase.shipping_charge ?? 0,
          paidAmount: purchase.paidAmount ?? 0,
          dueAmount: purchase.dueAmount ?? 0,
          products,
        })

        if (!purchase.payment_type?.id) {
          const cashType = paymentTypes.find(
            (type: PaymentType) => type.name.toLowerCase() === 'cash'
          )
          if (cashType) {
            form.setValue('payment_type_id', cashType.id)
          }
        }
      } catch (error) {
        console.error('Failed to load purchase:', error)
        toast.error('Failed to load purchase details')
      } finally {
        setIsLoadingPurchase(false)
      }
    }

    loadPurchase()
  }, [form, isEditMode, paymentTypes, purchaseId])

  // Add product
  const handleAddProduct = useCallback(
    (product: Product, variant?: ProductVariant) => {
      // If variable product selected without specific variant, open bulk dialog
      if (!variant && product.product_type === 'variable') {
        setSelectedProductForBulk(product)
        setIsBulkOpen(true)
        return
      }

      // If specific variant selected (from search)
      if (variant) {
        const variantStock = variant.stocks?.[0]

        append({
          product_id: product.id,
          product_name: product.productName,
          variant_id: variant.id,
          batch_no: variantStock?.batch_no || '',
          quantities: 1,
          productPurchasePrice:
            variantStock?.productPurchasePrice ?? product.productPurchasePrice ?? 0,
          productSalePrice: variantStock?.productSalePrice ?? 0,
          productDealerPrice: variantStock?.productDealerPrice,
          productWholeSalePrice: variantStock?.productWholeSalePrice,
          profit_percent: variantStock?.profit_percent,
          mfg_date: '',
          expire_date: '',
        })
        return
      }

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

  const handleBulkAdd = (entries: VariantEntry[]) => {
    if (!selectedProductForBulk) return

    entries.forEach((entry) => {
      append({
        product_id: selectedProductForBulk.id,
        product_name: selectedProductForBulk.productName,
        variant_id: entry.variant_id,
        batch_no: entry.batch_no,
        quantities: entry.quantity,
        productPurchasePrice: entry.purchase_price,
        productSalePrice: entry.sale_price,
        mfg_date: entry.mfg_date,
        expire_date: entry.expire_date,
      })
    })
    setIsBulkOpen(false)
    setSelectedProductForBulk(null)
  }

  const handleCreateSupplier = async (data: SupplierFormData) => {
    setIsSavingSupplier(true)
    try {
      const response = await partiesService.create({
        ...data,
        type: 'Supplier',
        opening_balance: 0,
      })

      const newSupplier = response.data
      setSuppliers((prev) => [...prev, newSupplier])
      form.setValue('party_id', newSupplier.id)
      setIsCreatingSupplier(false)
      toast.success('Supplier created successfully')
    } catch (error) {
      console.error('Failed to create supplier:', error)
      toast.error('Failed to create supplier')
    } finally {
      setIsSavingSupplier(false)
    }
  }

  const createPurchase = async (values: PurchaseFormValues) => {
    setIsSubmitting(true)
    try {
      const payload = buildCreatePurchaseRequest(values)
      if (isEditMode && purchaseId) {
        await purchasesService.update(purchaseId, payload)
      } else {
        await purchasesService.create(payload)
      }

      // Invalidate product cache since stock levels have changed
      try {
        await storage.products.clear()
      } catch (err) {
        console.warn('Failed to clear product cache:', err)
      }

      toast.success(isEditMode ? 'Purchase updated successfully' : 'Purchase created successfully')
      navigate('/purchases')
    } catch (error) {
      console.error('Failed to create purchase:', error)
      toast.error('Failed to create purchase. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit
  const onSubmit = async (values: PurchaseFormValues) => {
    const submitVatPercent = vats.find((vat) => vat.id === values.vat_id)?.rate || 0
    const submitTotals = calculatePurchaseTotals(values.products, {
      discountAmount: values.discountAmount ?? 0,
      discountPercent: values.discount_percent ?? 0,
      discountType: values.discount_type ?? 'fixed',
      vatPercent: submitVatPercent,
      shippingCharge: values.shipping_charge ?? 0,
      paidAmount: values.paidAmount ?? 0,
    })

    if (submitTotals.dueAmount > 0) {
      setPendingPurchase(values)
      setIsDueConfirmOpen(true)
      return
    }

    await createPurchase(values)
  }

  const handleDueConfirm = async () => {
    if (!pendingPurchase) return
    setIsDueConfirmOpen(false)
    await createPurchase(pendingPurchase)
    setPendingPurchase(null)
  }

  const selectedSupplier = suppliers.find((s) => s.id === form.watch('party_id'))
  const excludeProductIds = fields.map((f) => f.product_id)

  // Calculate totals directly from watched values for real-time updates
  const { subtotal, discountAmount, vatAmount, shippingCharge, totalAmount, dueAmount } =
    calculatePurchaseTotals(watchProducts, {
      discountAmount: watchDiscount,
      discountPercent: watchDiscountPercent,
      discountType: watchDiscountType,
      vatPercent,
      shippingCharge: watchShipping,
      paidAmount: watchPaid,
    })
  const pendingTotals = pendingPurchase
    ? calculatePurchaseTotals(pendingPurchase.products, {
        discountAmount: pendingPurchase.discountAmount ?? 0,
        discountPercent: pendingPurchase.discount_percent ?? 0,
        discountType: pendingPurchase.discount_type ?? 'fixed',
        vatPercent: vats.find((vat) => vat.id === pendingPurchase.vat_id)?.rate || 0,
        shippingCharge: pendingPurchase.shipping_charge ?? 0,
        paidAmount: pendingPurchase.paidAmount ?? 0,
      })
    : null

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/purchases')}
            aria-label="Back to purchases"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <Package className="h-7 w-7" />
              {isEditMode ? 'Edit Purchase' : 'New Purchase'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update the purchase details' : 'Create a new purchase order'}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Fields Card */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Purchase Information</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Supplier */}
              <FormField
                control={form.control}
                name="party_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <div className="flex gap-2">
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
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCreatingSupplier(true)}
                        title="Create New Supplier"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Purchase Date */}
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem className="">
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
                            {field.value ? (
                              format(new Date(field.value), 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>
          </div>

          {/* Products Section Card */}
          <div className="rounded-lg border bg-card p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Products</h2>
                <div className="flex gap-2">
                  {fields.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => form.setValue('products', [])}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                  <ProductLookup onSelect={handleAddProduct} excludeIds={excludeProductIds} />
                </div>
              </div>

              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8" />
                  <p>No products added yet</p>
                  <p className="text-sm">Use the search above to add products</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Image</TableHead>
                        <TableHead className="w-[20%]">Product Details</TableHead>
                        <TableHead className="w-[10%]">Batch</TableHead>
                        <TableHead className="w-[12%]">Dates (Exp/Mfg)</TableHead>
                        <TableHead className="w-[10%] text-right">Qty</TableHead>
                        <TableHead className="w-[10%] text-right">Cost</TableHead>
                        <TableHead className="w-[10%] text-right">Sale</TableHead>
                        <TableHead className="w-[10%] text-right">Subtotal</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const product = products.find((p) => p.id === field.product_id)
                        const variant = product?.variants?.find((v) => v.id === field.variant_id)
                        const imageSrc = variant?.image || product?.productPicture

                        return (
                          <TableRow key={field.id} className="border-b align-middle">
                            {/* Image Column */}
                            <TableCell className="align-middle">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={product?.productName}
                                  className="h-10 w-10 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground opacity-50" />
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-sm font-medium">
                                    {field.product_name || `Product #${field.product_id}`}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                    {product?.productCode && (
                                      <span className="font-mono">Code: {product.productCode}</span>
                                    )}
                                    {variant && (
                                      <>
                                        {product?.productCode && <span>•</span>}
                                        <Badge variant="secondary" className="h-5 text-[10px]">
                                          {variant.variant_name || variant.sku}
                                        </Badge>
                                        {variant.sku && (
                                          <span className="font-mono text-[10px]">
                                            SKU: {variant.sku}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    {!variant && product?.product_type && (
                                      <>
                                        {product?.productCode && <span>•</span>}
                                        <span className="capitalize">{product.product_type}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Variant Selection - Show only if we added generic product, but we try to avoid that now */}
                                {(() => {
                                  if (
                                    !variant &&
                                    product?.product_type === 'variable' &&
                                    product.variants &&
                                    product.variants.length > 0
                                  ) {
                                    return (
                                      <FormField
                                        control={form.control}
                                        name={`products.${index}.variant_id`}
                                        render={({ field: variantField }) => (
                                          <FormItem>
                                            <select
                                              className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                              value={variantField.value ?? ''}
                                              onChange={(e) => {
                                                const variantId = e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined
                                                variantField.onChange(variantId)
                                                if (variantId) {
                                                  const selectedVariant = product.variants?.find(
                                                    (v) => v.id === variantId
                                                  )
                                                  // Update prices based on variant
                                                  const variantStock = selectedVariant?.stocks?.[0]
                                                  if (variantStock) {
                                                    // ...logic to update prices...
                                                  }
                                                }
                                              }}
                                            >
                                              <option value="">Select variant</option>
                                              {product.variants?.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                  {v.variant_name}
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
                            </TableCell>

                            {/* Batch No */}
                            <TableCell className="align-middle">
                              {!product?.is_batch_tracked ? (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              ) : (
                                <FormField
                                  control={form.control}
                                  name={`products.${index}.batch_no`}
                                  render={({ field }) => (
                                    <Input {...field} placeholder="Batch" className="h-7 text-xs" />
                                  )}
                                />
                              )}
                            </TableCell>

                            {/* Dates */}
                            <TableCell className="align-middle">
                              {!product?.is_batch_tracked ? (
                                <div className="space-y-1 text-[10px] text-muted-foreground">
                                  <div>
                                    <span className="mr-1 text-[9px]">Exp:</span>
                                    N/A
                                  </div>
                                  <div>
                                    <span className="mr-1 text-[9px]">Mfg:</span>
                                    N/A
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <FormField
                                    control={form.control}
                                    name={`products.${index}.expire_date`}
                                    render={({ field }) => (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              'h-7 w-full justify-start pl-2 pr-1 text-left text-[10px] font-normal',
                                              !field.value && 'text-muted-foreground'
                                            )}
                                          >
                                            <span className="mr-1 text-[9px]">Exp:</span>
                                            {field.value
                                              ? format(new Date(field.value), 'dd/MM')
                                              : ''}
                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={
                                              field.value ? new Date(field.value) : undefined
                                            }
                                            onSelect={(date: Date | undefined) =>
                                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                                            }
                                            disabled={(date) => date < new Date('1900-01-01')}
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`products.${index}.mfg_date`}
                                    render={({ field }) => (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              'h-7 w-full justify-start pl-2 pr-1 text-left text-[10px] font-normal',
                                              !field.value && 'text-muted-foreground'
                                            )}
                                          >
                                            <span className="mr-1 text-[9px]">Mfg:</span>
                                            {field.value
                                              ? format(new Date(field.value), 'dd/MM')
                                              : ''}
                                            <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={
                                              field.value ? new Date(field.value) : undefined
                                            }
                                            onSelect={(date: Date | undefined) =>
                                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '')
                                            }
                                            disabled={(date) =>
                                              date > new Date() || date < new Date('1900-01-01')
                                            }
                                            initialFocus
                                          />
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  />
                                </div>
                              )}
                            </TableCell>

                            {/* Quantities */}
                            <TableCell className="align-middle">
                              <FormField
                                control={form.control}
                                name={`products.${index}.quantities`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={1}
                                        className="foc-qty h-7 text-right"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        autoFocus={index === fields.length - 1}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </TableCell>

                            {/* Cost Price */}
                            <TableCell className="align-middle">
                              <FormField
                                control={form.control}
                                name={`products.${index}.productPurchasePrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                          {currencySymbol}
                                        </span>
                                        <Input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          className="h-7 pl-8 text-right"
                                          {...field}
                                          onChange={(e) => field.onChange(Number(e.target.value))}
                                        />
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>

                            {/* Sale Price */}
                            <TableCell className="align-middle">
                              <div className="space-y-1">
                                <FormField
                                  control={form.control}
                                  name={`products.${index}.productSalePrice`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="relative">
                                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                            {currencySymbol}
                                          </span>
                                          <Input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            className="h-8 pl-8 text-right"
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                          />
                                        </div>
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </TableCell>

                            {/* Subtotal */}
                            <TableCell className="align-middle">
                              <Input
                                readOnly
                                disabled
                                className="h-7 bg-muted/50 text-right font-medium text-foreground disabled:opacity-100"
                                value={formatCurrency(
                                  (form.watch(`products.${index}.quantities`) || 0) *
                                    (form.watch(`products.${index}.productPurchasePrice`) || 0)
                                )}
                              />
                            </TableCell>

                            {/* Action */}
                            <TableCell className="text-right align-middle">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* Payment Section Card */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Payment & Totals</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Left Side: Controls */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="payment_type_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(val) => field.onChange(Number(val))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentTypes
                              .filter((pt) => !pt.is_credit)
                              .map((pt) => (
                                <SelectItem key={pt.id} value={pt.id.toString()}>
                                  {pt.name}
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
                    name="paidAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid Amount</FormLabel>
                        <div className="flex gap-2">
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
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => field.onChange(totalAmount)}
                            title="Pay Full Amount"
                          >
                            Pay Full
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="discount_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchDiscountType === 'percentage' ? (
                    <FormField
                      control={form.control}
                      name="discount_percent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="0"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="discountAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="vat_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VAT/Tax</FormLabel>
                        <Select
                          onValueChange={(value) =>
                            field.onChange(value === 'none' ? undefined : Number(value))
                          }
                          value={field.value ? String(field.value) : 'none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No tax" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Tax</SelectItem>
                            {vats.map((vat) => (
                              <SelectItem key={vat.id} value={String(vat.id)}>
                                {vat.name} ({vat.rate}%)
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
                    name="shipping_charge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Charge</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right Side: Summary Box */}
              <div className="space-y-4 rounded-lg border bg-muted/50 p-6">
                <h3 className="mb-4 font-semibold">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Discount {watchDiscountType === 'percentage' && `(${watchDiscountPercent}%)`}
                    </span>
                    <span className="font-medium text-red-600">
                      - {formatCurrency(discountAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      VAT {vatPercent > 0 && `(${vatPercent}%)`}
                    </span>
                    <span className="font-medium">+ {formatCurrency(vatAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">+ {formatCurrency(shippingCharge)}</span>
                  </div>
                </div>

                <div className="my-4 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Net Payable</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Paid Amount</span>
                  <span className="font-medium">{formatCurrency(watchPaid)}</span>
                </div>

                <div className="my-4 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <span className="font-medium">Balance Due</span>
                  <span
                    className={cn(
                      'text-lg font-bold',
                      dueAmount > 0 ? 'text-destructive' : 'text-green-600'
                    )}
                  >
                    {formatCurrency(dueAmount)}
                  </span>
                </div>

                <div className="pt-2 text-right">
                  {dueAmount <= 0 ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      PAID
                    </span>
                  ) : dueAmount >= totalAmount ? (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      UNPAID
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      PARTIAL
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="shadow-up fixed bottom-0 left-0 right-0 z-10 flex items-center justify-end gap-4 border-t bg-background p-4">
            <div className="ml-64 mr-auto pl-4 text-sm text-muted-foreground">
              {fields.length} items • Total: {formatCurrency(totalAmount)}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/purchases')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingPurchase || fields.length === 0}
              className="min-w-[150px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  {isEditMode ? 'Update Purchase' : 'Create Purchase'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <SupplierFormDialog
        open={isCreatingSupplier}
        onOpenChange={setIsCreatingSupplier}
        onSave={handleCreateSupplier}
        isSaving={isSavingSupplier}
      />

      <VariantBulkEntryDialog
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        product={selectedProductForBulk}
        onAdd={handleBulkAdd}
      />

      <AlertDialog open={isDueConfirmOpen} onOpenChange={setIsDueConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {isEditMode ? 'Confirm Due Update' : 'Confirm Due Purchase'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingTotals ? (
                <span>
                  This purchase will be created with a balance due of{' '}
                  <span className="font-semibold">
                    {formatCurrency(pendingTotals.dueAmount)}
                  </span>
                  .
                  <br />
                  <span className="mt-2 inline-block">
                    Status:{' '}
                    {pendingTotals.dueAmount >= pendingTotals.totalAmount
                      ? 'Unpaid'
                      : 'Partially paid'}
                  </span>
                </span>
              ) : (
                isEditMode
                  ? 'This purchase will be updated with an outstanding balance.'
                  : 'This purchase will be created with an outstanding balance.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDueConfirm()
              }}
              disabled={isSubmitting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update with Due' : 'Create with Due'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default NewPurchasePage
