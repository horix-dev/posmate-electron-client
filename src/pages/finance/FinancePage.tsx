import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet, Plus, Search, Tags, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransactionTable } from './components/TransactionTable'
import { AddTransactionDialog } from './components/AddTransactionDialog'
import { CategoryManagerDialog } from './components/CategoryManagerDialog'
import { expensesService, incomesService } from '@/api/services/expenses.service'
import type { Expense, Income } from '@/types/api.types'

import { normalizeTransaction, type NormalizedTransaction } from './utils/normalization'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

export function FinancePage() {
  const [searchParams] = useSearchParams()
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [searchQuery, setSearchQuery] = useState('')

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'income') {
      setActiveTab('income')
    } else if (tab === 'expenses') {
      setActiveTab('expense')
    }
  }, [searchParams])

  // Data State - Now storing normalized data
  const [expenses, setExpenses] = useState<NormalizedTransaction[]>([])
  const [incomes, setIncomes] = useState<NormalizedTransaction[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)

  // Edit State
  const [editingItem, setEditingItem] = useState<NormalizedTransaction | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'expense') {
        const response = await expensesService.getAll({ limit: 1000 })
        // Response.data is already the array of expenses
        const list = response?.data || []

        const normalized = (Array.isArray(list) ? list : []).map((item: Expense) =>
          normalizeTransaction(item, 'expense')
        )
        setExpenses(normalized)
      } else {
        const response = await incomesService.getAll({ limit: 1000 })
        // Response.data is already the array of incomes
        const list = response?.data || []

        const normalized = (Array.isArray(list) ? list : []).map((item: Income) =>
          normalizeTransaction(item, 'income')
        )
        setIncomes(normalized)
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset editing item when dialog closes
  useEffect(() => {
    if (!isAddOpen) setEditingItem(null)
  }, [isAddOpen])

  /* Dialogs */
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null }>({
    open: false,
    id: null,
  })

  const [bulkDeleteState, setBulkDeleteState] = useState<{ open: boolean; ids: number[] }>({
    open: false,
    ids: [],
  })

  /* Delete Handlers */
  const handleDeleteClick = (id: number) => {
    setDeleteDialog({ open: true, id })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.id) return

    try {
      if (activeTab === 'expense') {
        await expensesService.delete(deleteDialog.id)
      } else {
        await incomesService.delete(deleteDialog.id)
      }
      toast.success('Record deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete record')
    }
  }

  const handleBulkDeleteClick = (ids: number[]) => {
    setBulkDeleteState({ open: true, ids })
  }

  const confirmBulkDelete = async () => {
    const { ids } = bulkDeleteState
    if (ids.length === 0) return

    try {
      const service = activeTab === 'expense' ? expensesService : incomesService
      // Using Promise.all for now as API might not support bulk delete endpoint
      await Promise.all(ids.map((id) => service.delete(id)))

      toast.success(`${ids.length} records deleted`)
      fetchData()
      setBulkDeleteState({ open: false, ids: [] })
    } catch (error) {
      console.error(error)
      toast.error('Failed to delete some records')
    }
  }

  const handleEdit = (item: NormalizedTransaction) => {
    setEditingItem(item)
    setIsAddOpen(true)
  }

  const filteredData = (activeTab === 'expense' ? expenses : incomes).filter((item) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()

    return (
      item.title.toLowerCase().includes(q) ||
      item.referenceNo.toLowerCase().includes(q) ||
      item.note.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      item.amount.toString().includes(q)
    )
  })

  // Calculate totals
  const totalAmount = filteredData.reduce((acc, item) => acc + item.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {activeTab === 'expense' ? 'Expenses' : 'Income'}
          </h1>
          <p className="text-muted-foreground">
            {activeTab === 'expense'
              ? 'Manage and track your expense records'
              : 'Manage and track your income records'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData()} aria-label="Refresh">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryOpen(true)}
            className="gap-2"
          >
            <Tags className="h-4 w-4" />
            Categories
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null)
              setIsAddOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'expense' ? 'Expense' : 'Income'}
          </Button>
        </div>
      </header>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-1 max-w-sm">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total {activeTab === 'expense' ? 'Expenses' : 'Income'}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${activeTab === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {activeTab === 'expense' ? '-' : '+'} {formatCurrency(totalAmount)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            className="h-10 border border-input bg-background pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionTable
        data={filteredData}
        isLoading={isLoading}
        type={activeTab === 'expense' ? 'expense' : 'income'}
        onDelete={handleDeleteClick}
        onEdit={handleEdit}
        onBulkDelete={handleBulkDeleteClick}
      />

      <AddTransactionDialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) setEditingItem(null)
        }}
        type={activeTab === 'expense' ? 'expense' : 'income'}
        editData={editingItem?.original}
        onSuccess={fetchData}
      />

      <CategoryManagerDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        type={activeTab === 'expense' ? 'expense' : 'income'}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={`Delete ${activeTab === 'expense' ? 'Expense' : 'Income'}`}
        description="Are you sure you want to delete this record? This action cannot be undone."
        onConfirm={confirmDelete}
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteState.open}
        onOpenChange={(open) => setBulkDeleteState((prev) => ({ ...prev, open }))}
        itemCount={bulkDeleteState.ids.length}
        itemLabel={activeTab === 'expense' ? 'expenses' : 'income records'}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

export default FinancePage
