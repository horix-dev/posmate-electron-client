import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBusinessStore } from '@/stores'
import { settingsService, businessService } from '@/api/services'
import type {
  BusinessSettings,
  BusinessCategory,
  RoundingOption,
  ProfitOption,
} from '@/types/api.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.posmate.app'

const ROUNDING_OPTIONS: { value: RoundingOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'round_up', label: 'Round Up' },
  { value: 'nearest_whole_number', label: 'Nearest Whole Number' },
  { value: 'nearest_0.05', label: 'Nearest 0.05' },
  { value: 'nearest_0.1', label: 'Nearest 0.1' },
  { value: 'nearest_0.5', label: 'Nearest 0.5' },
]

const PROFIT_OPTIONS: { value: ProfitOption; label: string; description: string }[] = [
  { value: 'markup', label: 'Markup', description: 'Profit based on Purchase Price' },
  { value: 'margin', label: 'Margin', description: 'Profit based on Selling Price' },
]

const getImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Otherwise, prepend the base URL
  return `${API_BASE_URL}/${path.replace(/^\//, '')}`
}

export function BusinessSettingsForm() {
  const business = useBusinessStore((state) => state.business)
  const fetchBusiness = useBusinessStore((state) => state.fetchBusiness)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [formData, setFormData] = useState<Partial<BusinessSettings>>({
    sale_rounding_option: 'none',
    product_profit_option: 'markup',
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [scannerLogoPreview, setScannerLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [scannerLogoFile, setScannerLogoFile] = useState<File | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const scannerLogoInputRef = useRef<HTMLInputElement>(null)

  // Fetch business categories and settings
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch categories
      const categoriesRes = await businessService.getBusinessCategories()
      console.log('Categories Response:', categoriesRes)
      setCategories(categoriesRes.data || [])

      let apiDataFound = false

      // Try to fetch business settings from API
      try {
        const settingsRes = await settingsService.getBusinessSettings()
        console.log('Business Settings Response:', settingsRes)

        if (settingsRes?.data) {
          console.log('Populating form with API settings:', settingsRes.data)
          // Replace form data completely with API response
          setFormData({
            id: settingsRes.data.id,
            business_id: settingsRes.data.business_id,
            companyName: settingsRes.data.companyName,
            business_category_id: settingsRes.data.business_category_id,
            phoneNumber: settingsRes.data.phoneNumber,
            address: settingsRes.data.address,
            email: settingsRes.data.email,
            vat_name: settingsRes.data.vat_name,
            vat_no: settingsRes.data.vat_no,
            sale_rounding_option: settingsRes.data.sale_rounding_option || 'none',
            product_profit_option: settingsRes.data.product_profit_option || 'markup',
            note: settingsRes.data.note,
            note_label: settingsRes.data.note_label,
            gratitude_message: settingsRes.data.gratitude_message,
            invoice_logo: settingsRes.data.invoice_logo,
            invoice_scanner_logo: settingsRes.data.invoice_scanner_logo,
          })
          apiDataFound = true

          // Set image previews
          if (settingsRes.data.invoice_logo) {
            setLogoPreview(getImageUrl(settingsRes.data.invoice_logo))
          }
          if (settingsRes.data.invoice_scanner_logo) {
            setScannerLogoPreview(getImageUrl(settingsRes.data.invoice_scanner_logo))
          }
        }
      } catch (settingsError) {
        console.warn('Could not fetch business settings from API, using local data:', settingsError)
      }

      // Only use business store data as fallback if API has no data
      if (!apiDataFound && business) {
        console.log('No API data found, using business store data as fallback:', business)
        setFormData((prev) => ({
          ...prev,
          companyName: business.companyName || prev.companyName || '',
          phoneNumber: business.phoneNumber || prev.phoneNumber || '',
          address: business.address || prev.address || '',
          sale_rounding_option:
            business.sale_rounding_option || prev.sale_rounding_option || 'none',
        }))
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Failed to load business settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInputChange = (field: keyof BusinessSettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'scanner') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoPreview(reader.result as string)
        setLogoFile(file)
      } else {
        setScannerLogoPreview(reader.result as string)
        setScannerLogoFile(file)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'scanner') => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const input = type === 'logo' ? logoInputRef.current : scannerLogoInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleImageChange({ target: input } as React.ChangeEvent<HTMLInputElement>, type)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.companyName?.trim()) {
      toast.error('Company name is required')
      return
    }

    if (!formData.business_category_id) {
      toast.error('Business category is required')
      return
    }

    if (formData.vat_name && !formData.vat_no) {
      toast.error('VAT/GST number is required when VAT/GST title is provided')
      return
    }

    setSubmitting(true)

    try {
      const submitData: Record<string, unknown> = {
        companyName: formData.companyName,
        business_category_id: formData.business_category_id,
        address: formData.address || '',
        phoneNumber: formData.phoneNumber || '',
        email: formData.email || '',
        vat_name: formData.vat_name || '',
        vat_no: formData.vat_no || '',
        sale_rounding_option: formData.sale_rounding_option || 'none',
        product_profit_option: formData.product_profit_option || 'markup',
        note: formData.note || '',
        note_label: formData.note_label || '',
        gratitude_message: formData.gratitude_message || '',
      }

      // Add files if selected
      if (logoFile) {
        submitData.invoice_logo = logoFile
      }
      if (scannerLogoFile) {
        submitData.invoice_scanner_logo = scannerLogoFile
      }

      const response = await settingsService.updateBusinessSettings(submitData)

      toast.success(response.message || 'Business settings updated successfully')

      // Immediately update the form with submitted values
      setFormData((prev) => ({
        ...prev,
        companyName: submitData.companyName as string,
        business_category_id: submitData.business_category_id as number,
        address: submitData.address as string,
        phoneNumber: submitData.phoneNumber as string,
        email: submitData.email as string,
        vat_name: submitData.vat_name as string,
        vat_no: submitData.vat_no as string,
        sale_rounding_option: submitData.sale_rounding_option as RoundingOption,
        product_profit_option: submitData.product_profit_option as ProfitOption,
        note: submitData.note as string,
        note_label: submitData.note_label as string,
        gratitude_message: submitData.gratitude_message as string,
      }))

      // If response has updated data, use that
      if (response.data) {
        setFormData(response.data)
        if (response.data.invoice_logo) {
          setLogoPreview(getImageUrl(response.data.invoice_logo))
        }
        if (response.data.invoice_scanner_logo) {
          setScannerLogoPreview(getImageUrl(response.data.invoice_scanner_logo))
        }
      }

      // Clear file states
      setLogoFile(null)
      setScannerLogoFile(null)

      // Refetch business store to update cached data (e.g., gratitude_message for receipts)
      fetchBusiness().catch(console.error)

      // Refetch in background to ensure sync with latest API data
      setTimeout(() => {
        fetchData().catch(console.error)
      }, 1000)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      console.error('Failed to update settings:', error)
      toast.error(err.response?.data?.message || 'Failed to update business settings')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
          <CardDescription>Manage your business information and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two Column Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Business Category */}
              <div className="space-y-2">
                <Label htmlFor="business_category_id">
                  Business Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.business_category_id?.toString()}
                  onValueChange={(value) =>
                    handleInputChange('business_category_id', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              {/* VAT/GST Number */}
              <div className="space-y-2">
                <Label htmlFor="vat_no">VAT/GST Number</Label>
                <Input
                  id="vat_no"
                  placeholder="Enter VAT/GST Number"
                  value={formData.vat_no || ''}
                  onChange={(e) => handleInputChange('vat_no', e.target.value)}
                />
              </div>

              {/* Product Profit Option */}
              <div className="space-y-2">
                <Label htmlFor="product_profit_option">Product Profit Option</Label>
                <Select
                  value={formData.product_profit_option || 'markup'}
                  onValueChange={(value) =>
                    handleInputChange('product_profit_option', value as ProfitOption)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span>
                            {option.label} ({option.description})
                          </span>
                          {formData.product_profit_option === option.value && (
                            <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                              Default
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Note */}
              <div className="space-y-2">
                <Label htmlFor="note">Invoice Note</Label>
                <Textarea
                  id="note"
                  placeholder="Enter note"
                  rows={3}
                  value={formData.note || ''}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">
                  Company / Business Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={formData.companyName || ''}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  required
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              {/* VAT/GST Title */}
              <div className="space-y-2">
                <Label htmlFor="vat_name">VAT/GST Title</Label>
                <Input
                  id="vat_name"
                  placeholder="Enter VAT/GST Title"
                  value={formData.vat_name || ''}
                  onChange={(e) => handleInputChange('vat_name', e.target.value)}
                />
              </div>

              {/* Sale Rounding Option */}
              <div className="space-y-2">
                <Label htmlFor="sale_rounding_option">Sale Rounding Option</Label>
                <Select
                  value={formData.sale_rounding_option || 'none'}
                  onValueChange={(value) =>
                    handleInputChange('sale_rounding_option', value as RoundingOption)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROUNDING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice label */}
              <div className="space-y-2">
                <Label htmlFor="note_label">Invoice label</Label>
                <Input
                  id="note_label"
                  placeholder="Enter label"
                  value={formData.note_label || ''}
                  onChange={(e) => handleInputChange('note_label', e.target.value)}
                />
              </div>

              {/* Post Sale Message */}
              <div className="space-y-2">
                <Label htmlFor="gratitude_message">Post Sale Message</Label>
                <Textarea
                  id="gratitude_message"
                  placeholder="Enter message"
                  rows={3}
                  value={formData.gratitude_message || ''}
                  onChange={(e) => handleInputChange('gratitude_message', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Image Uploads - Full Width */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Invoice Scanner Logo */}
            <div className="space-y-2">
              <Label>Invoice Scanner Logo</Label>
              <div
                className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
                onClick={() => scannerLogoInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'scanner')}
              >
                {scannerLogoPreview ? (
                  <div className="relative h-full w-full p-4">
                    <img
                      src={scannerLogoPreview}
                      alt="Scanner Logo Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & Drop Image</p>
                  </>
                )}
              </div>
              <input
                ref={scannerLogoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, 'scanner')}
              />
            </div>

            {/* Invoice Logo */}
            <div className="space-y-2">
              <Label>Invoice Logo</Label>
              <div
                className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50 hover:bg-muted"
                onClick={() => logoInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'logo')}
              >
                {logoPreview ? (
                  <div className="relative h-full w-full p-4">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & Drop Image</p>
                  </>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, 'logo')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button type="submit" size="lg" disabled={submitting} className="min-w-[200px]">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
