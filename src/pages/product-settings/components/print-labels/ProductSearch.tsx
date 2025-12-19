import { useState, useEffect } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandInput, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { barcodesService, type SearchProductResult } from '@/api/services/barcodes.service'

interface SelectedProduct {
  product_id: number
  product_name: string
  product_code: string
  unit_price: number
  stock: number
  quantity: number
  batch_id: number | null
  packing_date: string | null
}

interface ProductSearchProps {
  onProductSelect: (product: SelectedProduct) => void
}

export function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<SearchProductResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setProducts([])
        return
      }

      setIsLoading(true)
      try {
        const resp = await barcodesService.searchProducts({ search: search.trim() })
        console.log('Search response:', resp)
        
        // API returns { message, data: [...] } where data is direct array
        const items = Array.isArray(resp.data) ? resp.data : []
        console.log('Products found:', items.length)
        
        setProducts(items)
      } catch (err) {
        console.error('Search error:', err)
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [search])

  const handleSelectProduct = async (product: SearchProductResult) => {
    try {
      // Fetch full product details including stock
      const detailResp = await barcodesService.getProductDetails(product.id)
      const detail = (detailResp as any)?.data || {}

      const selectedProduct: SelectedProduct = {
        product_id: product.id,
        product_name: product.productName,
        product_code: product.productCode,
        unit_price: product.productSalePrice ?? product.productDealerPrice ?? 0,
        stock: detail.total_available ?? product.productStock ?? 0,
        quantity: 1,
        batch_id: null,
        packing_date: null,
      }

      onProductSelect(selectedProduct)
      setSearch('')
      setOpen(false)
    } catch (err) {
      console.error('Failed to select product:', err)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {search || 'Search or choose a product'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search product name or code..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && <CommandEmpty>Searching...</CommandEmpty>}
            {!isLoading && products.length === 0 && search && (
              <CommandEmpty>No products found.</CommandEmpty>
            )}
            {!isLoading && products.length === 0 && !search && (
              <CommandEmpty>Type to search products</CommandEmpty>
            )}
            {!isLoading && products.length > 0 && (
              <CommandGroup>
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.productCode}
                    onSelect={() => handleSelectProduct(product)}
                  >
                    <div className="flex flex-1 items-center justify-between">
                      <div>
                        <div className="font-medium">{product.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          Code: {product.productCode}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          ₹{product.productSalePrice ?? product.productDealerPrice ?? 0}
                        </div>
                        <div className="text-muted-foreground">
                          Stock: {product.productStock}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default ProductSearch
