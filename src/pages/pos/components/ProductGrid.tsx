import { memo, useMemo, useState } from 'react'
import { Search, Package, Grid3X3, List, Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ProductCard } from './ProductCard'
import type { Product, Category, Stock } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface ProductGridProps {
  /** List of filtered products */
  products: Product[]
  /** Available categories */
  categories: Category[]
  /** Currently selected category ID */
  selectedCategoryId: number | null
  /** Search query */
  searchQuery: string
  /** Loading state */
  isLoading: boolean
  /** View mode - grid or list */
  viewMode: 'grid' | 'list'
  /** Category selection callback */
  onCategoryChange: (categoryId: number | null) => void
  /** Search change callback */
  onSearchChange: (query: string) => void
  /** Add to cart callback */
  onAddToCart: (product: Product, stock: Stock) => void
  /** Open variant selector for variable products */
  onSelectVariant?: (product: Product) => void
  /** View mode change callback */
  onViewModeChange: (mode: 'grid' | 'list') => void
}

// ============================================
// Sub-components
// ============================================

interface CategoryComboboxProps {
  categories: Category[]
  selectedCategoryId: number | null
  onCategoryChange: (categoryId: number | null) => void
}

const CategoryCombobox = memo(function CategoryCombobox({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[240px] justify-between"
        >
          {selectedCategory?.categoryName ?? 'All Categories'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search category..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all-categories"
                onSelect={() => {
                  onCategoryChange(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedCategoryId === null ? 'opacity-100' : 'opacity-0'
                  )}
                />
                All Categories
              </CommandItem>
              {categories.map((category) => {
                // Check if there are duplicate category names
                const duplicateCount = categories.filter(
                  (c) => c.categoryName === category.categoryName
                ).length
                const displayName =
                  duplicateCount > 1
                    ? `${category.categoryName} (ID: ${category.id})`
                    : category.categoryName

                return (
                  <CommandItem
                    key={category.id}
                    value={`category-${category.id}`}
                    keywords={[category.categoryName]}
                    onSelect={() => {
                      console.log('[CategoryCombobox] Selected category:', {
                        id: category.id,
                        name: category.categoryName,
                      })
                      onCategoryChange(category.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {displayName}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

interface SearchBarProps {
  searchQuery: string
  viewMode: 'grid' | 'list'
  onSearchChange: (query: string) => void
  onViewModeChange: (mode: 'grid' | 'list') => void
}

const SearchBar = memo(function SearchBar({
  searchQuery,
  viewMode,
  onSearchChange,
  onViewModeChange,
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search products or scan barcode..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          aria-label="Search products"
        />
      </div>
      <div className="flex items-center rounded-lg border bg-muted p-1">
        <Button
          variant={viewMode === 'grid' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
          className="h-8 w-8"
        >
          <Grid3X3 className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
          className="h-8 w-8"
        >
          <List className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
})

interface EmptyStateProps {
  searchQuery: string
  onClear: () => void
}

const EmptyState = memo(function EmptyState({ searchQuery, onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <Package className="mb-4 h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
      <h3 className="text-lg font-semibold">No products found</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        {searchQuery ? `No results for "${searchQuery}"` : 'No products in this category'}
      </p>
      {searchQuery && (
        <Button variant="outline" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function ProductGridComponent({
  products,
  categories,
  selectedCategoryId,
  searchQuery,
  isLoading,
  viewMode,
  onCategoryChange,
  onSearchChange,
  onAddToCart,
  onSelectVariant,
  onViewModeChange,
}: ProductGridProps) {
  const gridClassName = useMemo(
    () => cn('grid', viewMode === 'grid' ? 'grid-cols-4 gap-3' : 'grid-cols-1 gap-2'),
    [viewMode]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with Search and Category Filter */}
      <div className="flex items-center gap-3">
        <CategoryCombobox
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={onCategoryChange}
        />
        <SearchBar
          searchQuery={searchQuery}
          viewMode={viewMode}
          onSearchChange={onSearchChange}
          onViewModeChange={onViewModeChange}
        />
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading products" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState searchQuery={searchQuery} onClear={() => onSearchChange('')} />
        ) : (
          <div className={cn(gridClassName, 'pr-3')}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onSelectVariant={onSelectVariant}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

export const ProductGrid = memo(ProductGridComponent)

ProductGrid.displayName = 'ProductGrid'

export default ProductGrid
