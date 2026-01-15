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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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
      opening_balance: data.opening_balance || 0,
      opening_balance_type: data.opening_balance_type,
      image: data.image,
    }

    if (!selectedSupplier) {
      await createSupplier(payload)
    } else {
      await updateSupplier(selectedSupplier.id, payload)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier relationships and balances</p>
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
            placeholder="Search suppliers by name, email or phone..."
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
          <CardDescription>
            {isLoading
              ? 'Loading suppliers...'
              : `${filteredSuppliers.length} ${filteredSuppliers.length === 1 ? 'supplier' : 'suppliers'} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No suppliers found</h3>
                  <p className="mb-4">
                    {searchQuery
                      ? `No suppliers matching "${searchQuery}"`
                      : 'Get started by adding your first supplier'}
                  </p>
                  <Button onClick={handleAdd} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {filteredSuppliers.map((supplier) => (
                    <li
                      key={supplier.id}
                      className="group -mx-2 flex flex-col gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={supplier.image} alt={supplier.name} />
                          <AvatarFallback className="bg-primary/10 font-medium text-primary">
                            {getInitials(supplier.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-foreground">{supplier.name}</div>
                          <div className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                            {supplier.phone && <span>{supplier.phone}</span>}
                            {supplier.phone && supplier.email && (
                              <span className="hidden text-muted-foreground/50 sm:inline">•</span>
                            )}
                            {supplier.email && <span>{supplier.email}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pl-14 sm:justify-end sm:pl-0">
                        {supplier.opening_balance !== undefined && (
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">Balance</div>
                            <div
                              className={cn(
                                'font-medium',
                                (supplier.opening_balance || 0) > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              )}
                            >
                              {/* TODO: Format currency properly */}
                              {Number(supplier.opening_balance).toFixed(2)}
                            </div>
                          </div>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
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
