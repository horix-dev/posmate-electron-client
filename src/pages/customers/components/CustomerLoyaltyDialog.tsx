import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCcw, Ticket, History } from 'lucide-react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loyaltyService } from '@/api/services/loyalty.service'
import { useAuthStore } from '@/stores'
import { getApiErrorMessage } from '@/api/axios'
import type { Party, LoyaltyTransaction } from '@/types/api.types'

export interface CustomerLoyaltyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Party | null
  onCustomerRefresh?: () => Promise<void> | void
}

function getTypeBadgeVariant(type: LoyaltyTransaction['type']) {
  if (type === 'earn') return 'success'
  if (type === 'redeem') return 'warning'
  if (type === 'reverse') return 'secondary'
  return 'outline'
}

export function CustomerLoyaltyDialog({
  open,
  onOpenChange,
  customer,
  onCustomerRefresh,
}: CustomerLoyaltyDialogProps) {
  const user = useAuthStore((state) => state.user)
  const isShopOwner = user?.role === 'shop-owner'

  const [manualCardCode, setManualCardCode] = useState('')
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false)
  const [isAssigningCard, setIsAssigningCard] = useState(false)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<
    'all' | 'earn' | 'redeem' | 'reverse' | 'adjustment'
  >('all')

  const canPaginatePrev = currentPage > 1
  const canPaginateNext = currentPage < lastPage

  const filteredTransactions = useMemo(() => {
    if (transactionTypeFilter === 'all') {
      return transactions
    }
    return transactions.filter((transaction) => transaction.type === transactionTypeFilter)
  }, [transactionTypeFilter, transactions])

  const transactionSummary = useMemo(() => {
    const summary = {
      total: filteredTransactions.length,
      earnPoints: 0,
      redeemedPoints: 0,
      netPoints: 0,
    }

    for (const transaction of filteredTransactions) {
      if (transaction.type === 'earn' && transaction.points > 0) {
        summary.earnPoints += transaction.points
      }

      if (transaction.type === 'redeem') {
        summary.redeemedPoints += Math.abs(transaction.points)
      }

      summary.netPoints += transaction.points
    }

    return summary
  }, [filteredTransactions])

  const title = useMemo(() => {
    if (!customer) return 'Customer Loyalty'
    return `Loyalty · ${customer.name}`
  }, [customer])

  const loadTransactions = useCallback(async () => {
    if (!customer) return

    setIsTransactionsLoading(true)
    try {
      const response = await loyaltyService.getTransactions(customer.id, {
        page: currentPage,
        per_page: 20,
      })
      setTransactions(response.data)
      setLastPage(response.pagination.last_page || 1)
    } catch (error) {
      toast.error(getApiErrorMessage(error) || 'Failed to load loyalty transactions')
      setTransactions([])
      setLastPage(1)
    } finally {
      setIsTransactionsLoading(false)
    }
  }, [currentPage, customer])

  useEffect(() => {
    if (!open || !customer) return
    loadTransactions()
  }, [open, customer, loadTransactions])

  useEffect(() => {
    if (!open) {
      setManualCardCode('')
      setAdjustPoints('')
      setAdjustReason('')
      setCurrentPage(1)
      setLastPage(1)
      setTransactions([])
      setTransactionTypeFilter('all')
    }
  }, [open])

  const handleAssignCard = useCallback(
    async (isRegenerate: boolean) => {
      if (!customer) return

      setIsAssigningCard(true)
      try {
        await loyaltyService.assignCard(
          customer.id,
          isRegenerate ? undefined : manualCardCode.trim() ? { card_code: manualCardCode.trim() } : undefined
        )

        toast.success(isRegenerate ? 'Loyalty card regenerated' : 'Loyalty card assigned')
        setManualCardCode('')
        await onCustomerRefresh?.()
      } catch (error) {
        toast.error(getApiErrorMessage(error) || 'Failed to assign loyalty card')
      } finally {
        setIsAssigningCard(false)
      }
    },
    [customer, manualCardCode, onCustomerRefresh]
  )

  const handleAdjustPoints = useCallback(async () => {
    if (!customer) return

    const points = Number(adjustPoints)
    if (!Number.isFinite(points) || points === 0) {
      toast.error('Enter a valid non-zero points value')
      return
    }

    if (!adjustReason.trim()) {
      toast.error('Reason is required')
      return
    }

    setIsAdjusting(true)
    try {
      await loyaltyService.adjustPoints(customer.id, {
        points,
        reason: adjustReason.trim(),
      })

      toast.success('Loyalty points adjusted')
      setAdjustPoints('')
      setAdjustReason('')
      await onCustomerRefresh?.()
      await loadTransactions()
    } catch (error) {
      toast.error(getApiErrorMessage(error) || 'Failed to adjust points')
    } finally {
      setIsAdjusting(false)
    }
  }, [adjustPoints, adjustReason, customer, onCustomerRefresh, loadTransactions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Assign loyalty cards, view transactions, and manage adjustments.
          </DialogDescription>
        </DialogHeader>

        {!customer ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No customer selected.</div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Ticket className="h-4 w-4" />
                Loyalty Card
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card Code</span>
                  <span className="font-medium">{customer.loyalty_card_code || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points</span>
                  <span className="font-semibold">{customer.loyalty_points ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span>{customer.loyalty_tier || '-'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manual-card-code">Manual Card Code (optional)</Label>
                <Input
                  id="manual-card-code"
                  placeholder="LP-1-MANUAL001"
                  value={manualCardCode}
                  onChange={(event) => setManualCardCode(event.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleAssignCard(false)} disabled={isAssigningCard}>
                  {isAssigningCard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Assign Card
                </Button>
                {/* <Button
                  variant="outline"
                  onClick={() => handleAssignCard(true)}
                  disabled={isAssigningCard}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Regenerate Card
                </Button> */}
              </div>

              {isShopOwner && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="adjust-points">Adjust Points (+/-)</Label>
                    <Input
                      id="adjust-points"
                      placeholder="e.g. -20 or 50"
                      value={adjustPoints}
                      onChange={(event) => setAdjustPoints(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adjust-reason">Reason</Label>
                    <Input
                      id="adjust-reason"
                      placeholder="Manual correction"
                      value={adjustReason}
                      onChange={(event) => setAdjustReason(event.target.value)}
                    />
                  </div>
                  <Button onClick={handleAdjustPoints} disabled={isAdjusting}>
                    {isAdjusting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Apply Adjustment
                  </Button>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Loyalty Transactions
                </div>
                <Button variant="outline" size="sm" onClick={loadTransactions}>
                  Refresh
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(['all', 'earn', 'redeem', 'reverse', 'adjustment'] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={transactionTypeFilter === type ? 'default' : 'outline'}
                    onClick={() => setTransactionTypeFilter(type)}
                  >
                    {type === 'all' ? 'All' : type}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md border p-2 text-xs sm:grid-cols-4">
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Transactions</p>
                  <p className="font-semibold">{transactionSummary.total}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Earned</p>
                  <p className="font-semibold text-green-600">+{transactionSummary.earnPoints}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Redeemed</p>
                  <p className="font-semibold text-orange-600">-{transactionSummary.redeemedPoints}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-muted-foreground">Net</p>
                  <p
                    className={`font-semibold ${transactionSummary.netPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {transactionSummary.netPoints >= 0
                      ? `+${transactionSummary.netPoints}`
                      : transactionSummary.netPoints}
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[300px] rounded-md border p-2">
                {isTransactionsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {transactionTypeFilter === 'all'
                      ? 'No transactions found'
                      : `No ${transactionTypeFilter} transactions found`}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((transaction) => (
                      <div key={transaction.id} className="rounded-md border p-2 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <Badge variant={getTypeBadgeVariant(transaction.type) as 'success' | 'warning' | 'secondary' | 'outline'}>
                            {transaction.type}
                          </Badge>
                          <span className="font-semibold">{transaction.points > 0 ? `+${transaction.points}` : transaction.points}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Before: {transaction.balance_before}</span>
                          <span>After: {transaction.balance_after}</span>
                        </div>
                        {transaction.reason ? (
                          <p className="mt-1 text-muted-foreground">{transaction.reason}</p>
                        ) : null}
                        <p className="mt-1 text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={!canPaginatePrev || isTransactionsLoading}
                >
                  Previous
                </Button>
                <span>
                  Page {currentPage} / {lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(lastPage, page + 1))}
                  disabled={!canPaginateNext || isTransactionsLoading}
                >
                  Next
                </Button>
              </div>
            </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CustomerLoyaltyDialog
