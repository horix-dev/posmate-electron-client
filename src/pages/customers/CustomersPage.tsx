import { useState, useMemo } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { useCustomers } from './hooks/useCustomers'
import { CustomerFormDialog, type CustomerFormData } from './components/CustomerFormDialog'
import type { CreatePartyRequest, Party } from '@/types/api.types'

export function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null)
  const [showForm, setShowForm] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const {
    customers,
    isLoading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    isCreating,
    isUpdating,
    searchCustomers,
  } = useCustomers()

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers
    return searchCustomers(debouncedSearch)
  }, [customers, debouncedSearch, searchCustomers])

  const handleAdd = () => {
    setSelectedCustomer(null)
    setShowForm(true)
  }

  const handleEdit = (customer: Party) => {
    setSelectedCustomer(customer)
    setShowForm(true)
  }

  const handleDelete = async (customer: Party) => {
    await deleteCustomer(customer.id)
  }

  const handleSave = async (data: CustomerFormData) => {
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
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

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
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  {filteredCustomers.map((customer) => (
                    <li key={customer.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.email ?? customer.phone}
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
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(customer)}
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
        open={showForm}
        onOpenChange={setShowForm}
        initialData={selectedCustomer}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  )
}

export default CustomersPage
