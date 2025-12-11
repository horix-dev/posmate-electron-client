/**
 * Variant Selection Dialog
 * 
 * Displays when a variable product is clicked in POS.
 * Allows user to select attribute values (Size, Color, etc.) and shows
 * the matching variant with stock and price information.
 */

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Package, Check, AlertTriangle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CachedImage } from '@/components/common/CachedImage'
import { cn, getImageUrl } from '@/lib/utils'
import type { Product, Stock } from '@/types/api.types'
import type { ProductVariant, Attribute } from '@/types/variant.types'

// ============================================
// Types
// ============================================

export interface VariantSelectionDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Callback to close dialog */
  onOpenChange: (open: boolean) => void
  /** Variable product to select variant from */
  product: Product
  /** Currency symbol for price display */
  currencySymbol: string
  /** Callback when variant is selected and added to cart */
  onSelectVariant: (product: Product, stock: Stock, variant: ProductVariant) => void
}

interface AttributeSelectorProps {
  attribute: Attribute
  selectedValueId: number | null
  onSelect: (valueId: number) => void
  availableValueIds: Set<number>
}

// ============================================
// Attribute Selector Components
// ============================================

/**
 * Button-style attribute selector (for Size, etc.)
 */
const ButtonAttributeSelector = memo(function ButtonAttributeSelector({
  attribute,
  selectedValueId,
  onSelect,
  availableValueIds,
}: AttributeSelectorProps) {
  const values = attribute.values?.filter((v) => v.is_active) ?? []

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{attribute.name}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isAvailable = availableValueIds.has(value.id)
          const isSelected = selectedValueId === value.id

          return (
            <Button
              key={value.id}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'min-w-[48px]',
                !isAvailable && 'opacity-50 cursor-not-allowed line-through'
              )}
              disabled={!isAvailable}
              onClick={() => onSelect(value.id)}
            >
              {value.value}
              {isSelected && <Check className="ml-1 h-3 w-3" />}
            </Button>
          )
        })}
      </div>
    </div>
  )
})

/**
 * Color swatch attribute selector
 */
const ColorAttributeSelector = memo(function ColorAttributeSelector({
  attribute,
  selectedValueId,
  onSelect,
  availableValueIds,
}: AttributeSelectorProps) {
  const values = attribute.values?.filter((v) => v.is_active) ?? []

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{attribute.name}</label>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const isAvailable = availableValueIds.has(value.id)
          const isSelected = selectedValueId === value.id
          const colorCode = value.color_code || '#808080'

          return (
            <button
              key={value.id}
              type="button"
              className={cn(
                'relative h-10 w-10 rounded-full border-2 transition-all',
                isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-muted hover:border-muted-foreground',
                !isAvailable && 'opacity-50 cursor-not-allowed'
              )}
              style={{ backgroundColor: colorCode }}
              disabled={!isAvailable}
              onClick={() => onSelect(value.id)}
              title={value.value}
              aria-label={`${value.value}${isSelected ? ' (selected)' : ''}`}
            >
              {isSelected && (
                <Check
                  className={cn(
                    'absolute inset-0 m-auto h-5 w-5',
                    // Use white check on dark colors, black on light
                    isLightColor(colorCode) ? 'text-gray-800' : 'text-white'
                  )}
                />
              )}
              {!isAvailable && (
                <X className="absolute inset-0 m-auto h-6 w-6 text-red-500" />
              )}
            </button>
          )
        })}
      </div>
      {/* Show selected color name */}
      {selectedValueId && (
        <p className="text-xs text-muted-foreground">
          Selected: {values.find((v) => v.id === selectedValueId)?.value}
        </p>
      )}
    </div>
  )
})

/**
 * Select dropdown attribute selector
 */
const SelectAttributeSelector = memo(function SelectAttributeSelector({
  attribute,
  selectedValueId,
  onSelect,
  availableValueIds,
}: AttributeSelectorProps) {
  const values = attribute.values?.filter((v) => v.is_active) ?? []

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{attribute.name}</label>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selectedValueId ?? ''}
        onChange={(e) => onSelect(Number(e.target.value))}
      >
        <option value="">Select {attribute.name}</option>
        {values.map((value) => {
          const isAvailable = availableValueIds.has(value.id)
          return (
            <option
              key={value.id}
              value={value.id}
              disabled={!isAvailable}
            >
              {value.value} {!isAvailable && '(Out of stock)'}
            </option>
          )
        })}
      </select>
    </div>
  )
})

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a color is light (for text contrast)
 */
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

/**
 * Get attributes from product
 */
function getProductAttributes(product: Product): Attribute[] {
  if (!product.attributes) return []
  return product.attributes
    .filter((pa) => pa.is_variation && pa.attribute)
    .map((pa) => pa.attribute!)
    .sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Get available attribute value IDs for a given attribute,
 * considering other selected attributes
 */
function getAvailableValueIds(
  attributeId: number,
  variants: ProductVariant[],
  selectedValues: Record<number, number>
): Set<number> {
  const available = new Set<number>()

  // Filter variants that match all OTHER selected attributes
  const otherSelectedEntries = Object.entries(selectedValues)
    .filter(([attrId]) => Number(attrId) !== attributeId)
    .map(([attrId, valId]) => [Number(attrId), valId] as [number, number])

  for (const variant of variants) {
    if (!variant.is_active) continue
    if ((variant.total_stock ?? 0) <= 0) continue

    // Check if variant matches all other selected attributes
    const matchesOthers = otherSelectedEntries.every(([attrId, valId]) => {
      const variantValue = variant.attribute_values?.find(
        (av) => av.attribute_id === attrId
      )
      return variantValue?.id === valId
    })

    if (matchesOthers) {
      // Find the value for this attribute in this variant
      const valueForAttr = variant.attribute_values?.find(
        (av) => av.attribute_id === attributeId
      )
      if (valueForAttr) {
        available.add(valueForAttr.id)
      }
    }
  }

  return available
}

/**
 * Find matching variant for selected attribute values
 */
function findMatchingVariant(
  variants: ProductVariant[],
  selectedValues: Record<number, number>
): ProductVariant | null {
  const selectedValueIds = new Set(Object.values(selectedValues))

  for (const variant of variants) {
    if (!variant.is_active) continue

    const variantValueIds = new Set(
      variant.attribute_values?.map((av) => av.id) ?? []
    )

    // Check if all selected values match this variant
    const allMatch = [...selectedValueIds].every((id) => variantValueIds.has(id))
    const sameSize = variantValueIds.size === selectedValueIds.size

    if (allMatch && sameSize) {
      return variant
    }
  }

  return null
}

// ============================================
// Main Component
// ============================================

function VariantSelectionDialogComponent({
  open,
  onOpenChange,
  product,
  currencySymbol,
  onSelectVariant,
}: VariantSelectionDialogProps) {
  // Selected attribute values: { attributeId: attributeValueId }
  const [selectedValues, setSelectedValues] = useState<Record<number, number>>({})

  // Get attributes and variants from product
  const attributes = useMemo(() => getProductAttributes(product), [product])
  const variants = useMemo(() => product.variants ?? [], [product.variants])

  // Find matching variant based on selections
  const matchedVariant = useMemo(
    () => findMatchingVariant(variants, selectedValues),
    [variants, selectedValues]
  )

  // Check if all attributes are selected
  const allAttributesSelected = attributes.length > 0 && 
    attributes.every((attr) => selectedValues[attr.id] !== undefined)

  // Reset selections when dialog opens with new product
  useEffect(() => {
    if (open) {
      setSelectedValues({})
    }
  }, [open, product.id])

  // Handle attribute value selection
  const handleSelectValue = useCallback((attributeId: number, valueId: number) => {
    setSelectedValues((prev) => ({
      ...prev,
      [attributeId]: valueId,
    }))
  }, [])

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (!matchedVariant) return

    // Get stock for this variant
    const stock = matchedVariant.stocks?.[0] ?? product.stocks?.[0]
    if (!stock) return

    // Call parent callback
    onSelectVariant(product, stock, matchedVariant)
    onOpenChange(false)
  }, [matchedVariant, product, onSelectVariant, onOpenChange])

  // Get variant info for display
  const variantStock = matchedVariant?.total_stock ?? 0
  const variantPrice = matchedVariant?.effective_price ?? matchedVariant?.price ?? 
    product.stocks?.[0]?.productSalePrice ?? 0
  const isOutOfStock = variantStock <= 0
  const isLowStock = variantStock > 0 && variantStock <= (product.alert_qty ?? 5)

  // Get image (variant image or product image)
  const imageUrl = getImageUrl(matchedVariant?.image ?? product.productPicture)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8">{product.productName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Image */}
          <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-lg bg-muted">
            {imageUrl ? (
              <CachedImage
                src={imageUrl}
                alt={product.productName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
          </div>

          <Separator />

          {/* Attribute Selectors */}
          <div className="space-y-4">
            {attributes.map((attribute) => {
              // Get available values considering other selections
              const availableValueIds = getAvailableValueIds(
                attribute.id,
                variants,
                selectedValues
              )

              const SelectorComponent =
                attribute.type === 'color'
                  ? ColorAttributeSelector
                  : attribute.type === 'select'
                  ? SelectAttributeSelector
                  : ButtonAttributeSelector

              return (
                <SelectorComponent
                  key={attribute.id}
                  attribute={attribute}
                  selectedValueId={selectedValues[attribute.id] ?? null}
                  onSelect={(valueId) => handleSelectValue(attribute.id, valueId)}
                  availableValueIds={availableValueIds}
                />
              )
            })}
          </div>

          {/* Selected Variant Info */}
          {matchedVariant && (
            <>
              <Separator />
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SKU</span>
                  <span className="text-sm font-mono">{matchedVariant.sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-lg font-bold text-primary">
                    {currencySymbol}{variantPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stock</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{variantStock} units</span>
                    {isLowStock && (
                      <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Low
                      </Badge>
                    )}
                    {isOutOfStock && (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Selection prompt if not all selected */}
          {!allAttributesSelected && attributes.length > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Please select all options to continue
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={!matchedVariant || isOutOfStock}
          >
            {`Add to Cart - ${currencySymbol}${variantPrice.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const VariantSelectionDialog = memo(VariantSelectionDialogComponent)

VariantSelectionDialog.displayName = 'VariantSelectionDialog'

export default VariantSelectionDialog
