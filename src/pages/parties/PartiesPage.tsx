import { useState, useMemo } from 'react'
import { Plus, Search, Filter, WifiOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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

// Suppliers feature imports
import { useDebounce } from '@/hooks/useDebounce'
import { useSuppliers } from '../suppliers/hooks/useSuppliers'
import { useCustomers } from '../customers/hooks/useCustomers'
import CustomerFormDialog, { CustomerFormValues } from '../customers/components/CustomerFormDialog'
import SupplierFormDialog, { SupplierFormValues } from '../suppliers/components/SupplierFormDialog'
import type { CreatePartyRequest } from '@/types/api.types'
import type { Party } from '@/types/api.types'

// Helper function to extract error message from API response
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Check if error has response data with message
    const errorData = (error as any)?.response?.data
    if (errorData?.message) {
      return errorData.message
    }
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as any).message
  }
  return 'Unknown error'
}

export function PartiesPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers')
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

  const handleDelete = (supplier: Party) => {
    deleteSupplier(supplier.id)
      .then(() => {
        toast.success(`Supplier "${supplier.name}" deleted successfully`)
      })
      .catch((error) => {
        console.error('[PartiesPage] delete supplier error:', error)
        const errorMessage = getErrorMessage(error)
        toast.error(errorMessage)
      })
  }

  const handleSave = async (data: SupplierFormValues) => {
    try {
      const payload: CreatePartyRequest = {
        name: data.name,
        type: 'Supplier',
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        // API requires opening_balance_type — defaulting to 'due' and 0 balance
        opening_balance_type: 'due',
        opening_balance: 0,
      }

      if (!selectedSupplier) {
        await createSupplier(payload)
      } else {
        await updateSupplier(selectedSupplier.id, payload)
      }
    } catch (err) {
      // errors handled in hook via toasts
      console.debug('[PartiesPage] save error', err)
    }
  }

  // Customers handlers
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null)
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  const handleDeleteCustomer = (customer: Party) => {
    deleteCustomer(customer.id)
      .then(() => {
        toast.success(`Customer "${customer.name}" deleted successfully`)
      })
      .catch((error) => {
        console.error('[PartiesPage] delete customer error:', error)
        const errorMessage = getErrorMessage(error)
        toast.error(errorMessage)
      })
  }

  const handleSaveCustomer = async (data: CustomerFormValues) => {
    try {
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
    } catch (err) {
      console.debug('[PartiesPage] save customer error', err)
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
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
                            <div className="text-sm text-muted-foreground">{c.email ?? c.phone}</div>
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
                                <DropdownMenuItem onClick={() => handleDeleteCustomer(c)} className="text-destructive focus:text-destructive">
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
    </div>
  )
}

export default PartiesPage
