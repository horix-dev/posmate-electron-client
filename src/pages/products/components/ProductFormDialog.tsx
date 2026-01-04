import { memo, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Loader2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { getImageUrl } from '@/lib/utils'
import type { Product, Category, Brand, Unit } from '@/types/api.types'
import type { Attribute } from '@/types/variant.types'
import {
  productFormSchema,
  type ProductFormData,
  type VariantInputData,
  defaultProductFormValues,
  productToFormData,
  formDataToFormData,
  formDataToVariableProductPayload,
} from '../schemas'
import { VariantManager } from './VariantManager'

// ============================================
// Types
// ============================================

export interface ProductFormDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Product to edit, null for create mode */
  product: Product | null
  /** Whether the product is being loaded */
  isLoadingProduct?: boolean
  /** Available categories */
  categories: Category[]
  /** Available brands */
  brands: Brand[]
  /** Available units */
  units: Unit[]
  /** Available attributes for variants */
  attributes?: Attribute[]
  /** Loading state for attributes */
  attributesLoading?: boolean
  /** Callback when form is submitted successfully - handles both FormData and VariableProductPayload */
  onSubmit: (
    data: FormData | ReturnType<typeof formDataToVariableProductPayload>,
    isEdit: boolean,
    isVariable: boolean
  ) => Promise<void>
}

// ============================================
// Constants
// ============================================

const MAX_IMAGE_SIZE = 2 * 1024 * 1024 // 2MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// ============================================
// Main Component
// ============================================

function ProductFormDialogComponent({
  open,
  onOpenChange,
  product,
  isLoadingProduct = false,
  categories,
  brands,
  units,
  attributes = [],
  attributesLoading = false,
  onSubmit,
}: ProductFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [variants, setVariants] = useState<VariantInputData[]>([])

  const isEdit = !!product

  // Initialize form with react-hook-form and zod validation
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultProductFormValues,
  })

  // Watch product type to show/hide variants tab
  const productType = form.watch('product_type')
  const isVariableProduct = productType === 'variable'

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      if (product) {
        const formData = productToFormData(product)
        form.reset(formData)
        setImagePreview(getImageUrl(product.productPicture))
        setVariants(formData.variants || [])
      } else {
        form.reset(defaultProductFormValues)
        setImagePreview(null)
        setVariants([])
      }
      setImageFile(null)
      setActiveTab('general')
    }
  }, [open, product, form])

  // Handle image change with validation
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image size must be less than 2MB.')
      return
    }

    setImageFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: ProductFormData) => {
      console.log('✅ handleSubmit called with data:', data)
      console.log('✅ Variants:', variants)

      // Validate variants for variable products
      if (data.product_type === 'variable' && variants.length === 0) {
        toast.error('Variable products must have at least one variant')
        setActiveTab('variants')
        return
      }

      // Check for duplicate SKUs in variants
      if (data.product_type === 'variable' && variants.length > 0) {
        console.log('🔍 Validating variants, checking each variant:')
        variants.forEach((v, idx) => {
          console.log(`  Variant ${idx}:`, {
            sku: v.sku,
            attribute_value_ids: v.attribute_value_ids,
            has_attribute_value_ids: !!v.attribute_value_ids,
            attribute_value_ids_length: v.attribute_value_ids?.length,
          })
        })

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
          setActiveTab('variants')
          return
        }
      }

      setIsSubmitting(true)
      try {
        const isVariable = data.product_type === 'variable'
        console.log('🚀 isVariable:', isVariable, 'isEdit:', isEdit)

        if (isVariable) {
          // Variable products: send JSON payload with variants
          const payload = formDataToVariableProductPayload(data, variants)
          await onSubmit(payload, isEdit, true)
        } else {
          // Simple products: send FormData
          const formData = formDataToFormData(data, imageFile, isEdit)
          await onSubmit(formData, isEdit, false)
        }

        onOpenChange(false)
      } catch (error: unknown) {
        console.error('Failed to save product:', error)

        // Extract error message from various error formats (Axios, Error, string)
        let errorMessage = ''
        if (error && typeof error === 'object') {
          // Axios error: error.response.data.message
          const axiosError = error as {
            response?: { data?: { message?: string } }
            message?: string
          }
          errorMessage = axiosError.response?.data?.message || axiosError.message || String(error)
        } else {
          errorMessage = String(error)
        }

        // Parse backend error for duplicate SKU
        const duplicateSkuMatch = errorMessage.match(
          /Duplicate entry '[\d]+-([^']+)' for key 'product_variants\.unique_sku_business'/
        )

        if (duplicateSkuMatch) {
          const duplicateSku = duplicateSkuMatch[1]
          toast.error(
            `SKU "${duplicateSku}" already exists in another product. Please use a different SKU.`
          )
          setActiveTab('variants')
        } else if (
          errorMessage.includes('Duplicate entry') ||
          errorMessage.includes('unique_sku')
        ) {
          toast.error('A variant with this SKU already exists. Please use a unique SKU.')
          setActiveTab('variants')
        } else {
          toast.error(isEdit ? 'Failed to update product' : 'Failed to create product')
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    [imageFile, isEdit, onSubmit, onOpenChange, variants]
  )

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onOpenChange(false)
    }
  }, [isSubmitting, onOpenChange])

  // Handle variants change from VariantManager
  const handleVariantsChange = useCallback((newVariants: VariantInputData[]) => {
    setVariants(newVariants)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col p-0"
        aria-describedby="product-form-description"
      >
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription id="product-form-description">
            {isEdit
              ? 'Update the product information below.'
              : 'Fill in the product details below to add a new product.'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state while fetching product details */}
        {isLoadingProduct ? (
          <div className="flex items-center justify-center px-6 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading product details...</span>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={(e) => {
                console.log('📝 Form onSubmit event triggered')
                console.log('📝 Form errors:', form.formState.errors)
                console.log('📝 Form values:', form.getValues())
                form.handleSubmit(handleSubmit)(e)
              }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
                {/* Product Type */}
                {isEdit ? (
                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem className="rounded-md border p-4">
                        <FormControl>
                          <Input type="hidden" {...field} />
                        </FormControl>
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Product Type</div>
                            <div className="text-sm text-muted-foreground">
                              Product type can’t be changed after creation.
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            {field.value === 'variable' ? (
                              <span className="inline-flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                Variable Product
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Simple Product
                              </span>
                            )}
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="product_type"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value === 'variable'}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? 'variable' : 'simple')
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="flex cursor-pointer items-center gap-2">
                            <Layers className="h-4 w-4" />
                            Variable Product
                          </FormLabel>
                          <FormDescription>
                            Check this if the product has multiple variations (size, color, etc.).
                            Leave unchecked for simple products with a single price and stock level.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                {/* Tabs for General / Variants - Only show tabs if variable product */}
                {isVariableProduct ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="variants">
                        Variants {variants.length > 0 && `(${variants.length})`}
                      </TabsTrigger>
                    </TabsList>

                    {/* General Tab */}
                    <TabsContent value="general" className="space-y-6 pt-4">
                      {/* Product Image */}
                      <div className="flex items-center gap-4">
                        <div
                          className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted"
                          role="img"
                          aria-label={imagePreview ? 'Product image preview' : 'No image selected'}
                        >
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-full w-full rounded-lg object-cover"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <Label
                            htmlFor="product-image"
                            className="cursor-pointer text-primary hover:underline"
                          >
                            {imagePreview ? 'Change image' : 'Upload image'}
                          </Label>
                          <Input
                            id="product-image"
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            className="hidden"
                            onChange={handleImageChange}
                            aria-describedby="image-help"
                          />
                          <p id="image-help" className="text-xs text-muted-foreground">
                            PNG, JPG, WebP up to 2MB
                          </p>
                        </div>
                      </div>

                      {/* Basic Info */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="productName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter product name" {...field} />
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
                              <FormLabel>Product Code</FormLabel>
                              <FormControl>
                                <Input placeholder="SKU or barcode" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Category, Brand, Unit */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="category_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="unit_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Pricing & Stock - Only for simple products and only on create */}
                      {!isVariableProduct && !isEdit && (
                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="productPurchasePrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Purchase Price</FormLabel>
                                <FormControl>
                                  <Input
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
                                  <Input
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
                        </div>
                      )}

                      {/* On edit, show pricing only (no stock) */}
                      {!isVariableProduct && isEdit && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="productPurchasePrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Purchase Price</FormLabel>
                                <FormControl>
                                  <Input
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
                                  <Input
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
                        </div>
                      )}

                      {/* Alert Quantity */}
                      <FormField
                        control={form.control}
                        name="alert_qty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Low Stock Alert Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="e.g., 10" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {/* Variants Tab */}
                    <TabsContent value="variants" className="pt-4">
                      {isVariableProduct ? (
                        <VariantManager
                          product={product}
                          attributes={attributes}
                          attributesLoading={attributesLoading}
                          variants={variants}
                          onVariantsChange={handleVariantsChange}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                          <Layers className="mb-2 h-8 w-8" />
                          <p>Select "Variable Product" type to manage variants</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  /* No tabs for simple products - just show general fields */
                  <div className="space-y-6 pt-4">
                    {/* Product Image */}
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted"
                        role="img"
                        aria-label={imagePreview ? 'Product image preview' : 'No image selected'}
                      >
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor="product-image-simple"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          {imagePreview ? 'Change image' : 'Upload image'}
                        </Label>
                        <Input
                          id="product-image-simple"
                          type="file"
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          className="hidden"
                          onChange={handleImageChange}
                          aria-describedby="image-help-simple"
                        />
                        <p id="image-help-simple" className="text-xs text-muted-foreground">
                          PNG, JPG, WebP up to 2MB
                        </p>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="productName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter product name" {...field} />
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
                            <FormLabel>Product Code</FormLabel>
                            <FormControl>
                              <Input placeholder="SKU or barcode" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Category, Brand, Unit */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Pricing & Stock - Create mode only */}
                    {!isEdit && (
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="productPurchasePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase Price</FormLabel>
                              <FormControl>
                                <Input
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
                                <Input
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
                      </div>
                    )}

                    {/* On edit, show pricing only (no stock) */}
                    {isEdit && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="productPurchasePrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purchase Price</FormLabel>
                              <FormControl>
                                <Input
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
                                <Input
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
                      </div>
                    )}

                    {/* Alert Quantity */}
                    <FormField
                      control={form.control}
                      name="alert_qty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Alert Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="e.g., 10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <Separator className="shrink-0" />

              <DialogFooter className="shrink-0 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  onClick={() => {
                    console.log('🔘 Update Product button clicked')
                    console.log('🔘 Form is valid?', form.formState.isValid)
                    console.log('🔘 Form errors:', form.formState.errors)
                  }}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {isSubmitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const ProductFormDialog = memo(ProductFormDialogComponent)

ProductFormDialog.displayName = 'ProductFormDialog'

export default ProductFormDialog
