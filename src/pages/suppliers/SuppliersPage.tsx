import { useState, useMemo } from 'react'
import { Plus, Search, Filter, WifiOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/useDebounce'
import { useSuppliers } from './hooks/useSuppliers'
import { SupplierFormDialog, type SupplierFormData } from './components/SupplierFormDialog'
import type { CreatePartyRequest, Party } from '@/types/api.types'

export function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null)
  const [showForm, setShowForm] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const {
    suppliers,
    isLoading,
    isOnline,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    isCreating,
    isUpdating,
    searchSuppliers,
  } = useSuppliers()

  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearch) return suppliers
    return searchSuppliers(debouncedSearch)
  }, [suppliers, debouncedSearch, searchSuppliers])

  const handleAdd = () => {
    setSelectedSupplier(null)
    setShowForm(true)
  }

  const handleEdit = (supplier: Party) => {
    setSelectedSupplier(supplier)
    setShowForm(true)
  }

  const handleDelete = async (supplier: Party) => {
    await deleteSupplier(supplier.id)
  }

  const handleSave = async (data: SupplierFormData) => {
    const payload: CreatePartyRequest = {
      name: data.name,
      type: 'Supplier',
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      opening_balance_type: 'due',
      opening_balance: 0,
    }

    if (!selectedSupplier) {
      await createSupplier(payload)
    } else {
      await updateSupplier(selectedSupplier.id, payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
                <p className="text-muted-foreground">Loading suppliers...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSuppliers.length === 0 ? (
                <div className="text-muted-foreground">No suppliers found.</div>
              ) : (
                <ul className="divide-y overflow-hidden">
                  {filteredSuppliers.map((supplier) => (
                    <li key={supplier.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.email ?? supplier.phone}
                        </div>
                      </div>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(supplier)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isOnline && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <WifiOff className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                You are currently offline
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You can view cached suppliers, but creating, editing, or deleting suppliers requires
                an active internet connection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <SupplierFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initialData={selectedSupplier}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  )
}

export default SuppliersPage
