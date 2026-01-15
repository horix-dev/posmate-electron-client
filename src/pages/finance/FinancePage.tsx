import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wallet, Plus, Search, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses')
  const [searchQuery, setSearchQuery] = useState('')

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'income' || tab === 'expenses') {
      setActiveTab(tab)
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
      if (activeTab === 'expenses') {
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
      if (activeTab === 'expenses') {
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
      const service = activeTab === 'expenses' ? expensesService : incomesService
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

  const filteredData = (activeTab === 'expenses' ? expenses : incomes).filter((item) => {
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
    <div className="flex h-full flex-col space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Finance Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage {activeTab === 'expenses' ? 'expenses' : 'income'} and categories
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total {activeTab === 'expenses' ? 'Expenses' : 'Income'}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${activeTab === 'expenses' ? 'text-red-600' : 'text-green-600'}`}
            >
              {activeTab === 'expenses' ? '-' : '+'} {formatCurrency(totalAmount)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'expenses' | 'income')}
        className="flex flex-1 flex-col space-y-4"
      >
        {/* Controls Section */}
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              className="h-10 border border-input bg-background pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <TabsList className="grid h-10 w-[240px] grid-cols-2 rounded-lg bg-muted/50 p-1">
            <TabsTrigger
              value="expenses"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Income
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Expenses Tab */}
        <TabsContent
          value="expenses"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
            <TransactionTable
              data={filteredData}
              isLoading={isLoading}
              type="expense"
              onDelete={handleDeleteClick}
              onEdit={handleEdit}
              onBulkDelete={handleBulkDeleteClick}
            />
          </div>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent
          value="income"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
            <TransactionTable
              data={filteredData}
              isLoading={isLoading}
              type="income"
              onDelete={handleDeleteClick}
              onEdit={handleEdit}
              onBulkDelete={handleBulkDeleteClick}
            />
          </div>
        </TabsContent>
      </Tabs>

      <AddTransactionDialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open)
          if (!open) setEditingItem(null)
        }}
        type={activeTab === 'expenses' ? 'expense' : 'income'}
        editData={editingItem?.original}
        onSuccess={fetchData}
      />

      <CategoryManagerDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        type={activeTab === 'expenses' ? 'expense' : 'income'}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={`Delete ${activeTab === 'expenses' ? 'Expense' : 'Income'}`}
        description="Are you sure you want to delete this record? This action cannot be undone."
        onConfirm={confirmDelete}
      />

      <BulkDeleteConfirmDialog
        isOpen={bulkDeleteState.open}
        onOpenChange={(open) => setBulkDeleteState((prev) => ({ ...prev, open }))}
        itemCount={bulkDeleteState.ids.length}
        itemLabel={activeTab === 'expenses' ? 'expenses' : 'income records'}
        onConfirm={confirmBulkDelete}
      />
    </div>
  )
}

export default FinancePage
