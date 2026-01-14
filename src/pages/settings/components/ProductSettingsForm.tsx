import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsService } from '@/api/services'
import type { ProductSettingsModules } from '@/types/api.types'

const DATE_FORMAT_OPTIONS = [
  { value: 'dmy', label: 'Day/Month/Year (DMY)' },
  { value: 'my', label: 'Month/Year (MY)' },
]

const ADD_PRODUCT_FIELDS = [
  { key: 'show_product_price', label: 'Product Price' },
  { key: 'show_product_code', label: 'Product Code' },
  { key: 'show_product_stock', label: 'Product Stock' },
  { key: 'show_product_unit', label: 'Product Unit' },
  { key: 'show_product_brand', label: 'Product Brand' },
  { key: 'show_model_no', label: 'Model No' },
  { key: 'show_product_category', label: 'Product Category' },
  { key: 'show_product_manufacturer', label: 'Product Manufacturer' },
  { key: 'show_product_image', label: 'Product Image' },
  { key: 'show_alert_qty', label: 'Low Stock Alert' },
  { key: 'show_vat_id', label: 'VAT ID' },
  { key: 'show_vat_type', label: 'VAT Type' },
  { key: 'show_exclusive_price', label: 'Exclusive Price' },
  { key: 'show_inclusive_price', label: 'Inclusive Price' },
  { key: 'show_profit_percent', label: 'Profit Percent' },
  { key: 'show_warehouse', label: 'Warehouse' },
  { key: 'show_rack', label: 'Rack' },
  { key: 'show_shelf', label: 'Shelf' },
  { key: 'show_action', label: 'Action' },
  { key: 'show_weight', label: 'Weight' },
]

const PRICE_FIELDS = [
  { key: 'show_product_sale_price', label: 'MRP' },
  { key: 'show_product_wholesale_price', label: 'Wholesale Price' },
  { key: 'show_product_dealer_price', label: 'Dealer Price' },
]

const BATCH_FIELDS = [
  { key: 'show_batch_no', label: 'Batch No', hasDefault: true },
  { key: 'show_expire_date', label: 'Expiry Date' },
  { key: 'show_mfg_date', label: 'Mfg Date' },
]

const PURCHASE_FIELDS = [
  { key: 'show_product_batch_no', label: 'Batch No' },
  { key: 'show_product_expire_date', label: 'Expire Date' },
]

const PRODUCT_TYPE_FIELDS = [
  { key: 'show_product_type_single', label: 'Single' },
  { key: 'show_product_type_variant', label: 'Batch' },
]

export function ProductSettingsForm() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<ProductSettingsModules>>({
    show_product_price: '1',
    show_product_code: '0',
    show_product_stock: '1',
    show_product_unit: '1',
    show_product_brand: '0',
    show_model_no: '0',
    show_product_category: '1',
    show_product_manufacturer: '0',
    show_product_image: '0',
    show_alert_qty: '1',
    show_vat_id: '0',
    show_vat_type: '0',
    show_exclusive_price: '1',
    show_inclusive_price: '1',
    show_profit_percent: '1',
    show_warehouse: '0',
    show_rack: '0',
    show_shelf: '0',
    show_action: '0',
    show_weight: '0',
    show_batch_no: '0',
    show_expire_date: '0',
    show_mfg_date: '0',
    show_product_type_single: '1',
    show_product_type_variant: '0',
    show_product_batch_no: '0',
    show_product_expire_date: '0',
    show_product_sale_price: '1',
    show_product_wholesale_price: '0',
    show_product_dealer_price: '0',
    default_sale_price: null,
    default_wholesale_price: null,
    default_dealer_price: null,
    default_batch_no: null,
    expire_date_type: null,
    mfg_date_type: null,
    default_expired_date: null,
    default_mfg_date: null,
  })

  // Compute if all items are selected based on current form data
  const allBoolFields = [
    ...ADD_PRODUCT_FIELDS,
    ...PRICE_FIELDS,
    ...BATCH_FIELDS,
    ...PURCHASE_FIELDS,
    ...PRODUCT_TYPE_FIELDS,
  ]

  const selectAll = allBoolFields.every(
    ({ key }) => formData[key as keyof ProductSettingsModules] === '1'
  )

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await settingsService.getProductSettings()
      if (response?.data) {
        console.log('API Response:', response.data.modules)
        // Merge API response with existing form data to ensure all fields are included
        setFormData((prev) => ({
          ...prev,
          ...response.data.modules,
        }))
      }
    } catch (error) {
      console.error('Failed to fetch product settings:', error)
      toast.error('Failed to load product settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleToggle = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key as keyof ProductSettingsModules] === '1' ? '0' : '1',
    }))
  }

  const handleNumberChange = (key: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value)
    setFormData((prev) => ({
      ...prev,
      [key]: numValue,
    }))
  }

  const handleTextChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value === '' ? null : value,
    }))
  }

  const handleSelectChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value === '' ? null : (value as 'dmy' | 'my'),
    }))
  }

  const handleSelectAll = () => {
    const boolFields = [
      ...ADD_PRODUCT_FIELDS,
      ...PRICE_FIELDS,
      ...BATCH_FIELDS,
      ...PURCHASE_FIELDS,
      ...PRODUCT_TYPE_FIELDS,
    ]

    // If all are currently selected, deselect all. Otherwise, select all.
    const allCurrentlySelected = boolFields.every(
      ({ key }) => formData[key as keyof ProductSettingsModules] === '1'
    )

    const newValue = !allCurrentlySelected

    setFormData((prev) => {
      const updated = { ...prev } as Record<string, string | null | number>
      boolFields.forEach(({ key }) => {
        updated[key] = newValue ? '1' : '0'
      })
      return updated as Partial<ProductSettingsModules>
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await settingsService.updateProductSettings(formData)
      if (response?.data) {
        console.log('Save Response:', response.data.modules)
        // Merge response with form data
        setFormData((prev) => ({
          ...prev,
          ...response.data.modules,
        }))
        toast.success('Product settings updated successfully')
      }
    } catch (error) {
      console.error('Failed to update product settings:', error)
      toast.error('Failed to update product settings')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Product Settings</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="text-sm font-semibold text-primary hover:bg-transparent hover:text-primary"
          >
            {selectAll ? 'Deselect All' : 'Select All'}
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Main Grid */}
            <div className="grid grid-cols-3 gap-8">
              {/* Column 1: Add Product Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Add Product Settings</h3>
                  <svg
                    className="h-4 w-4 cursor-help text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <div className="space-y-3">
                  {ADD_PRODUCT_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Checkbox
                        id={key}
                        checked={formData[key as keyof ProductSettingsModules] === '1'}
                        onCheckedChange={() => handleToggle(key)}
                        className="rounded"
                      />
                      <Label
                        htmlFor={key}
                        className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2: Additional Product Field & Batch Tracking */}
              <div className="space-y-8">
                {/* Additional Product Field */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Additional Product Field
                    </h3>
                    <svg
                      className="h-4 w-4 cursor-help text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* MRP/PRICE Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900">MRP/PRICE</h4>
                    <div className="space-y-3">
                      {/* MRP */}
                      <div className="grid grid-cols-2 items-start gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="show_product_sale_price"
                            checked={formData['show_product_sale_price'] === '1'}
                            onCheckedChange={() => handleToggle('show_product_sale_price')}
                            className="mt-1 rounded"
                          />
                          <Label
                            htmlFor="show_product_sale_price"
                            className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                          >
                            MRP
                          </Label>
                        </div>
                        <Input
                          type="number"
                          placeholder="Enter Sale Price"
                          step="0.01"
                          min="0"
                          className="h-8 text-sm"
                          value={formData['default_sale_price'] ?? ''}
                          onChange={(e) => handleNumberChange('default_sale_price', e.target.value)}
                        />
                      </div>

                      {/* Wholesale Price */}
                      <div className="grid grid-cols-2 items-start gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="show_product_wholesale_price"
                            checked={formData['show_product_wholesale_price'] === '1'}
                            onCheckedChange={() => handleToggle('show_product_wholesale_price')}
                            className="mt-1 rounded"
                          />
                          <Label
                            htmlFor="show_product_wholesale_price"
                            className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                          >
                            Wholesale Price
                          </Label>
                        </div>
                        <Input
                          type="number"
                          placeholder="Enter Wholesale Price"
                          step="0.01"
                          min="0"
                          className="h-8 text-sm"
                          value={formData['default_wholesale_price'] ?? ''}
                          onChange={(e) =>
                            handleNumberChange('default_wholesale_price', e.target.value)
                          }
                        />
                      </div>

                      {/* Dealer Price */}
                      <div className="grid grid-cols-2 items-start gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="show_product_dealer_price"
                            checked={formData['show_product_dealer_price'] === '1'}
                            onCheckedChange={() => handleToggle('show_product_dealer_price')}
                            className="mt-1 rounded"
                          />
                          <Label
                            htmlFor="show_product_dealer_price"
                            className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                          >
                            Dealer Price
                          </Label>
                        </div>
                        <Input
                          type="number"
                          placeholder="Enter Dealer Price"
                          step="0.01"
                          min="0"
                          className="h-8 text-sm"
                          value={formData['default_dealer_price'] ?? ''}
                          onChange={(e) =>
                            handleNumberChange('default_dealer_price', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Batch Tracking */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Batch Tracking</h3>
                  <div className="space-y-3">
                    {/* Batch No */}
                    <div className="grid grid-cols-2 items-start gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="show_batch_no"
                          checked={formData['show_batch_no'] === '1'}
                          onCheckedChange={() => handleToggle('show_batch_no')}
                          className="mt-1 rounded"
                        />
                        <Label
                          htmlFor="show_batch_no"
                          className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                        >
                          Batch No
                        </Label>
                      </div>
                      <Input
                        type="text"
                        placeholder="Batch No"
                        className="h-8 text-sm"
                        value={formData['default_batch_no'] ?? ''}
                        onChange={(e) => handleTextChange('default_batch_no', e.target.value)}
                      />
                    </div>

                    {/* Expiry Date */}
                    <div className="grid grid-cols-2 items-start gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="show_expire_date"
                          checked={formData['show_expire_date'] === '1'}
                          onCheckedChange={() => handleToggle('show_expire_date')}
                          className="mt-1 rounded"
                        />
                        <Label
                          htmlFor="show_expire_date"
                          className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                        >
                          Expiry Date
                        </Label>
                      </div>
                      <Select
                        value={formData['expire_date_type'] ?? ''}
                        onValueChange={(value) => handleSelectChange('expire_date_type', value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mfg Date */}
                    <div className="grid grid-cols-2 items-start gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="show_mfg_date"
                          checked={formData['show_mfg_date'] === '1'}
                          onCheckedChange={() => handleToggle('show_mfg_date')}
                          className="mt-1 rounded"
                        />
                        <Label
                          htmlFor="show_mfg_date"
                          className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                        >
                          Mfg Date
                        </Label>
                      </div>
                      <Select
                        value={formData['mfg_date_type'] ?? ''}
                        onValueChange={(value) => handleSelectChange('mfg_date_type', value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Product Type */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Product Type</h3>
                  <div className="space-y-3">
                    {PRODUCT_TYPE_FIELDS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <Checkbox
                          id={key}
                          checked={formData[key as keyof ProductSettingsModules] === '1'}
                          onCheckedChange={() => handleToggle(key)}
                          className="rounded"
                        />
                        <Label
                          htmlFor={key}
                          className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 3: Purchase Setting */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Purchase Setting</h3>
                  <svg
                    className="h-4 w-4 cursor-help text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                <div className="space-y-3">
                  {PURCHASE_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <Checkbox
                        id={key}
                        checked={formData[key as keyof ProductSettingsModules] === '1'}
                        onCheckedChange={() => handleToggle(key)}
                        className="rounded"
                      />
                      <Label
                        htmlFor={key}
                        className="cursor-pointer text-sm font-normal text-blue-600 hover:text-blue-700"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center border-t pt-6">
              <Button onClick={handleSubmit} disabled={submitting} className="min-w-[150px]">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
