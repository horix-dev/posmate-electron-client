import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'

interface SelectedProduct {
  product_id: number
  product_name: string
  product_code: string
  barcode?: string
  variant_name?: string
  unit_price?: number
  stock?: number
  quantity: number
  batch_id?: number | null
  packing_date?: string | null
}

interface SelectedProductsTableProps {
  products: SelectedProduct[]
  onRemove: (productId: number) => void
  onUpdateQuantity: (productId: number, quantity: number) => void
  onUpdatePackingDate: (productId: number, date: string | null) => void
}

export function SelectedProductsTable({
  products,
  onRemove,
  onUpdateQuantity,
  onUpdatePackingDate,
}: SelectedProductsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px] font-semibold text-foreground">Items</TableHead>
            <TableHead className="font-semibold text-foreground">Barcode</TableHead>
            <TableHead className="font-semibold text-foreground">Batch</TableHead>
            <TableHead className="font-semibold text-foreground">Available Stock</TableHead>
            <TableHead className="font-semibold text-foreground">Qty / No Of Label</TableHead>
            <TableHead className="font-semibold text-foreground">Packing Date</TableHead>
            <TableHead className="font-semibold text-foreground text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.product_id}>
              <TableCell className="font-medium align-middle">{product.product_name}</TableCell>
              <TableCell className="text-sm text-muted-foreground align-middle font-mono">{product.barcode || product.product_code}</TableCell>
              <TableCell className="align-middle">{product.batch_id || '-'}</TableCell>
              <TableCell className="align-middle">{product.stock || 0}</TableCell>
              <TableCell className="align-middle">
                <Input
                  type="number"
                  min="1"
                  value={product.quantity}
                  onChange={(e) => onUpdateQuantity(product.product_id, parseInt(e.target.value) || 1)}
                  className="w-20 h-8"
                />
              </TableCell>
              <TableCell className="align-middle">
                <Input
                  type="date"
                  value={product.packing_date || ''}
                  onChange={(e) => onUpdatePackingDate(product.product_id, e.target.value || null)}
                  className="w-36 h-8"
                />
              </TableCell>
              <TableCell className="text-right align-middle">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(product.product_id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
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
}
