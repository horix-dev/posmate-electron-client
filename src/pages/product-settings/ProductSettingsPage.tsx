import { useState } from 'react'
import { Plus, Search, Ruler, LayoutGrid, Layers, Printer, Upload } from 'lucide-react'
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
import type { Category, Brand, ProductModel } from '@/types/api.types'

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
        }
        // Add other cases as implemented
    }

    const refresh = () => setRefreshTrigger(prev => prev + 1)

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Settings</h1>
                    <p className="text-muted-foreground">Manage categories, brands, models and attributes</p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New {activeTab === 'model' ? 'Model' : activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 flex-1 flex flex-col">
                <ScrollableTabsList>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="brands">Brands</TabsTrigger>
                    <TabsTrigger value="model">Models</TabsTrigger>
                    <TabsTrigger value="units">Units</TabsTrigger>
                    <TabsTrigger value="attributes">Attributes</TabsTrigger>
                    <TabsTrigger value="racks">Racks</TabsTrigger>
                    <TabsTrigger value="shelfs">Shelfs</TabsTrigger>
                    <TabsTrigger value="print-labels">Print Labels</TabsTrigger>
                    <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
                </ScrollableTabsList>

                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={`Search ${activeTab}...`}
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-auto">
                    <TabsContent value="categories" className="space-y-4 mt-6">
                        <CategoriesTable
                            searchQuery={searchQuery}
                            refreshTrigger={refreshTrigger}
                            onEdit={(category) => {
                                setEditingCategory(category)
                                setIsCategoryOpen(true)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="brands" className="space-y-4 mt-6">
                        <BrandsTable
                            searchQuery={searchQuery}
                            refreshTrigger={refreshTrigger}
                            onEdit={(brand) => {
                                setEditingBrand(brand)
                                setIsBrandOpen(true)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="model" className="space-y-4 mt-6">
                        <ModelsTable
                            searchQuery={searchQuery}
                            refreshTrigger={refreshTrigger}
                            onEdit={(model) => {
                                setEditingModel(model)
                                setIsModelOpen(true)
                            }}
                        />
                    </TabsContent>

                    {/* Placeholders for other tabs */}
                    <TabsContent value="units" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Units</CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Ruler className="mx-auto mb-4 h-12 w-12" />
                                    <p className="text-lg font-medium">Units</p>
                                    <p className="text-sm">Units will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="attributes" className="space-y-4 mt-0">
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

                    <TabsContent value="racks" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Racks</CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Layers className="mx-auto mb-4 h-12 w-12" />
                                    <p className="text-lg font-medium">Racks</p>
                                    <p className="text-sm">Racks will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="shelfs" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Shelfs</CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Layers className="mx-auto mb-4 h-12 w-12" />
                                    <p className="text-lg font-medium">Shelfs</p>
                                    <p className="text-sm">Shelfs will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="print-labels" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Print Labels</CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Printer className="mx-auto mb-4 h-12 w-12" />
                                    <p className="text-lg font-medium">Print Labels</p>
                                    <p className="text-sm">Label printing configuration will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bulk-upload" className="space-y-4 mt-0">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bulk Upload</CardTitle>
                            </CardHeader>
                            <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Upload className="mx-auto mb-4 h-12 w-12" />
                                    <p className="text-lg font-medium">Bulk Upload</p>
                                    <p className="text-sm">Bulk upload tools will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
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
        </div>
    )
}

function ScrollableTabsList({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max justify-start">
                {children}
            </TabsList>
        </div>
    )
}

export default ProductSettingsPage
