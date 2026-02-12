import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Loader2, Layers, ArrowLeft, Save, Plus, Barcode, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
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
  FormDescription,
} from '@/components/ui/form'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  productFormSchema,
  defaultProductFormValues,
  formDataToFormData,
  formDataToVariableProductPayload,
  productToFormData,
} from './schemas'
import type { ProductFormData, VariantInputData, BatchFormValue } from './schemas'
import { VariantManager } from './components/VariantManager'
import { useProducts, useAttributes, DEFAULT_FILTERS } from './hooks'
import { CategoryDialog } from '../product-settings/components/categories/CategoryDialog'
import { BrandDialog } from '../product-settings/components/brands/BrandDialog'
import { UnitDialog } from '../product-settings/components/units/UnitDialog'
import type { Category, Brand, Unit, Product } from '@/types/api.types'
import { productsService } from '@/api/services'

// ============================================
// Constants
// ============================================

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const createEmptyBatchEntry = (overrides?: Partial<BatchFormValue>): BatchFormValue => ({
  batch_no: '',
  productStock: '',
  productPurchasePrice: '',
  productSalePrice: '',
  productWholeSalePrice: '',
  productDealerPrice: '',
  mfg_date: '',
  expire_date: '',
  ...overrides,
})

// ============================================
// Main Component
// ============================================

export default function ProductFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode)
  const [product, setProduct] = useState<Product | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [variants, setVariants] = useState<VariantInputData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false)
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false)

  // Fetch data
  const { categories, brands, units, createProduct, updateProduct, refetch } =
    useProducts(DEFAULT_FILTERS)
  const { attributes, isLoading: attributesLoading } = useAttributes()

  // Initialize form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  })

  // Watch product type
  const productType = form.watch('product_type')
  const isVariableProduct = productType === 'variable'
  const isBatchTracked = form.watch('is_batch_tracked')

  const {
    fields: batchFields,
    append: appendBatch,
    remove: removeBatch,
  } = useFieldArray({
    control: form.control,
    name: 'batches',
  })

  const generateBatchNumber = useCallback(() => {
    const now = new Date()
    const datePart = `${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randomSegment = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `LOT-${datePart}-${randomSegment}`
  }, [])

  useEffect(() => {
    if (isBatchTracked && !isVariableProduct) {
      const currentBatches = form.getValues('batches')
      if (!currentBatches || currentBatches.length === 0) {
        appendBatch(createEmptyBatchEntry({ batch_no: generateBatchNumber() }))
        return
      }

      let mutated = false
      const updatedBatches = currentBatches.map((batch) => {
        let nextBatch = batch
        if (!nextBatch.batch_no) {
          mutated = true
          nextBatch = { ...nextBatch, batch_no: generateBatchNumber() }
        }
        return nextBatch
      })

      if (mutated) {
        form.setValue('batches', updatedBatches)
      }
    }
  }, [appendBatch, form, generateBatchNumber, isBatchTracked, isVariableProduct])

  useEffect(() => {
    if (!isBatchTracked) {
      form.setValue('batches', [])
    }
  }, [form, isBatchTracked])

  const handleAddBatchRow = useCallback(() => {
    appendBatch(createEmptyBatchEntry({ batch_no: generateBatchNumber() }))
  }, [appendBatch, generateBatchNumber])

  const handleRemoveBatchRow = useCallback(
    (index: number) => {
      const currentBatches = form.getValues('batches') || []
      if (currentBatches.length <= 1) {
        return
      }
      removeBatch(index)
    },
    [form, removeBatch]
  )

  // Fetch product data for edit mode
  useEffect(() => {
    if (!isEditMode) return

    const fetchProduct = async () => {
      if (!id) {
        toast.error('Product ID is required')
        navigate('/products')
        return
      }

      setIsLoadingProduct(true)
      try {
        const response = await productsService.getById(Number(id))
        const productData = response.data
        setProduct(productData)

        // Convert product to form data
        const formData = productToFormData(productData)

        // Set form values
        form.reset({
          productName: formData.productName,
          productCode: formData.productCode,
          barcode: formData.barcode,
          category_id: formData.category_id,
          brand_id: formData.brand_id,
          unit_id: formData.unit_id,
          alert_qty: formData.alert_qty,
          product_type: formData.product_type,
          is_batch_tracked: formData.is_batch_tracked,
          productPurchasePrice: formData.productPurchasePrice,
          productSalePrice: formData.productSalePrice,
          productStock: formData.productStock,
          description: formData.description,
          batches: formData.batches,
        })

        // Set variants if variable product
        if (formData.variants && formData.variants.length > 0) {
          setVariants(formData.variants)
        }

        // Set image preview if exists
        if (productData.productPicture) {
          setImagePreview(productData.productPicture)
        }
      } catch (error) {
        console.error('Failed to fetch product:', error)
        toast.error('Failed to load product data')
        navigate('/products')
      } finally {
        setIsLoadingProduct(false)
      }
    }

    fetchProduct()
  }, [id, isEditMode, navigate, form])

  // Handle image change
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('[ProductForm] Image selected:', file.name, file.size, file.type)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image size must be less than 2MB.')
      return
    }

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
      console.log('[ProductForm] Image preview generated')
    }
    reader.onerror = () => {
      toast.error('Failed to read image file')
      console.error('[ProductForm] FileReader error')
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Handle image box click for accessibility
  const handleImageBoxClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Handle SKU generation
  const handleGenerateSku = useCallback(() => {
    const productName = form.getValues('productName')
    if (productName) {
      // Simple SKU generation logic: NAME-RANDOM
      const code =
        productName.substring(0, 3).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000)
      form.setValue('productCode', code)
    }
  }, [form])

  // Handle instant creation success
  const handleCategorySuccess = useCallback(
    async (newCategory?: Category) => {
      await refetch()
      if (newCategory) {
        form.setValue('category_id', newCategory.id.toString())
      }
    },
    [refetch, form]
  )

  const handleBrandSuccess = useCallback(
    async (newBrand?: Brand) => {
      await refetch()
      if (newBrand) {
        form.setValue('brand_id', newBrand.id.toString())
      }
    },
    [refetch, form]
  )

  const handleUnitSuccess = useCallback(
    async (newUnit?: Unit) => {
      await refetch()
      if (newUnit) {
        form.setValue('unit_id', newUnit.id.toString())
      }
    },
    [refetch, form]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (formValues: ProductFormData) => {
      const normalizedBatches =
        formValues.batches?.map((batch) => ({
          batch_no: batch.batch_no?.trim() || '',
          productStock: batch.productStock?.trim() || '',
          productPurchasePrice: batch.productPurchasePrice?.trim() || '',
          productSalePrice: batch.productSalePrice?.trim() || '',
          productWholeSalePrice: batch.productWholeSalePrice?.trim() || '',
          productDealerPrice: batch.productDealerPrice?.trim() || '',
          mfg_date: batch.mfg_date?.trim() || '',
          expire_date: batch.expire_date?.trim() || '',
        })) || []

      const data: ProductFormData = {
        ...formValues,
        batches: normalizedBatches,
      }

      // Validate variants for variable products
      if (data.product_type === 'variable' && variants.length === 0) {
        toast.error('Variable products must have at least one variant')
        return
      }

      // Check for duplicate SKUs
      if (data.product_type === 'variable' && variants.length > 0) {
        const skuCounts = new Map<string, number>()
        variants.forEach((variant) => {
          const sku = variant.sku?.trim().toUpperCase()
          if (sku) {
            skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1)
          }
        })
        const duplicates = Array.from(skuCounts.entries())
          .filter(([, count]) => count > 1)
          .map(([sku]) => sku)

        if (duplicates.length > 0) {
          toast.error(
            `Duplicate SKUs found: ${duplicates.join(', ')}. Each variant must have a unique SKU.`
          )
          return
        }
      }

      if (data.product_type === 'simple' && data.is_batch_tracked) {
        if (!data.batches || data.batches.length === 0) {
          toast.error('Add at least one batch entry before saving this product')
          return
        }

        const invalidBatch = data.batches.find(
          (batch) => !batch.batch_no || !batch.productStock || Number(batch.productStock) <= 0
        )

        if (invalidBatch) {
          toast.error('Each batch needs a batch number and a quantity greater than zero')
          return
        }
      }

      setIsSubmitting(true)
      try {
        if (isEditMode && id) {
          // Update existing product
          if (data.product_type === 'variable') {
            const payload = formDataToVariableProductPayload(data, variants)
            await updateProduct(Number(id), payload, true)
          } else {
            // For edit, pass isEdit=true to exclude productStock field
            const formData = formDataToFormData(data, imageFile, true)
            await updateProduct(Number(id), formData, false)
          }
        } else {
          // Create new product
          if (data.product_type === 'variable') {
            const payload = formDataToVariableProductPayload(data, variants)
            await createProduct(payload, true)
          } else {
            const formData = formDataToFormData(data, imageFile, false)
            await createProduct(formData, false)
          }
        }

        navigate('/products')
      } catch (error: unknown) {
        console.error(`Failed to ${isEditMode ? 'update' : 'create'} product:`, error)
        let errorMessage = String(error)
        if (error && typeof error === 'object') {
          const axiosError = error as {
            response?: { data?: { message?: string } }
            message?: string
          }
          errorMessage = axiosError.response?.data?.message || axiosError.message || String(error)
        }

        const duplicateSkuMatch = errorMessage.match(
          /Duplicate entry '[\d]+-([^']+)' for key 'product_variants\.unique_sku_business'/
        )

        if (duplicateSkuMatch) {
          const duplicateSku = duplicateSkuMatch[1]
          toast.error(`SKU "${duplicateSku}" already exists.`)
        } else if (errorMessage.includes('Duplicate entry')) {
          toast.error('A variant with this SKU already exists.')
        } else {
          toast.error(`Failed to ${isEditMode ? 'update' : 'create'} product`)
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isEditMode, id, imageFile, createProduct, updateProduct, navigate, variants]
  )

  const handleVariantsChange = useCallback((newVariants: VariantInputData[]) => {
    setVariants(newVariants)
  }, [])

  const findFirstError = useCallback(function findFirstError(
    errors: FieldErrors<ProductFormData>,
    prefix = ''
  ): { path: string; message: string } | null {
    const entries = Object.entries(errors)
    for (const [key, value] of entries) {
      if (!value) continue
      const nextPath = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && 'message' in value && value.message) {
        return { path: nextPath, message: String(value.message) }
      }
      if (typeof value === 'object') {
        const nested = findFirstError(value as FieldErrors<ProductFormData>, nextPath)
        if (nested) return nested
      }
    }
    return null
  }, [])

  const handleInvalid = useCallback(
    (errors: FieldErrors<ProductFormData>) => {
      const firstError = findFirstError(errors)
      if (firstError?.path) {
        form.setFocus(firstError.path as keyof ProductFormData)
      }
      toast.error(firstError?.message || 'Please fix the highlighted fields before saving.')
    },
    [findFirstError, form]
  )

  const handleFormSubmit = form.handleSubmit(handleSubmit, handleInvalid)

  // Show loading state while fetching product
  if (isLoadingProduct) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading product data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? 'Update product details and information.'
                : 'Fill in the details to create a new product.'}
            </p>
          </div>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-8">
          {/* Card 1: Basic Info */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Package className="h-5 w-5 text-primary" />
              Basic Information
            </h3>

            <div className="flex flex-col gap-8 md:flex-row">
              {/* Image Upload */}
              <div className="flex-shrink-0">
                <div className="flex flex-col items-center gap-3">
                  <div
                    onClick={handleImageBoxClick}
                    className="group relative flex h-40 w-40 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted transition-all hover:border-primary hover:bg-primary/5"
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="text-xs font-medium text-white">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
                        <Package className="h-12 w-12" />
                        <span className="text-xs font-medium">Click to upload</span>
                      </div>
                    )}
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(',')}
                      className="hidden"
                      onChange={handleImageChange}
                      aria-label="Upload product image"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, or WebP
                      <br />
                      Max 2MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="flex-1 space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Wireless Headphones" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Code / SKU</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="e.g. WH-1000XM4" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGenerateSku}
                          >
                            Auto
                          </Button>
                        </div>
                        <FormDescription>Leave blank to auto-generate</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!isVariableProduct && (
                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Start scanning..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }
                                }}
                                className="pl-7 font-mono text-xs"
                                {...field}
                              />
                              <Barcode className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormDescription>Scan or enter barcode number</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border bg-muted/20 p-3">
                        {isEditMode ? (
                          <div className="flex w-full items-center text-sm text-muted-foreground">
                            <Layers className="mr-2 h-4 w-4" />
                            <span className="mr-2 font-medium text-foreground">Type:</span>
                            {field.value === 'variable' ? 'Variable Product' : 'Simple Product'}
                            <span className="ml-2 text-xs">(Cannot be changed)</span>
                          </div>
                        ) : (
                          <>
                            <FormControl>
                              <Checkbox
                                checked={field.value === 'variable'}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? 'variable' : 'simple')
                                }}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-semibold">
                                Variable Product
                              </FormLabel>
                              <FormDescription>
                                Has variations like Size, Color, etc.
                              </FormDescription>
                            </div>
                          </>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_batch_tracked"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border bg-muted/20 p-3">
                        {isEditMode ? (
                          <div className="flex w-full items-center text-sm text-muted-foreground">
                            <Package className="mr-2 h-4 w-4" />
                            <span className="mr-2 font-medium text-foreground">
                              Batch Tracking:
                            </span>
                            {field.value ? 'Enabled' : 'Disabled'}
                            <span className="ml-2 text-xs">(Cannot be changed)</span>
                          </div>
                        ) : (
                          <>
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-semibold">
                                Batch/Lot Tracking
                              </FormLabel>
                              <FormDescription>
                                Track by batch number with expiry dates (e.g., food, medicine)
                              </FormDescription>
                            </div>
                          </>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Classification */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
              <Layers className="h-5 w-5 text-primary" />
              Classification
            </h3>
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.categoryName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCategoryDialogOpen(true)}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id.toString()}>
                              {brand.brandName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsBrandDialogOpen(true)}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id.toString()}>
                              {unit.unitName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsUnitDialogOpen(true)}
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Card 3: Batch Entries */}
          {!isVariableProduct && isBatchTracked && (
            <div className="rounded-lg border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Package className="h-5 w-5 text-primary" />
                  Batch Entries
                </h3>
                {!isEditMode && (
                  <Button type="button" variant="outline" size="sm" onClick={handleAddBatchRow}>
                    <Plus className="mr-2 h-4 w-4" /> Add Batch
                  </Button>
                )}
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Capture one row per lot so the backend can create a proper stock record for each
                batch. You can still add more via Purchases or Stock Adjustments after creation.
              </p>

              {batchFields.length === 0 && (
                <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                  No batches added yet.
                </div>
              )}

              <div className="space-y-4">
                {batchFields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name={`batches.${index}.batch_no`}
                        render={({ field: batchField }) => (
                          <FormItem>
                            <FormLabel>Batch / Lot Number</FormLabel>
                            <FormControl>
                              <Input
                                {...batchField}
                                placeholder="Auto-generated"
                                readOnly
                                disabled
                                className="cursor-not-allowed bg-muted/60 text-muted-foreground"
                              />
                            </FormControl>
                            <FormDescription>
                              Created automatically and cannot be changed.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {!isEditMode && (
                        <FormField
                          control={form.control}
                          name={`batches.${index}.productStock`}
                          render={({ field: qtyField }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" placeholder="0" {...qtyField} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`batches.${index}.productPurchasePrice`}
                        render={({ field: purchaseField }) => (
                          <FormItem>
                            <FormLabel>Purchase Price</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...purchaseField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`batches.${index}.productSalePrice`}
                        render={({ field: saleField }) => (
                          <FormItem>
                            <FormLabel>Sale Price</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...saleField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`batches.${index}.productWholeSalePrice`}
                        render={({ field: wholesaleField }) => (
                          <FormItem>
                            <FormLabel>Wholesale Price</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...wholesaleField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`batches.${index}.productDealerPrice`}
                        render={({ field: dealerField }) => (
                          <FormItem>
                            <FormLabel>Dealer Price</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...dealerField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name={`batches.${index}.mfg_date`}
                        render={({ field: mfgField }) => (
                          <FormItem>
                            <FormLabel>Manufacturing Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...mfgField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`batches.${index}.expire_date`}
                        render={({ field: expField }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...expField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBatchRow(index)}
                          disabled={batchFields.length === 1}
                          aria-label="Remove batch"
                          title={
                            batchFields.length === 1
                              ? 'At least one batch entry is required'
                              : 'Remove batch'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Pricing & Inventory (Simple Product Only) */}
          {!isVariableProduct && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                <Package className="h-5 w-5 text-primary" />
                Pricing & Inventory
              </h3>
              <div className={cn('grid gap-6', isEditMode ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
                {!isBatchTracked && (
                  <>
                    <FormField
                      control={form.control}
                      name="productPurchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Price</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              type="number"
                              min="0"
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
                      name="productSalePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                {!isEditMode && !isBatchTracked && (
                  <FormField
                    control={form.control}
                    name="productStock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {isBatchTracked && (
                <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
                  Stock quantities are captured per batch. Use the Batch Entries section below to
                  define the initial lots for this product.
                </div>
              )}

              {isEditMode && (
                <>
                  <Separator className="my-6" />
                  <div className="rounded-lg bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Stock quantity cannot be edited here. Use the Stock
                      Adjustments page to modify inventory levels.
                    </p>
                  </div>
                </>
              )}

              <Separator className="my-6" />

              <div className="w-full md:w-1/3">
                <FormField
                  control={form.control}
                  name="alert_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Alert</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="e.g. 10" {...field} />
                      </FormControl>
                      <FormDescription>Get notified when stock reaches this level.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Card 4: Variations (Variable Product Only) */}
          {isVariableProduct && (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                <Layers className="h-5 w-5 text-primary" />
                Product Variations
              </h3>
              <VariantManager
                product={product}
                attributes={attributes}
                attributesLoading={attributesLoading}
                variants={variants}
                onVariantsChange={handleVariantsChange}
                isEditMode={isEditMode}
              />

              <Separator className="my-6" />

              <div className="w-full md:w-1/3">
                <FormField
                  control={form.control}
                  name="alert_qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Stock Alert (Global)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="e.g. 5" {...field} />
                      </FormControl>
                      <FormDescription>Default alert level if not set per variant.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Fixed Footer */}
          <div className="shadow-up fixed bottom-0 left-0 right-0 z-10 flex items-center justify-end gap-4 border-t bg-background p-4">
            <Button variant="outline" type="button" onClick={() => navigate('/products')}>
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={handleFormSubmit}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditMode ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        onSuccess={handleCategorySuccess}
      />

      <BrandDialog
        open={isBrandDialogOpen}
        onOpenChange={setIsBrandDialogOpen}
        onSuccess={handleBrandSuccess}
      />

      <UnitDialog
        open={isUnitDialogOpen}
        onOpenChange={setIsUnitDialogOpen}
        onSuccess={handleUnitSuccess}
      />
    </div>
  )
}
