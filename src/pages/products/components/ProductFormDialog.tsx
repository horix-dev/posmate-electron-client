import { memo, useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Package, Loader2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
  onSubmit: (data: FormData | ReturnType<typeof formDataToVariableProductPayload>, isEdit: boolean, isVariable: boolean) => Promise<void>
  /** Currency symbol for display */
  currencySymbol?: string
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
  currencySymbol = '$',
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
      // Validate variants for variable products
      if (data.product_type === 'variable' && variants.length === 0) {
        toast.error('Variable products must have at least one variant')
        setActiveTab('variants')
        return
      }

      // Check for duplicate SKUs in variants
      if (data.product_type === 'variable' && variants.length > 0) {
        const skuCounts = new Map<string, number>()
        variants.forEach((variant) => {
          const sku = variant.sku?.trim().toUpperCase()
          if (sku) {
            skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1)
          }
        })
        const duplicates = Array.from(skuCounts.entries())
          .filter(([_, count]) => count > 1)
          .map(([sku]) => sku)
        
        if (duplicates.length > 0) {
          toast.error(`Duplicate SKUs found: ${duplicates.join(', ')}. Each variant must have a unique SKU.`)
          setActiveTab('variants')
          return
        }
      }

      setIsSubmitting(true)
      try {
        const isVariable = data.product_type === 'variable'
        
        if (isVariable) {
          // Variable products: send JSON payload with variants
          const payload = formDataToVariableProductPayload(data, variants, imageFile)
          await onSubmit(payload, isEdit, true)
        } else {
          // Simple products: send FormData
          const formData = formDataToFormData(data, imageFile)
          await onSubmit(formData, isEdit, false)
        }
        
        onOpenChange(false)
      } catch (error: unknown) {
        console.error('Failed to save product:', error)
        
        // Extract error message from various error formats (Axios, Error, string)
        let errorMessage = ''
        if (error && typeof error === 'object') {
          // Axios error: error.response.data.message
          const axiosError = error as { response?: { data?: { message?: string } }; message?: string }
          errorMessage = axiosError.response?.data?.message || axiosError.message || String(error)
        } else {
          errorMessage = String(error)
        }
        
        // Parse backend error for duplicate SKU
        const duplicateSkuMatch = errorMessage.match(/Duplicate entry '[\d]+-([^']+)' for key 'product_variants\.unique_sku_business'/)
        
        if (duplicateSkuMatch) {
          const duplicateSku = duplicateSkuMatch[1]
          toast.error(`SKU "${duplicateSku}" already exists in another product. Please use a different SKU.`)
          setActiveTab('variants')
        } else if (errorMessage.includes('Duplicate entry') || errorMessage.includes('unique_sku')) {
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
        className="max-w-3xl max-h-[90vh] flex flex-col p-0"
        aria-describedby="product-form-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription id="product-form-description">
            {isEdit
              ? 'Update the product information below.'
              : 'Fill in the product details below to add a new product.'}
          </DialogDescription>
        </DialogHeader>

        {/* Loading state while fetching product details */}
        {isLoadingProduct ? (
          <div className="flex items-center justify-center py-12 px-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading product details...</span>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Product Type Selection - Always visible at top */}
            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isEdit && product?.product_type === 'variable'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="simple">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>Simple Product</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="variable">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          <span>Variable Product</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {isVariableProduct 
                      ? 'Variable products have multiple variations (size, color, etc.)'
                      : 'Simple products have a single price and stock level'
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Tabs for General / Variants */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="variants" disabled={!isVariableProduct}>
                  Variants {isVariableProduct && variants.length > 0 && `(${variants.length})`}
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

                {/* Pricing & Stock - Only for simple products */}
                {!isVariableProduct && (
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

                {/* Default Pricing for Variable Products */}
                {isVariableProduct && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="productPurchasePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Purchase Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Base price for variants that don't have their own price
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productSalePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Sale Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Base price for variants that don't have their own price
                          </FormDescription>
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
                    defaultCostPrice={parseFloat(form.watch('productPurchasePrice') || '0')}
                    defaultSalePrice={parseFloat(form.watch('productSalePrice') || '0')}
                    currencySymbol={currencySymbol}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Layers className="mb-2 h-8 w-8" />
                    <p>Select "Variable Product" type to manage variants</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </div>

            <Separator className="shrink-0" />

            <DialogFooter className="px-6 py-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
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
