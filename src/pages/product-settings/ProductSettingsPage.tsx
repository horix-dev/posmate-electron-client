import { useState } from 'react'
import { Plus, Search, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoriesTable } from './components/categories/CategoriesTable'
import { CategoryDialog } from './components/categories/CategoryDialog'
import { BrandsTable } from './components/brands/BrandsTable'
import { BrandDialog } from './components/brands/BrandDialog'
import { ModelsTable } from './components/models/ModelsTable'
import { ModelDialog } from './components/models/ModelDialog'
import { UnitsTable } from './components/units/UnitsTable'
import { UnitDialog } from './components/units/UnitDialog'
import { RacksTable } from './components/racks/RacksTable'
import { ShelvesTable } from './components/shelves/ShelvesTable'
import { RackDialog } from './components/racks/RackDialog'
import { ShelfDialog } from './components/shelves/ShelfDialog'
import { PrintLabelsPage } from './components/print-labels/PrintLabelsPage'
import type { Category, Brand, ProductModel, Unit, Rack, Shelf } from '@/types/api.types'

export function ProductSettingsPage() {
  const [activeTab, setActiveTab] = useState('categories')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Dialog States
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [isBrandOpen, setIsBrandOpen] = useState(false)
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)

  const [isModelOpen, setIsModelOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null)
  const [isUnitOpen, setIsUnitOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isRackOpen, setIsRackOpen] = useState(false)
  const [editingRack, setEditingRack] = useState<Rack | null>(null)
  const [isShelfOpen, setIsShelfOpen] = useState(false)
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null)

  const handleAdd = () => {
    if (activeTab === 'categories') {
      setEditingCategory(null)
      setIsCategoryOpen(true)
    } else if (activeTab === 'brands') {
      setEditingBrand(null)
      setIsBrandOpen(true)
    } else if (activeTab === 'model') {
      setEditingModel(null)
      setIsModelOpen(true)
    } else if (activeTab === 'units') {
      setEditingUnit(null)
      setIsUnitOpen(true)
    } else if (activeTab === 'racks') {
      setEditingRack(null)
      setIsRackOpen(true)
    } else if (activeTab === 'shelfs') {
      setEditingShelf(null)
      setIsShelfOpen(true)
    }
    // Add other cases as implemented
  }

  const refresh = () => setRefreshTrigger((prev) => prev + 1)

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Settings</h1>
          <p className="text-muted-foreground">Manage categories, brands, models and attributes</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add New{' '}
          {activeTab === 'model'
            ? 'Model'
            : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col space-y-4"
      >
        <ScrollableTabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="model">Models</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="racks">Racks</TabsTrigger>
          <TabsTrigger value="shelfs">Shelves</TabsTrigger>
          <TabsTrigger value="print-labels">Print Labels</TabsTrigger>
        </ScrollableTabsList>

        {activeTab !== 'print-labels' && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${activeTab}...`}
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <TabsContent value="categories" className="mt-6 space-y-4">
            <CategoriesTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(category) => {
                setEditingCategory(category)
                setIsCategoryOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="brands" className="mt-6 space-y-4">
            <BrandsTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(brand) => {
                setEditingBrand(brand)
                setIsBrandOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="model" className="mt-6 space-y-4">
            <ModelsTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(model) => {
                setEditingModel(model)
                setIsModelOpen(true)
              }}
            />
          </TabsContent>

          {/* Units */}
          <TabsContent value="units" className="mt-6 space-y-4">
            <UnitsTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(unit) => {
                setEditingUnit(unit)
                setIsUnitOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="attributes" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attributes</CardTitle>
              </CardHeader>
              <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <LayoutGrid className="mx-auto mb-4 h-12 w-12" />
                  <p className="text-lg font-medium">Attributes</p>
                  <p className="text-sm">Attributes will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Racks */}
          <TabsContent value="racks" className="mt-6 space-y-4">
            <RacksTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(rack) => {
                setEditingRack(rack)
                setIsRackOpen(true)
              }}
            />
          </TabsContent>

          {/* Shelves */}
          <TabsContent value="shelfs" className="mt-6 space-y-4">
            <ShelvesTable
              searchQuery={searchQuery}
              refreshTrigger={refreshTrigger}
              onEdit={(shelf) => {
                setEditingShelf(shelf)
                setIsShelfOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="print-labels" className="mt-6 space-y-4">
            <PrintLabelsPage />
          </TabsContent>
        </div>
      </Tabs>

      <CategoryDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        editData={editingCategory}
        onSuccess={refresh}
      />

      <BrandDialog
        open={isBrandOpen}
        onOpenChange={setIsBrandOpen}
        editData={editingBrand}
        onSuccess={refresh}
      />

      <ModelDialog
        open={isModelOpen}
        onOpenChange={setIsModelOpen}
        editData={editingModel}
        onSuccess={refresh}
      />

      <UnitDialog
        open={isUnitOpen}
        onOpenChange={(open) => {
          setIsUnitOpen(open)
          if (!open) setEditingUnit(null)
        }}
        editData={editingUnit}
        onSuccess={refresh}
      />

      <RackDialog
        open={isRackOpen}
        onOpenChange={(open) => {
          setIsRackOpen(open)
          if (!open) setEditingRack(null)
        }}
        editData={editingRack}
        onSuccess={refresh}
      />

      <ShelfDialog
        open={isShelfOpen}
        onOpenChange={(open) => {
          setIsShelfOpen(open)
          if (!open) setEditingShelf(null)
        }}
        editData={editingShelf}
        onSuccess={refresh}
      />
    </div>
  )
}

function ScrollableTabsList({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <TabsList className="inline-flex w-max justify-start">{children}</TabsList>
    </div>
  )
}

export default ProductSettingsPage
