import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebounce } from '@/hooks/useDebounce'
import { useSuppliers } from '../suppliers/hooks/useSuppliers'
import { useCustomers } from '../customers/hooks/useCustomers'
import {
  CustomerFormDialog,
  type CustomerFormData,
} from '../customers/components/CustomerFormDialog'
import {
  SupplierFormDialog,
  type SupplierFormData,
} from '../suppliers/components/SupplierFormDialog'
import type { CreatePartyRequest, Party } from '@/types/api.types'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'

export function PartiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Read tab from URL on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'customers' || tab === 'suppliers') {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: 'customers' | 'suppliers') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

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

  const {
    customers,
    isLoading: isCustomersLoading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    isCreating: isCreatingCustomer,
    isUpdating: isUpdatingCustomer,
    searchCustomers,
  } = useCustomers()

  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearch) return suppliers
    return searchSuppliers(debouncedSearch)
  }, [suppliers, debouncedSearch, searchSuppliers])

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers
    return searchCustomers(debouncedSearch)
  }, [customers, debouncedSearch, searchCustomers])

  const handleAdd = () => {
    if (activeTab === 'suppliers') {
      setSelectedSupplier(null)
      setShowForm(true)
    } else {
      setSelectedCustomer(null)
      setShowCustomerForm(true)
    }
  }

  const handleEdit = (supplier: Party) => {
    setSelectedSupplier(supplier)
    setShowForm(true)
  }

  const handleEditCustomer = (customer: Party) => {
    setSelectedCustomer(customer)
    setShowCustomerForm(true)
  }

  // Delete Dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: 'customer' | 'supplier'; item: Party | null }>({
    open: false,
    type: 'customer',
    item: null
  })

  // Supplier handlers
  const handleDelete = (supplier: Party) => {
    setDeleteDialog({ open: true, type: 'supplier', item: supplier })
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

  // Customer handlers
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null)
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  const handleDeleteCustomer = (customer: Party) => {
    setDeleteDialog({ open: true, type: 'customer', item: customer })
  }

  const handleConfirmDelete = async () => {
    const { type, item } = deleteDialog
    if (!item) return

    if (type === 'supplier') {
      await deleteSupplier(item.id)
    } else {
      await deleteCustomer(item.id)
    }
    // Dialog closes automatically via onOpenChange or we can force it, usually onConfirm awaits so it's fine.
    // The DeleteConfirmDialog component handles the loading state via the Promise returned here.
  }

  const handleSaveCustomer = async (data: CustomerFormData) => {
    const payload: CreatePartyRequest = {
      name: data.name,
      type: 'Retailer',
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
      opening_balance_type: 'due',
      opening_balance: 0,
    }

    if (!selectedCustomer) {
      await createCustomer(payload)
    } else {
      await updateCustomer(selectedCustomer.id, payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
          <p className="text-muted-foreground">Manage customers and suppliers</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Party
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as 'customers' | 'suppliers')}
      >
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
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
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {isCustomersLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                    <p className="text-muted-foreground">Loading customers...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-muted-foreground">No customers found.</div>
                  ) : (
                    <ul className="divide-y overflow-hidden">
                      {filteredCustomers.map((c) => (
                        <li key={c.id} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium">{c.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {c.email ?? c.phone}
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
                                <DropdownMenuItem onClick={() => handleEditCustomer(c)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteCustomer(c)}
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

          <CustomerFormDialog
            open={showCustomerForm}
            onOpenChange={setShowCustomerForm}
            initialData={selectedCustomer}
            onSave={handleSaveCustomer}
            isSaving={isCreatingCustomer || isUpdatingCustomer}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
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
              <CardTitle>Suppliers</CardTitle>
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
                      {filteredSuppliers.map((s) => (
                        <li key={s.id} className="flex items-center justify-between py-2">
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {s.email ?? s.phone}
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
                                <DropdownMenuItem onClick={() => handleEdit(s)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(s)}
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
                    You can view cached suppliers, but creating, editing, or deleting suppliers
                    requires an active internet connection.
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
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        isOpen={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
        title={`Delete ${deleteDialog.type === 'customer' ? 'Customer' : 'Supplier'}`}
        description={`Are you sure you want to delete this ${deleteDialog.type}? This action cannot be undone.`}
        itemName={deleteDialog.item?.name}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

export default PartiesPage
