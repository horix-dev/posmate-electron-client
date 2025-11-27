import { memo, useCallback } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, Brand } from '@/types/api.types'
import type { ProductFilters } from '../hooks'

// ============================================
// Types
// ============================================

export interface ProductFiltersBarProps {
  /** Current filter values */
  filters: ProductFilters
  /** Available categories for filtering */
  categories: Category[]
  /** Available brands for filtering */
  brands: Brand[]
  /** Callback when any filter changes */
  onFiltersChange: (filters: ProductFilters) => void
}

interface FilterPopoverContentProps {
  categories: Category[]
  brands: Brand[]
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  onClear: () => void
}

// ============================================
// Filter Popover Content
// ============================================

const FilterPopoverContent = memo(function FilterPopoverContent({
  categories,
  brands,
  filters,
  onFiltersChange,
  onClear,
}: FilterPopoverContentProps) {
  const hasFilters =
    filters.categoryId || filters.brandId || (filters.stockStatus && filters.stockStatus !== 'all')

  const handleCategoryChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, categoryId: value === 'all' ? '' : value })
    },
    [filters, onFiltersChange]
  )

  const handleBrandChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, brandId: value === 'all' ? '' : value })
    },
    [filters, onFiltersChange]
  )

  const handleStockChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        stockStatus: value as ProductFilters['stockStatus'],
      })
    },
    [filters, onFiltersChange]
  )

  return (
    <div className="w-72 space-y-4" role="group" aria-label="Product filters">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Filters</h4>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-auto px-2 py-1 text-xs"
            aria-label="Clear all filters"
          >
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="filter-category">Category</Label>
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger id="filter-category" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-brand">Brand</Label>
        <Select
          value={filters.brandId || 'all'}
          onValueChange={handleBrandChange}
        >
          <SelectTrigger id="filter-brand" aria-label="Filter by brand">
            <SelectValue placeholder="All brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id.toString()}>
                {brand.brandName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-stock">Stock Status</Label>
        <Select
          value={filters.stockStatus || 'all'}
          onValueChange={handleStockChange}
        >
          <SelectTrigger id="filter-stock" aria-label="Filter by stock status">
            <SelectValue placeholder="All stock levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock levels</SelectItem>
            <SelectItem value="in">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
})

// ============================================
// Main Component
// ============================================

function ProductFiltersBarComponent({
  filters,
  categories,
  brands,
  onFiltersChange,
}: ProductFiltersBarProps) {
  // Count active filters
  const activeFilterCount = [
    filters.categoryId,
    filters.brandId,
    filters.stockStatus && filters.stockStatus !== 'all' ? filters.stockStatus : null,
  ].filter(Boolean).length

  // Handle search change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ ...filters, search: e.target.value })
    },
    [filters, onFiltersChange]
  )

  // Clear search
  const handleClearSearch = useCallback(() => {
    onFiltersChange({ ...filters, search: '' })
  }, [filters, onFiltersChange])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      search: filters.search, // Keep search
      categoryId: '',
      brandId: '',
      stockStatus: 'all',
    })
  }, [filters.search, onFiltersChange])

  return (
    <div className="flex items-center gap-4" role="search" aria-label="Product search and filters">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search products by name or code..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-10 pr-8"
          aria-label="Search products"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Filter Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative" aria-label="Open filters">
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                aria-label={`${activeFilterCount} active filters`}
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-4">
          <FilterPopoverContent
            categories={categories}
            brands={brands}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClear={handleClearFilters}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const ProductFiltersBar = memo(ProductFiltersBarComponent)

ProductFiltersBar.displayName = 'ProductFiltersBar'

export default ProductFiltersBar
