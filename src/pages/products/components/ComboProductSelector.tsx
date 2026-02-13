import { useState, useCallback, useMemo } from 'react'
import { useFieldArray, useWatch, Controller, type Control } from 'react-hook-form'
import { Plus, Search, X, Package, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDebounce } from '@/hooks'
import {
  useProducts,
  DEFAULT_FILTERS,
  getSalePrice,
  getPurchasePrice,
  getTotalStock,
} from '../hooks'
import type { ProductFormData } from '../schemas'
import type { Product } from '@/types/api.types'

interface ComboProductSelectorProps {
  control: Control<ProductFormData>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ComboProductSelector({ control, isOpen, onOpenChange }: ComboProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const {
    fields: comboProducts,
    append,
    remove,
    update,
  } = useFieldArray({
    control,
    name: 'combo_products',
  })

  // Get products for selection
  const { products, isLoading } = useProducts({
    ...DEFAULT_FILTERS,
    search: debouncedSearch,
  })

  // Get unique product IDs already selected
  const selectedProductIds = useMemo(
    () => new Set(comboProducts.map((item) => item.product_id)),
    [comboProducts]
  )

  // Filter out already selected products and combo products
  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) => !selectedProductIds.has(product.id) && !product.is_combo_product
      ),
    [products, selectedProductIds]
  )

  const handleAddProduct = useCallback(
    (product: Product) => {
      append({
        product_id: product.id,
        quantity: 1,
        productName: product.productName,
        productCode: product.productCode || '',
        productPurchasePrice: getPurchasePrice(product),
        productSalePrice: getSalePrice(product),
        availableStock: getTotalStock(product),
      })
    },
    [append]
  )

  const handleUpdateQuantity = useCallback(
    (index: number, quantity: number) => {
      const item = comboProducts[index]
      if (item) {
        update(index, { ...item, quantity })
      }
    },
    [comboProducts, update]
  )

  const handleRemoveProduct = useCallback(
    (index: number) => {
      remove(index)
    },
    [remove]
  )

  // Watch discount fields
  const discountType = useWatch({ control, name: 'combo_discount_type' }) || 'none'
  const discountValue = Number(useWatch({ control, name: 'combo_discount_value' })) || 0

  const totalProducts = comboProducts.length
  const totalPurchasePrice = comboProducts.reduce(
    (sum, item) => sum + (item.productPurchasePrice || 0) * item.quantity,
    0
  )
  const totalSalePrice = comboProducts.reduce(
    (sum, item) => sum + (item.productSalePrice || 0) * item.quantity,
    0
  )

  // Calculate discount - ensure discountAmount is always a valid number
  let discountAmount = 0
  if (discountType === 'percentage' && discountValue > 0) {
    discountAmount = (totalSalePrice * discountValue) / 100
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = discountValue
  }

  // Ensure all values are valid numbers for display
  const safeTotalPurchasePrice = Number.isFinite(totalPurchasePrice) ? totalPurchasePrice : 0
  const safeTotalSalePrice = Number.isFinite(totalSalePrice) ? totalSalePrice : 0
  const safeDiscountAmount = Number.isFinite(discountAmount) ? discountAmount : 0
  const finalSalePrice = Math.max(0, safeTotalSalePrice - safeDiscountAmount)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Combo Product Items
        </CardTitle>
        <CardDescription>
          Select products to include in this combo package. Prices are automatically calculated from
          selected products.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Discount Controls */}
        <div className="rounded-lg border bg-muted/20 p-4">
          <h4 className="mb-3 text-sm font-medium">Discount (Optional)</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Discount Type</label>
              <Controller
                control={control}
                name="combo_discount_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Discount</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {discountType !== 'none' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'}
                </label>
                <Controller
                  control={control}
                  name="combo_discount_value"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="0"
                      max={discountType === 'percentage' ? 100 : undefined}
                      step={discountType === 'percentage' ? '1' : '0.01'}
                      value={field.value}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Products</div>
            <div className="text-lg font-semibold">{totalProducts}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Cost Price</div>
            <div className="text-lg font-semibold">₹{safeTotalPurchasePrice.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-sm text-muted-foreground">Original Price</div>
            <div className="text-lg font-semibold">₹{safeTotalSalePrice.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="text-sm text-muted-foreground">Final Price</div>
            <div className="text-lg font-semibold text-primary">
              ₹{finalSalePrice.toFixed(2)}
              {safeDiscountAmount > 0 && (
                <span className="ml-2 text-xs text-green-600">
                  (-₹{safeDiscountAmount.toFixed(2)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Selected Products Table */}
        {comboProducts.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-24">Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comboProducts.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.productCode || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.availableStock || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max={item.availableStock || 9999}
                        value={item.quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1
                          handleUpdateQuantity(index, Math.max(1, value))
                        }}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>₹{(item.productSalePrice || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      ₹{((item.productSalePrice || 0) * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProduct(index)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No products selected</h3>
            <p className="text-sm text-muted-foreground">
              Add products to create your combo package
            </p>
            <div className="mt-4 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
              <strong>Backend Not Ready:</strong> If editing an existing combo product, the backend
              API must be updated to store and return combo_products data.
            </div>
          </div>
        )}

        {/* Add Product Dialog */}
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogTrigger asChild>
            <Button type="button" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Product to Combo
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Select Products</DialogTitle>
              <DialogDescription>Choose products to add to your combo package</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Products List */}
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {isLoading ? (
                  <div className="flex min-h-32 items-center justify-center">
                    <div className="text-sm text-muted-foreground">Loading products...</div>
                  </div>
                ) : availableProducts.length === 0 ? (
                  <div className="flex min-h-32 items-center justify-center">
                    <div className="text-center">
                      <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                      <div className="mt-2 text-sm text-muted-foreground">
                        {searchTerm ? 'No products found' : 'No available products'}
                      </div>
                    </div>
                  </div>
                ) : (
                  availableProducts.flatMap((product) => {
                    // For variable products with variants, show each variant separately
                    if (product.product_type === 'variable' && product.variants?.length) {
                      return product.variants
                        .filter((variant) => variant.is_active)
                        .map((variant) => {
                          const variantStock =
                            variant.total_stock ??
                            variant.stocks?.reduce((sum, s) => sum + (s.productStock ?? 0), 0) ??
                            0
                          const variantPrice = Number(
                            variant.effective_price ?? variant.price ?? getSalePrice(product)
                          )

                          return (
                            <div
                              key={`variant-${variant.id}`}
                              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                            >
                              <div className="flex-1">
                                <div className="font-medium">
                                  {product.productName}
                                  {variant.variant_name && (
                                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                                      • {variant.variant_name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {variant.sku && (
                                    <Badge variant="outline" className="mr-2">
                                      {variant.sku}
                                    </Badge>
                                  )}
                                  Stock: {variantStock} • Sale Price: ₹{variantPrice.toFixed(2)}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  handleAddProduct(product)
                                  setSearchTerm('')
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add
                              </Button>
                            </div>
                          )
                        })
                    }

                    // For simple products, show as before
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.productCode && (
                              <Badge variant="outline" className="mr-2">
                                {product.productCode}
                              </Badge>
                            )}
                            Stock: {getTotalStock(product)} • Sale Price: ₹
                            {getSalePrice(product).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleAddProduct(product)
                            setSearchTerm('')
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
