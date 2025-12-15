import { Tags, Plus, Search, Box, Ruler, LayoutGrid, Layers, Printer, Upload, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ProductSettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Settings</h1>
                    <p className="text-muted-foreground">Manage categories, attributes, and inventory settings</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New
                </Button>
            </div>

            <Tabs defaultValue="categories" className="space-y-4">
                <ScrollableTabsList>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="brands">Brands</TabsTrigger>
                    <TabsTrigger value="model">Model</TabsTrigger>
                    <TabsTrigger value="units">Units</TabsTrigger>
                    <TabsTrigger value="attributes">Attributes</TabsTrigger>
                    <TabsTrigger value="racks">Racks</TabsTrigger>
                    <TabsTrigger value="shelfs">Shelfs</TabsTrigger>
                    <TabsTrigger value="print-labels">Print Labels</TabsTrigger>
                    <TabsTrigger value="bulk-upload">Bulk Upload</TabsTrigger>
                </ScrollableTabsList>

                <TabsContent value="categories" className="space-y-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search categories..." className="pl-10" />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Product Categories</CardTitle>
                        </CardHeader>
                        <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Tags className="mx-auto mb-4 h-12 w-12" />
                                <p className="text-lg font-medium">Categories Table</p>
                                <p className="text-sm">Categories will be displayed here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="brands" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Brands</CardTitle>
                        </CardHeader>
                        <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Package className="mx-auto mb-4 h-12 w-12" />
                                <p className="text-lg font-medium">Brands</p>
                                <p className="text-sm">Brands will be displayed here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="model" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Models</CardTitle>
                        </CardHeader>
                        <CardContent className="flex h-96 items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Box className="mx-auto mb-4 h-12 w-12" />
                                <p className="text-lg font-medium">Models</p>
                                <p className="text-sm">Models will be displayed here</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="units" className="space-y-4">
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

                <TabsContent value="attributes" className="space-y-4">
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

                <TabsContent value="racks" className="space-y-4">
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

                <TabsContent value="shelfs" className="space-y-4">
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

                <TabsContent value="print-labels" className="space-y-4">
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

                <TabsContent value="bulk-upload" className="space-y-4">
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
            </Tabs>
        </div>
    )
}

function ScrollableTabsList({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-max min-w-full justify-start">
                {children}
            </TabsList>
        </div>
    )
}

export default ProductSettingsPage
