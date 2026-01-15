import { useState, useEffect, memo } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { productsService } from '@/api/services'
import type { Product } from '@/types/api.types'
import type { ProductVariant } from '@/types/variant.types'

// ============================================
// Types
// ============================================

export interface ProductLookupProps {
  /** Callback when a product or variant is selected */
  onSelect: (product: Product, variant?: ProductVariant) => void
  /** IDs of products to exclude from results */
  excludeIds?: number[]
  /** Custom placeholder text */
  placeholder?: string
  /** Custom button text */
  buttonText?: string
  /** Width of the popover */
  width?: string
  /** Whether to show variant options for variable products */
  showVariants?: boolean
  /** Whether to show product type in the list */
  showProductType?: boolean
  /** Whether to show stock information */
  showStock?: boolean
  /** Custom className for the button */
  className?: string
  /** Whether to show toast on error */
  showErrorToast?: boolean
  /** Maximum number of results to display */
  maxResults?: number
}

interface SearchItem {
  id: string
  product: Product
  variant?: ProductVariant
  label: string
  subLabel: string
}

// ============================================
// Component
// ============================================

export const ProductLookup = memo(function ProductLookup({
  onSelect,
  excludeIds = [],
  placeholder = 'Search by name, code, or variant...',
  buttonText = 'Search and add product...',
  width = 'w-[500px]',
  showVariants = true,
  showProductType = true,
  showStock = true,
  className,
  showErrorToast = true,
  maxResults = 50,
}: ProductLookupProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      if (!search.trim() && products.length === 0) {
        setIsLoading(true)
        try {
          const response = await productsService.getList({ limit: 1000 })
          const data = response?.data
          if (Array.isArray(data)) {
            setProducts(data)
          } else if (data && typeof data === 'object' && 'data' in data) {
            const items = (data as Record<string, unknown>).data as Product[]
            setProducts(items)
          }
        } catch (error) {
          console.error('Failed to fetch products:', error)
          if (showErrorToast) {
            toast.error('Failed to load products')
          }
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchProducts()
  }, [products.length, search, showErrorToast])

  // Build search items (flatten products + variants)
  const searchItems: SearchItem[] = products
    .filter((product) => !excludeIds.includes(product.id))
    .flatMap((product) => {
      const items: SearchItem[] = []

      // Calculate main product stock
      const mainProductStock = showStock
        ? product.product_type === 'variable'
          ? (product.variants_total_stock ?? 0)
          : (product.stocks_sum_product_stock ?? product.productStock ?? 0)
        : 0

      // Build main product sub-label
      const subLabelParts = [`Code: ${product.productCode || 'N/A'}`]
      if (showProductType) subLabelParts.push(product.product_type || 'simple')
      if (showStock) subLabelParts.push(`Stock: ${mainProductStock}`)

      // Always add the main product
      items.push({
        id: `p-${product.id}`,
        product,
        label: product.productName,
        subLabel: subLabelParts.join(' | '),
      })

      // Add variants if enabled and available
      if (showVariants && product.product_type === 'variable' && product.variants) {
        product.variants.forEach((variant) => {
          const variantDisplayName = variant.variant_name || variant.sku || `Variant ${variant.id}`
          const variantStock = variant.total_stock ?? variant.stocks?.[0]?.productStock ?? 0

          items.push({
            id: `v-${variant.id}`,
            product,
            variant,
            label: `${product.productName} - ${variantDisplayName}`,
            subLabel: `SKU: ${variant.sku}${showStock ? ` | Stock: ${variantStock}` : ''}`,
          })
        })
      }

      return items
    })

  // Filter by search query
  const filteredItems = searchItems.filter((item) => {
    const searchLower = search.toLowerCase()
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.subLabel.toLowerCase().includes(searchLower)
    )
  })

  // Limit results for performance
  const displayItems = filteredItems.slice(0, maxResults)

  const handleSelect = (item: SearchItem) => {
    onSelect(item.product, item.variant)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={className || 'w-full justify-start'}>
          <Search className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${width} p-0`} align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Loading...' : 'No products found.'}</CommandEmpty>
            <CommandGroup>
              {displayItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label}-${item.id}`}
                  onSelect={() => handleSelect(item)}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.subLabel}</span>
                  </div>
                  {item.variant && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Variant
                    </Badge>
                  )}
                  {!item.variant && item.product.product_type === 'variable' && showVariants && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Bulk Add
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})
