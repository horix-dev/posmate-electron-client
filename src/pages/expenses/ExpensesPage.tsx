import { useState, useEffect, useCallback } from 'react'
import { Wallet, Plus, Search, Tags } from 'lucide-react'
import { toast } from 'sonner'
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

export function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'income'>('expenses')
  const [searchQuery, setSearchQuery] = useState('')

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
        const response = await expensesService.getAll()
        // @ts-expect-error - Response type mismatch from API
        const list = response.data?.data || response.data || []
        const normalized = (Array.isArray(list) ? list : []).map((item: Expense) =>
          normalizeTransaction(item, 'expense')
        )
        setExpenses(normalized)
      } else {
        const response = await incomesService.getAll()
        // @ts-expect-error - Response type mismatch from API
        const list = response.data?.data || response.data || []
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      if (activeTab === 'expenses') {
        await expensesService.delete(id)
      } else {
        await incomesService.delete(id)
      }
      toast.success('Record deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete record')
    }
  }

  const handleBulkDelete = async (ids: number[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} records?`)) return

    try {
      const service = activeTab === 'expenses' ? expensesService : incomesService
      // Using Promise.all for now as API might not support bulk delete endpoint
      await Promise.all(ids.map(id => service.delete(id)))

      toast.success(`${ids.length} records deleted`)
      fetchData()
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
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
          <p className="text-muted-foreground">Manage your {activeTab} and categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCategoryOpen(true)}>
            <Tags className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button onClick={() => {
            setEditingItem(null)
            setIsAddOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add {activeTab === 'expenses' ? 'Expense' : 'Income'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {activeTab === 'expenses' ? 'Expenses' : 'Income'}</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${activeTab === 'expenses' ? 'text-red-500' : 'text-green-500'}`}>
              {activeTab === 'expenses' ? '-' : '+'} ${totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {filteredData.length} records
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expenses' | 'income')} className="space-y-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              className="pl-10 h-10 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <TabsList className="grid w-[240px] grid-cols-2 h-10 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 rounded-md text-sm font-medium"
            >
              Expenses
            </TabsTrigger>
            <TabsTrigger
              value="income"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 rounded-md text-sm font-medium"
            >
              Income
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="expenses" className="flex-1 flex flex-col mt-0 border-none p-0 data-[state=active]:flex">
          <TransactionTable
            data={filteredData}
            isLoading={isLoading}
            type="expense"
            onDelete={handleDelete}
            onEdit={handleEdit}
            onBulkDelete={handleBulkDelete}
          />
        </TabsContent>

        <TabsContent value="income" className="flex-1 flex flex-col mt-0 border-none p-0 data-[state=active]:flex">
          <TransactionTable
            data={filteredData}
            isLoading={isLoading}
            type="income"
            onDelete={handleDelete}
            onEdit={handleEdit}
            onBulkDelete={handleBulkDelete}
          />
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
    </div>
  )
}

export default ExpensesPage
