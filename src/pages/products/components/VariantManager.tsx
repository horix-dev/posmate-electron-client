/**
 * Variant Manager Component
 *
 * Manages product variants in the product form:
 * - Select attributes for the product
 * - Select attribute values to create variations
 * - Generate variants locally from combinations
 * - Edit variant details (SKU, prices)
 * - Pass variants to parent form for single API submission
 *
 * Updated: Dec 2024 - Now handles variants locally and submits with product
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  Trash2,
  RefreshCw,
  Package,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Loader2,
  Plus,
  Barcode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useCurrency } from '@/hooks'
import { toast } from 'sonner'
import type { Attribute, AttributeValue } from '@/types/variant.types'
import type { Product } from '@/types/api.types'
import type { VariantInputData } from '../schemas/product.schema'

export interface VariantManagerProps {
  product: Product | null
  attributes: Attribute[]
  attributesLoading: boolean
  variants: VariantInputData[]
  onVariantsChange: (variants: VariantInputData[]) => void
  isEditMode?: boolean
}

interface AttributeSelectorProps {
  attribute: Attribute
  selectedValueIds: number[]
  onToggleValue: (valueId: number) => void
  onSelectAll: (attributeId: number, valueIds: number[]) => void
  onDeselectAll: (attributeId: number) => void
  disabled?: boolean
}

const AttributeSelector = memo(function AttributeSelector({
  attribute,
  selectedValueIds,
  onToggleValue,
  onSelectAll,
  onDeselectAll,
  disabled,
}: AttributeSelectorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const values = attribute.values?.filter((v) => v.is_active) ?? []
  const allSelected = selectedValueIds.length === values.length && values.length > 0

  const handleSelectAllClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (allSelected) {
      onDeselectAll(attribute.id)
    } else {
      onSelectAll(
        attribute.id,
        values.map((v) => v.id)
      )
    }
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" type="button">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <span className="font-medium">{attribute.name}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedValueIds.length} / {values.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSelectAllClick}
          disabled={disabled || values.length === 0}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>
      <CollapsibleContent>
        <div className="mt-2 flex flex-wrap gap-2 pl-8">
          {values.map((value) => {
            const isSelected = selectedValueIds.includes(value.id)
            return (
              <button
                key={value.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onToggleValue(value.id)
                }}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted hover:border-muted-foreground',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {attribute.type === 'color' && value.color_code && (
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ backgroundColor: value.color_code }}
                  />
                )}
                <span>{value.value}</span>
                {isSelected && <Check className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
})

interface VariantTableProps {
  variants: VariantInputData[]
  attributes: Attribute[]
  onUpdateVariant: (index: number, updates: Partial<VariantInputData>) => void
  onDeleteVariant: (index: number) => void
  isEditMode?: boolean
}

const VariantTable = memo(function VariantTable({
  variants,
  attributes,
  onUpdateVariant,
  onDeleteVariant,
  isEditMode = false,
}: VariantTableProps) {
  const { symbol: currencySymbol } = useCurrency()
  const valueMap = useMemo(() => {
    const map = new Map<number, { value: string; attributeName: string; colorCode?: string }>()
    attributes.forEach((attr) => {
      attr.values?.forEach((val) => {
        map.set(val.id, {
          value: val.value,
          attributeName: attr.name,
          colorCode: val.color_code || undefined,
        })
      })
    })
    return map
  }, [attributes])

  // Check for duplicate SKUs
  const duplicateSkus = useMemo(() => {
    const skuCounts = new Map<string, number[]>()
    variants.forEach((variant, index) => {
      const sku = variant.sku?.trim().toUpperCase()
      if (sku) {
        const indices = skuCounts.get(sku) || []
        indices.push(index)
        skuCounts.set(sku, indices)
      }
    })
    // Return Set of indices that have duplicate SKUs
    const duplicates = new Set<number>()
    skuCounts.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((idx) => duplicates.add(idx))
      }
    })
    return duplicates
  }, [variants])

  if (variants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/50 py-8 text-center text-muted-foreground">
        <Package className="mb-2 h-8 w-8 opacity-50" />
        <p className="font-medium">No variants generated yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Select attribute values above and click "Generate Variants"
        </p>
      </div>
    )
  }

  return (
    <div className="max-h-[500px] overflow-auto rounded-md border shadow-sm">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50px] bg-muted/50">Active</TableHead>
            <TableHead className="w-[15%] min-w-[120px] bg-muted/50">Variant</TableHead>
            <TableHead className="min-w-[160px] bg-muted/50">SKU</TableHead>
            <TableHead className="min-w-[160px] bg-muted/50">Barcode</TableHead>
            {!isEditMode && (
              <TableHead className="min-w-[100px] bg-muted/50 text-right">Stock</TableHead>
            )}
            <TableHead className="min-w-[100px] bg-muted/50 text-right">
              Cost ({currencySymbol})
            </TableHead>
            <TableHead className="min-w-[100px] bg-muted/50 text-right">
              Price ({currencySymbol})
            </TableHead>
            <TableHead className="min-w-[100px] bg-muted/50 text-right">
              Dealer ({currencySymbol})
            </TableHead>
            <TableHead className="min-w-[100px] bg-muted/50 text-right">
              Wholesale ({currencySymbol})
            </TableHead>
            <TableHead className="w-[60px] bg-muted/50">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((variant, index) => (
            <TableRow
              key={index}
              className={cn(variant.is_active === 0 && 'bg-muted/30 opacity-60')}
            >
              <TableCell>
                <Switch
                  checked={variant.is_active === 1}
                  onCheckedChange={(checked) =>
                    onUpdateVariant(index, { is_active: checked ? 1 : 0 })
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  {variant.attribute_value_ids.map((valueId) => {
                    const info = valueMap.get(valueId)
                    return (
                      <Badge
                        key={valueId}
                        variant="secondary"
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs hover:bg-muted"
                      >
                        {info?.colorCode && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground/20"
                            style={{ backgroundColor: info.colorCode }}
                          />
                        )}
                        {info?.value || valueId}
                      </Badge>
                    )
                  })}
                  {variant.attribute_value_ids.length === 0 && (
                    <span className="text-sm italic text-muted-foreground">Base product</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Input
                    value={variant.sku || ''}
                    onChange={(e) => onUpdateVariant(index, { sku: e.target.value })}
                    placeholder="Auto-generated"
                    className={cn(
                      'h-8 font-mono text-xs',
                      duplicateSkus.has(index) &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                  {duplicateSkus.has(index) && (
                    <p className="flex items-center gap-1 text-[10px] text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Duplicate SKU
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="relative">
                  <Input
                    value={variant.barcode || ''}
                    onChange={(e) => onUpdateVariant(index, { barcode: e.target.value })}
                    placeholder="Start scanning..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                    className="h-8 pl-7 font-mono text-xs"
                  />
                  <Barcode className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                </div>
              </TableCell>
              {!isEditMode && (
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={variant.initial_stock ?? ''}
                    onChange={(e) =>
                      onUpdateVariant(index, {
                        initial_stock: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder="0"
                    className="h-8 text-right text-sm"
                  />
                </TableCell>
              )}
              <TableCell>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.cost_price ?? ''}
                  onChange={(e) =>
                    onUpdateVariant(index, {
                      cost_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  className="h-8 text-right text-sm"
                />
              </TableCell>
              <TableCell>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price ?? ''}
                  onChange={(e) =>
                    onUpdateVariant(index, {
                      price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  className="h-8 text-right text-sm"
                />
              </TableCell>
              <TableCell>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.dealer_price ?? ''}
                  onChange={(e) =>
                    onUpdateVariant(index, {
                      dealer_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  className="h-8 text-right text-sm"
                />
              </TableCell>
              <TableCell>
                <CurrencyInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.wholesale_price ?? ''}
                  onChange={(e) =>
                    onUpdateVariant(index, {
                      wholesale_price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="0.00"
                  className="h-8 text-right text-sm"
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteVariant(index)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
})

function generateCombinations(arrays: number[][]): number[][] {
  if (arrays.length === 0) return []
  if (arrays.length === 1) return arrays[0].map((v) => [v])
  return arrays.reduce<number[][]>((acc, array) => {
    if (acc.length === 0) return array.map((v) => [v])
    const result: number[][] = []
    acc.forEach((combination) => {
      array.forEach((value) => {
        result.push([...combination, value])
      })
    })
    return result
  }, [])
}

function generateSku(
  productName: string,
  productCode: string,
  attributeValueIds: number[],
  valueMap: Map<number, AttributeValue>
): string {
  const cleanedName = (productName || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const cleanedCode = (productCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const prefix = (cleanedName || cleanedCode || 'PROD').slice(0, 3)

  const parts = [prefix]
  attributeValueIds.forEach((id) => {
    const value = valueMap.get(id)
    if (value) {
      parts.push(value.slug?.toUpperCase() || value.value.substring(0, 3).toUpperCase())
    }
  })

  // Add random 4-digit number for uniqueness
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  parts.push(randomSuffix.toString())

  return parts.join('-')
}

function getSkuPrefix(productName: string, productCode: string): string {
  const cleanedName = (productName || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const cleanedCode = (productCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (cleanedName || cleanedCode || 'PROD').slice(0, 3)
}

function VariantManagerComponent({
  product,
  attributes,
  attributesLoading,
  variants,
  onVariantsChange,
  isEditMode = false,
}: VariantManagerProps) {
  const [selectedValues, setSelectedValues] = useState<Map<number, Set<number>>>(new Map())
  const [loadedProductId, setLoadedProductId] = useState<number | null>(null)
  const initialLoadDone = useRef(false)
  const [bulkCostPrice, setBulkCostPrice] = useState<string>('')
  const [bulkSalePrice, setBulkSalePrice] = useState<string>('')
  const [bulkStock, setBulkStock] = useState<string>('')

  // DEBUG: Log isEditMode
  useEffect(() => {
    console.log('[VariantManager] isEditMode:', isEditMode, 'variants.length:', variants.length)
  }, [isEditMode, variants.length])

  const valueMap = useMemo(() => {
    const map = new Map<number, AttributeValue>()
    attributes.forEach((attr) => {
      attr.values?.forEach((val) => map.set(val.id, val))
    })
    return map
  }, [attributes])

  useEffect(() => {
    if (product?.id && product.id !== loadedProductId) {
      setLoadedProductId(product.id)
      initialLoadDone.current = true
      if (product.variants && product.variants.length > 0) {
        const newSelectedValues = new Map<number, Set<number>>()
        product.variants.forEach((variant) => {
          variant.attribute_values?.forEach((av) => {
            if (!newSelectedValues.has(av.attribute_id)) {
              newSelectedValues.set(av.attribute_id, new Set())
            }
            newSelectedValues.get(av.attribute_id)!.add(av.id)
          })
        })
        setSelectedValues(newSelectedValues)
      }
    } else if (!product?.id && loadedProductId !== null) {
      setLoadedProductId(null)
      setSelectedValues(new Map())
      initialLoadDone.current = false
    }
  }, [product?.id, product?.variants, loadedProductId])

  const handleToggleValue = useCallback((attributeId: number, valueId: number) => {
    setSelectedValues((prev) => {
      const newMap = new Map(prev)
      const attrValues = new Set(newMap.get(attributeId) ?? [])
      if (attrValues.has(valueId)) {
        attrValues.delete(valueId)
      } else {
        attrValues.add(valueId)
      }
      if (attrValues.size === 0) {
        newMap.delete(attributeId)
      } else {
        newMap.set(attributeId, attrValues)
      }
      return newMap
    })
  }, [])

  const handleSelectAll = useCallback((attributeId: number, valueIds: number[]) => {
    setSelectedValues((prev) => {
      const newMap = new Map(prev)
      newMap.set(attributeId, new Set(valueIds))
      return newMap
    })
  }, [])

  const handleDeselectAll = useCallback((attributeId: number) => {
    setSelectedValues((prev) => {
      const newMap = new Map(prev)
      newMap.delete(attributeId)
      return newMap
    })
  }, [])

  const expectedVariantCount = useMemo(() => {
    let count = 1
    selectedValues.forEach((values) => {
      if (values.size > 0) count *= values.size
    })
    return selectedValues.size > 0 ? count : 0
  }, [selectedValues])

  // Auto-fix placeholder SKUs once product name/code is available
  useEffect(() => {
    if (variants.length === 0) return
    const productName = product?.productName || ''
    const productCode = product?.productCode || ''
    const desiredPrefix = getSkuPrefix(productName, productCode)

    // If we still don't have a real prefix, nothing to fix
    if (!desiredPrefix || desiredPrefix === 'PRO') return

    const updated = variants.map((variant) => {
      const sku = (variant.sku || '').trim().toUpperCase()

      // Regenerate only obvious placeholders or empty SKUs.
      // Note: older placeholder default produced "PRO-..." (from PROD -> PRO).
      const isPlaceholder =
        sku === '' ||
        sku === 'PROD' ||
        sku === 'PRO' ||
        sku.startsWith('PROD-') ||
        sku.startsWith('PRO-')

      if (!isPlaceholder) return variant
      if (sku.startsWith(`${desiredPrefix}-`)) return variant

      return {
        ...variant,
        sku: generateSku(productName, productCode, variant.attribute_value_ids, valueMap),
      }
    })

    const changed = updated.some((v, idx) => v.sku !== variants[idx]?.sku)
    if (changed) onVariantsChange(updated)
  }, [product?.productName, product?.productCode, variants, valueMap, onVariantsChange])

  const handleGenerateVariants = useCallback(() => {
    if (selectedValues.size === 0) {
      toast.error('Please select at least one attribute value')
      return
    }
    const arrays: number[][] = []
    selectedValues.forEach((values) => {
      if (values.size > 0) arrays.push(Array.from(values))
    })
    if (arrays.length === 0) {
      toast.error('No attribute values selected')
      return
    }
    const combinations = generateCombinations(arrays)
    const existingSignatures = new Set(
      variants.map((v) => [...v.attribute_value_ids].sort().join('-'))
    )
    const productName = product?.productName || ''
    const productCode = product?.productCode || ''
    const desiredPrefix = getSkuPrefix(productName, productCode)

    const updatedExistingVariants = variants.map((variant) => {
      const sku = (variant.sku || '').trim().toUpperCase()
      const shouldRegenerateSku =
        sku === '' ||
        sku === 'PROD' ||
        sku === 'PRO' ||
        sku.startsWith('PROD-') ||
        sku.startsWith('PRO-')
      if (!shouldRegenerateSku) return variant
      if (sku.startsWith(`${desiredPrefix}-`)) return variant
      return {
        ...variant,
        sku: generateSku(productName, productCode, variant.attribute_value_ids, valueMap),
      }
    })
    const existingSkusChanged = updatedExistingVariants.some(
      (v, idx) => v.sku !== variants[idx]?.sku
    )

    const newVariants: VariantInputData[] = combinations
      .filter((combo) => !existingSignatures.has([...combo].sort().join('-')))
      .map((combo) => ({
        sku: generateSku(productName, productCode, combo, valueMap),
        enabled: 1 as const,
        initial_stock: 0,
        cost_price: 0,
        price: 0,
        dealer_price: 0,
        wholesale_price: 0,
        is_active: 1 as const,
        attribute_value_ids: combo,
      }))
    if (newVariants.length === 0) {
      if (existingSkusChanged) {
        onVariantsChange(updatedExistingVariants)
        toast.success('Updated variant SKUs')
      } else {
        toast.info('All combinations already exist')
      }
      return
    }
    onVariantsChange([...updatedExistingVariants, ...newVariants])
    toast.success(
      `Generated ${newVariants.length} new variant${newVariants.length !== 1 ? 's' : ''}`
    )
  }, [
    selectedValues,
    variants,
    product?.productName,
    product?.productCode,
    valueMap,
    onVariantsChange,
  ])

  const handleUpdateVariant = useCallback(
    (index: number, updates: Partial<VariantInputData>) => {
      const newVariants = [...variants]
      newVariants[index] = { ...newVariants[index], ...updates }
      onVariantsChange(newVariants)
    },
    [variants, onVariantsChange]
  )

  const handleDeleteVariant = useCallback(
    (index: number) => {
      onVariantsChange(variants.filter((_, i) => i !== index))
      toast.success('Variant removed')
    },
    [variants, onVariantsChange]
  )

  const handleApplyDefaultPrices = useCallback(() => {
    if (!bulkCostPrice && !bulkSalePrice && !bulkStock) {
      toast.error('Enter cost, price, or stock to apply')
      return
    }

    const parsedCost = bulkCostPrice ? parseFloat(bulkCostPrice) : undefined
    const parsedPrice = bulkSalePrice ? parseFloat(bulkSalePrice) : undefined
    const parsedStock = bulkStock ? parseInt(bulkStock, 10) : undefined

    onVariantsChange(
      variants.map((v) => ({
        ...v,
        cost_price: parsedCost !== undefined ? parsedCost : v.cost_price,
        price: parsedPrice !== undefined ? parsedPrice : v.price,
        initial_stock: parsedStock !== undefined ? parsedStock : v.initial_stock,
      }))
    )
    toast.success('Applied to all variants')
  }, [variants, bulkCostPrice, bulkSalePrice, bulkStock, onVariantsChange])

  const handleClearAllVariants = useCallback(() => {
    if (variants.length === 0) return
    if (!confirm('Are you sure you want to remove all variants?')) return
    onVariantsChange([])
    toast.success('All variants removed')
  }, [variants.length, onVariantsChange])

  const availableAttributes = useMemo(() => {
    return attributes.filter((attr) => attr.is_active && attr.values?.some((v) => v.is_active))
  }, [attributes])

  if (attributesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (availableAttributes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No attributes available. Create attributes in Settings - Product Attributes before adding
          variants.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Variations</CardTitle>
          <CardDescription>Choose which attribute values to create variations for</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {availableAttributes.map((attribute) => (
              <AttributeSelector
                key={attribute.id}
                attribute={attribute}
                selectedValueIds={Array.from(selectedValues.get(attribute.id) ?? [])}
                onToggleValue={(valueId) => handleToggleValue(attribute.id, valueId)}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <div className="text-sm text-muted-foreground">
              {expectedVariantCount > 0 ? (
                <span>
                  Will create up to <strong>{expectedVariantCount}</strong> variant
                  {expectedVariantCount !== 1 ? 's' : ''}
                </span>
              ) : (
                'Select attribute values to generate variants'
              )}
            </div>
            <Button
              type="button"
              onClick={handleGenerateVariants}
              disabled={expectedVariantCount === 0}
              size="sm"
            >
              {variants.length > 0 ? (
                <Plus className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {variants.length > 0 ? 'Add More Variants' : 'Generate Variants'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-medium">
            Variants
            <Badge variant="secondary" className="ml-1">
              {variants.length}
            </Badge>
          </h3>
          {variants.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAllVariants}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Clear All Rules
            </Button>
          )}
        </div>

        {variants.length > 0 && (
          <div className="mb-4 flex items-center gap-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-4 dark:bg-primary/10">
            <div className="mr-2 flex h-6 items-center gap-2 border-r border-primary/20 pr-4 text-sm font-semibold text-primary">
              Bulk Edit:
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isEditMode && (
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock"
                  className="h-9 w-24 bg-background text-right"
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                />
              )}
              <CurrencyInput
                type="number"
                min="0"
                step="0.01"
                placeholder="Cost Price"
                className="h-9 w-32 bg-background"
                value={bulkCostPrice}
                onChange={(e) => setBulkCostPrice(e.target.value)}
              />
              <CurrencyInput
                type="number"
                min="0"
                step="0.01"
                placeholder="Sale Price"
                className="h-9 w-32 bg-background"
                value={bulkSalePrice}
                onChange={(e) => setBulkSalePrice(e.target.value)}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleApplyDefaultPrices}
              >
                Apply to All
              </Button>
            </div>
          </div>
        )}

        <VariantTable
          variants={variants}
          attributes={attributes}
          onUpdateVariant={handleUpdateVariant}
          onDeleteVariant={handleDeleteVariant}
          isEditMode={isEditMode}
        />
      </div>

      {variants.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Variants will be created when you save the product. You can edit SKU and prices inline
            above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export const VariantManager = memo(VariantManagerComponent)
VariantManager.displayName = 'VariantManager'
export default VariantManager
