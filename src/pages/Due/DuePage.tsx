import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Wallet, TrendingDown, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DueTable } from './components/DueTable'
import { CollectDueDialog, type CollectDueFormData } from './components/CollectDueDialog'
import { partiesService } from '@/api/services/parties.service'
import { duesService } from '@/api/services/dues.service'
import type { Party } from '@/types/api.types'

export function DuePage() {
  const [activeTab, setActiveTab] = useState<'all' | 'supplier' | 'customer'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'outstanding' | 'cleared' | 'all'>('outstanding')
  const [isLoading, setIsLoading] = useState(false)
  const [allParties, setAllParties] = useState<Party[]>([])
  const [supplierParties, setSupplierParties] = useState<Party[]>([])
  const [customerParties, setCustomerParties] = useState<Party[]>([])
  const [collectDueOpen, setCollectDueOpen] = useState(false)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [isSubmittingDue, setIsSubmittingDue] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await partiesService.getAll()
      
      // Handle flexible response format
      let parties: Party[] = []
      if (Array.isArray(response)) {
        parties = response
      } else if (response.data) {
        if (Array.isArray(response.data)) {
          parties = response.data
        } else if ((response.data as any).data && Array.isArray((response.data as any).data)) {
          parties = (response.data as any).data
        }
      }
      
      setAllParties(parties)
      setSupplierParties(parties.filter(p => p.type === 'Supplier'))
      setCustomerParties(parties.filter(p => p.type !== 'Supplier'))
    } catch (error) {
      console.error(error)
      toast.error('Failed to load party data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getTabData = useCallback(() => {
    switch (activeTab) {
      case 'supplier':
        return supplierParties
      case 'customer':
        return customerParties
      default:
        return allParties
    }
  }, [activeTab, allParties, supplierParties, customerParties])

  const applyStatusFilter = useCallback(
    (parties: Party[]): Party[] => {
      return parties.filter((party) => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'cleared') return party.due === 0
        if (statusFilter === 'outstanding') return party.due > 0
        return true
      })
    },
    [statusFilter]
  )

  const filteredData = applyStatusFilter(
    getTabData().filter((party) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        party.name.toLowerCase().includes(q) ||
        party.phone?.toLowerCase().includes(q) ||
        party.email?.toLowerCase().includes(q)
      )
    })
  )

  // Calculate totals
  const supplierTotal = supplierParties.reduce((acc, party) => acc + (party.due || 0), 0)
  const customerTotal = customerParties.reduce((acc, party) => acc + (party.due || 0), 0)
  const grandTotal = allParties.reduce((acc, party) => acc + (party.due || 0), 0)

  const overdueCount = allParties.filter((p) => (p.due || 0) > 0).length

  const handleCollectDue = (party: Party) => {
    setSelectedParty(party)
    setCollectDueOpen(true)
  }

  const handleCollectDueSubmit = async (formData: CollectDueFormData) => {
    setIsSubmittingDue(true)
    try {
      await duesService.create(formData)
      toast.success('Due collected successfully')
      setCollectDueOpen(false)
      setSelectedParty(null)
      // Refresh data to show updated due amounts
      fetchData()
    } catch (error: any) {
      console.error('Error collecting due:', error)
      const errorMsg = error?.response?.data?.message || 'Failed to collect due'
      toast.error(errorMsg)
    } finally {
      setIsSubmittingDue(false)
    }
  }

  const handleDeleteDue = async (_partyId: number) => {
    // TODO: Implement delete logic
    toast.success('Due record deleted')
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Due Management</h2>
          <p className="text-sm text-muted-foreground">Track supplier and customer dues</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Due Card */}
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {allParties.length} party records
            </p>
          </CardContent>
        </Card>

        {/* Supplier Due Card */}
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supplier Due</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${supplierTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {supplierParties.length} supplier records
            </p>
          </CardContent>
        </Card>

        {/* Customer Due Card */}
        <Card className="bg-gradient-to-br from-background to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${customerTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {customerParties.length} customer records
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  {overdueCount} overdue record{overdueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700">Please take action on overdue dues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'all' | 'supplier' | 'customer')}
        className="space-y-4 flex-1 flex flex-col"
      >
        {/* Controls Section */}
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search by party name..."
                className="pl-3 h-10 bg-background border border-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'outstanding' | 'cleared' | 'all')}
            >
              <SelectTrigger className="w-[160px] h-10 bg-background border border-input">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList className="grid w-[320px] grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 rounded-md text-sm font-medium"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="supplier"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 rounded-md text-sm font-medium"
            >
              Supplier
            </TabsTrigger>
            <TabsTrigger
              value="customer"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all duration-200 rounded-md text-sm font-medium"
            >
              Customer
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All Tab */}
        <TabsContent value="all" className="flex-1 flex flex-col mt-0 border-none p-0 data-[state=active]:flex">
          <div className="bg-background rounded-lg border p-6 flex-1 flex flex-col">
            <DueTable
              data={filteredData}
              isLoading={isLoading}
              type="all"
              onCollectDue={handleCollectDue}
              onDelete={handleDeleteDue}
            />
          </div>
        </TabsContent>

        {/* Supplier Tab */}
        <TabsContent value="supplier" className="flex-1 flex flex-col mt-0 border-none p-0 data-[state=active]:flex">
          <div className="bg-background rounded-lg border p-6 flex-1 flex flex-col">
            <DueTable
              data={filteredData}
              isLoading={isLoading}
              type="supplier"
              onCollectDue={handleCollectDue}
              onDelete={handleDeleteDue}
            />
          </div>
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="flex-1 flex flex-col mt-0 border-none p-0 data-[state=active]:flex">
          <div className="bg-background rounded-lg border p-6 flex-1 flex flex-col">
            <DueTable
              data={filteredData}
              isLoading={isLoading}
              type="customer"
              onCollectDue={handleCollectDue}
              onDelete={handleDeleteDue}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Collect Due Dialog */}
      <CollectDueDialog
        open={collectDueOpen}
        onOpenChange={setCollectDueOpen}
        party={selectedParty}
        onSubmit={handleCollectDueSubmit}
        isLoading={isSubmittingDue}
      />    </div>
  )
}

export default DuePage