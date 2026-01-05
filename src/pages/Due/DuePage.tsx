import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Wallet, TrendingDown, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/common/StatCard'
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

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null

export function DuePage() {
  const { format: formatCurrency } = useCurrency()
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
      const payload = response?.data as unknown

      if (Array.isArray(payload)) {
        parties = payload
      } else if (isRecord(payload) && Array.isArray(payload.data)) {
        parties = payload.data as Party[]
      }

      setAllParties(parties)
      setSupplierParties(parties.filter((p) => p.type === 'Supplier'))
      setCustomerParties(parties.filter((p) => p.type !== 'Supplier'))
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
    } catch (error) {
      console.error('Error collecting due:', error)
      const errorMessage =
        isRecord(error) &&
        'response' in error &&
        isRecord((error as { response?: unknown }).response) &&
        isRecord((error as { response?: { data?: unknown } }).response?.data) &&
        typeof (error as { response?: { data?: { message?: unknown } } }).response?.data
          ?.message === 'string'
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      const errorMsg = errorMessage || 'Failed to collect due'
      toast.error(errorMsg)
    } finally {
      setIsSubmittingDue(false)
    }
  }

  const handleDeleteDue = async (partyId: number) => {
    console.debug('Delete due not implemented yet for party', partyId)
    toast.success('Due record deleted')
  }

  return (
    <div className="flex h-full flex-col space-y-6">
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
        <StatCard
          title="Total Due"
          value={formatCurrency(grandTotal)}
          description={`${allParties.length} party records`}
          icon={Wallet}
          iconClassName="text-red-500"
          loading={isLoading}
        />
        <StatCard
          title="Supplier Due"
          value={formatCurrency(supplierTotal)}
          description={`${supplierParties.length} supplier records`}
          icon={TrendingDown}
          iconClassName="text-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Customer Due"
          value={formatCurrency(customerTotal)}
          description={`${customerParties.length} customer records`}
          icon={AlertCircle}
          iconClassName="text-orange-500"
          loading={isLoading}
        />
      </div>
      {/* Overdue Alert */}
      {overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50">
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
        className="flex flex-1 flex-col space-y-4"
      >
        {/* Controls Section */}
        <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Input
                placeholder="Search by party name..."
                className="h-10 border border-input bg-background pl-3"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'outstanding' | 'cleared' | 'all')}
            >
              <SelectTrigger className="h-10 w-[160px] border border-input bg-background">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList className="grid h-10 w-[320px] grid-cols-3 rounded-lg bg-muted/50 p-1">
            <TabsTrigger
              value="all"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="supplier"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Supplier
            </TabsTrigger>
            <TabsTrigger
              value="customer"
              className="rounded-md text-sm font-medium transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              Customer
            </TabsTrigger>
          </TabsList>
        </div>

        {/* All Tab */}
        <TabsContent
          value="all"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
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
        <TabsContent
          value="supplier"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
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
        <TabsContent
          value="customer"
          className="mt-0 flex flex-1 flex-col border-none p-0 data-[state=active]:flex"
        >
          <div className="flex flex-1 flex-col rounded-lg border bg-background p-6">
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
      />{' '}
    </div>
  )
}

export default DuePage
