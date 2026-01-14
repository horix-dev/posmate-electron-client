import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { Product, Stock } from '@/types/api.types'
import { useCurrency } from '@/hooks'

export interface VariantEntry {
  variant_id: number
  variant_name: string
  quantity: number
  batch_no: string
  expire_date: string
  mfg_date: string
  purchase_price: number
  sale_price: number
  stock_id?: number
}

interface VariantBulkEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onAdd: (entries: VariantEntry[]) => void
}

export function VariantBulkEntryDialog({
  open,
  onOpenChange,
  product,
  onAdd,
}: VariantBulkEntryDialogProps) {
  const [entries, setEntries] = useState<Record<number, VariantEntry>>({})
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set())
  const [globalBatch, setGlobalBatch] = useState('')
  const [globalExpiry, setGlobalExpiry] = useState('')
  const [globalMfg, setGlobalMfg] = useState('')
  const { symbol: currencySymbol } = useCurrency()

  // Initialize entries when product changes
  useEffect(() => {
    if (product && product.variants && open) {
      const initialEntries: Record<number, VariantEntry> = {}
      const initialSelected = new Set<number>()

      product.variants.forEach((variant) => {
        // Find default stock info
        const stock = variant.stocks?.[0] as Stock | undefined

        initialEntries[variant.id] = {
          variant_id: variant.id,
          variant_name: variant.variant_name || `Variant #${variant.id}`,
          quantity: 0,
          batch_no: stock?.batch_no || '',
          expire_date: '',
          mfg_date: '',
          purchase_price: stock?.productPurchasePrice || product.productPurchasePrice || 0,
          sale_price: stock?.productSalePrice || 0,
          stock_id: stock?.id,
        }
      })

      setEntries(initialEntries)
      setSelectedVariants(initialSelected)
      setGlobalBatch('')
      setGlobalExpiry('')
      setGlobalMfg('')
    }
  }, [product, open])

  const handleEntryChange = (id: number, field: keyof VariantEntry, value: string | number) => {
    setEntries((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))

    // Auto-select if quantity > 0
    if (field === 'quantity') {
      const newSelected = new Set(selectedVariants)
      if (Number(value) > 0) {
        newSelected.add(id)
      } else if (Number(value) === 0) {
        newSelected.delete(id)
      }
      setSelectedVariants(newSelected)
    }
  }

  const handleApplyGlobal = () => {
    setEntries((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((key) => {
        const id = Number(key)
        if (selectedVariants.has(id)) {
          next[id] = {
            ...next[id],
            batch_no: globalBatch || next[id].batch_no,
            expire_date: globalExpiry || next[id].expire_date,
            mfg_date: globalMfg || next[id].mfg_date,
          }
        }
      })
      return next
    })
    toast.success('Applied to selected variants')
  }

  const handleAdd = () => {
    const variantsToAdd = Object.values(entries).filter(
      (e) => selectedVariants.has(e.variant_id) && e.quantity > 0
    )

    if (variantsToAdd.length === 0) {
      toast.error('Please select at least one variant with quantity')
      return
    }

    onAdd(variantsToAdd)
    onOpenChange(false)
  }

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedVariants)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedVariants(newSelected)
  }

  const toggleAll = () => {
    if (!product?.variants) return

    if (selectedVariants.size === product.variants.length) {
      setSelectedVariants(new Set())
    } else {
      setSelectedVariants(new Set(product.variants.map((v) => v.id)))
    }
  }

  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>Add Variants: {product.productName}</DialogTitle>
          <DialogDescription>Select variants and enter purchase details.</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 gap-4 rounded-lg bg-muted/50 p-4">
          <div className="grid flex-1 gap-2">
            <Label>Batch No</Label>
            <Input
              value={globalBatch}
              onChange={(e) => setGlobalBatch(e.target.value)}
              placeholder="Apply to all selected"
              className="h-8"
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={globalExpiry}
              onChange={(e) => setGlobalExpiry(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="grid flex-1 gap-2">
            <Label>Mfg Date</Label>
            <Input
              type="date"
              value={globalMfg}
              onChange={(e) => setGlobalMfg(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleApplyGlobal} variant="secondary">
              Apply to Selected
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-[300px] flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">
                  <Checkbox
                    checked={product.variants?.length === selectedVariants.size}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[100px]">Cost ({currencySymbol})</TableHead>
                <TableHead className="w-[100px]">Sale ({currencySymbol})</TableHead>
                <TableHead className="w-[100px]">Batch</TableHead>
                <TableHead className="w-[120px]">Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.variants?.map((variant) => {
                const entry = entries[variant.id]
                if (!entry) return null

                return (
                  <TableRow
                    key={variant.id}
                    className={selectedVariants.has(variant.id) ? 'bg-muted/30' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedVariants.has(variant.id)}
                        onCheckedChange={() => toggleSelection(variant.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{variant.variant_name}</span>
                        <span className="text-xs text-muted-foreground">{variant.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-full"
                        value={entry.quantity || ''}
                        onChange={(e) =>
                          handleEntryChange(variant.id, 'quantity', Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 w-full"
                        value={entry.purchase_price}
                        onChange={(e) =>
                          handleEntryChange(variant.id, 'purchase_price', Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="h-8 w-full"
                        value={entry.sale_price}
                        onChange={(e) =>
                          handleEntryChange(variant.id, 'sale_price', Number(e.target.value))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-full"
                        value={entry.batch_no}
                        onChange={(e) => handleEntryChange(variant.id, 'batch_no', e.target.value)}
                        placeholder="Batch"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="date"
                          className="h-7 w-full px-1 text-[10px]"
                          value={entry.expire_date}
                          onChange={(e) =>
                            handleEntryChange(variant.id, 'expire_date', e.target.value)
                          }
                          placeholder="Exp"
                          title="Expiry Date"
                        />
                        <Input
                          type="date"
                          className="h-7 w-full px-1 text-[10px]"
                          value={entry.mfg_date}
                          onChange={(e) =>
                            handleEntryChange(variant.id, 'mfg_date', e.target.value)
                          }
                          placeholder="Mfg"
                          title="Manufacturing Date"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="mt-6">
          <div className="flex w-full items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedVariants.size} variants selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd}>Confirm & Add</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
