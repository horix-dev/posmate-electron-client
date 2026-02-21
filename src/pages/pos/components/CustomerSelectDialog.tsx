import { memo, useState, useCallback, useMemo } from 'react'
import { Search, User, UserPlus, Check, X, Loader2, CreditCard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Party } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface CustomerSelectDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Close dialog callback */
  onClose: () => void
  /** Available customers */
  customers: Party[]
  /** Currently selected customer */
  selectedCustomer: Party | null
  /** Loading state */
  isLoading: boolean
  /** Loyalty lookup loading state */
  isLoyaltyLookupLoading?: boolean
  /** Customer selection callback */
  onSelect: (customer: Party | null) => void
  /** Loyalty lookup callback */
  onLoyaltyLookup?: (input: { phone?: string; card_code?: string }) => Promise<void>
}

// ============================================
// Sub-components
// ============================================

interface CustomerItemProps {
  customer: Party
  isSelected: boolean
  onClick: () => void
}

const CustomerItem = memo(function CustomerItem({
  customer,
  isSelected,
  onClick,
}: CustomerItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        'hover:bg-accent',
        isSelected && 'border-primary bg-primary/5'
      )}
      aria-pressed={isSelected}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{customer.name}</p>
        {customer.phone && (
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
        )}
        {customer.email && (
          <p className="truncate text-xs text-muted-foreground">
            {customer.email}
          </p>
        )}
      </div>
      {isSelected && (
        <Check className="h-5 w-5 text-primary" aria-hidden="true" />
      )}
    </button>
  )
})

interface WalkInButtonProps {
  isSelected: boolean
  onClick: () => void
}

const WalkInButton = memo(function WalkInButton({
  isSelected,
  onClick,
}: WalkInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-dashed p-3 text-left transition-colors',
        'hover:bg-accent',
        isSelected && 'border-primary bg-primary/5'
      )}
      aria-pressed={isSelected}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <UserPlus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="font-medium">Walk-in Customer</p>
        <p className="text-sm text-muted-foreground">No customer selected</p>
      </div>
      {isSelected && (
        <Check className="h-5 w-5 text-primary" aria-hidden="true" />
      )}
    </button>
  )
})

// ============================================
// Main Component
// ============================================

function CustomerSelectDialogComponent({
  open,
  onClose,
  customers,
  selectedCustomer,
  isLoading,
  isLoyaltyLookupLoading = false,
  onSelect,
  onLoyaltyLookup,
}: CustomerSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneLookup, setPhoneLookup] = useState('')
  const [cardLookup, setCardLookup] = useState('')

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers

    const query = searchQuery.toLowerCase()
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    )
  }, [customers, searchQuery])

  const handleSelect = useCallback(
    (customer: Party | null) => {
      onSelect(customer)
      onClose()
    },
    [onSelect, onClose]
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  const handleLookupByPhone = useCallback(async () => {
    const phone = phoneLookup.trim()
    if (!phone || !onLoyaltyLookup) return
    await onLoyaltyLookup({ phone })
  }, [onLoyaltyLookup, phoneLookup])

  const handleLookupByCard = useCallback(async () => {
    const card_code = cardLookup.trim()
    if (!card_code || !onLoyaltyLookup) return
    await onLoyaltyLookup({ card_code })
  }, [onLoyaltyLookup, cardLookup])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md"
        aria-describedby="customer-select-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" aria-hidden="true" />
            Select Customer
          </DialogTitle>
          <DialogDescription id="customer-select-description">
            Choose a customer or continue as walk-in
          </DialogDescription>
        </DialogHeader>

        {onLoyaltyLookup && (
          <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-950">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-700 dark:text-purple-300" />
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Loyalty Lookup
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                type="search"
                placeholder="Lookup by phone"
                value={phoneLookup}
                onChange={(e) => setPhoneLookup(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleLookupByPhone}
                disabled={isLoyaltyLookupLoading || !phoneLookup.trim()}
              >
                {isLoyaltyLookupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Find Phone
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                type="search"
                placeholder="Lookup by loyalty card"
                value={cardLookup}
                onChange={(e) => setCardLookup(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleLookupByCard}
                disabled={isLoyaltyLookupLoading || !cardLookup.trim()}
              >
                {isLoyaltyLookupLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Find Card
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
            aria-label="Search customers"
          />
        </div>

        {/* Customer List */}
        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-2 pr-4">
            {/* Walk-in Option */}
            <WalkInButton
              isSelected={!selectedCustomer}
              onClick={() => handleSelect(null)}
            />

            {/* Customer Items */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  className="h-6 w-6 animate-spin text-muted-foreground"
                  aria-label="Loading customers"
                />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No customers found' : 'No customers available'}
                </p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <CustomerItem
                  key={customer.id}
                  customer={customer}
                  isSelected={selectedCustomer?.id === customer.id}
                  onClick={() => handleSelect(customer)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const CustomerSelectDialog = memo(CustomerSelectDialogComponent)

CustomerSelectDialog.displayName = 'CustomerSelectDialog'

export default CustomerSelectDialog
