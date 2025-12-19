import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BarcodeType {
  value: string
  label: string
}

interface PaperSetting {
  value: string
  label: string
  name: string
  dimensions?: string
}

interface LabelConfigurationProps {
  showBusinessName: boolean
  onShowBusinessNameChange: (value: boolean) => void
  businessNameSize: number
  onBusinessNameSizeChange: (value: number) => void

  showProductName: boolean
  onShowProductNameChange: (value: boolean) => void
  productNameSize: number
  onProductNameSizeChange: (value: number) => void

  showProductPrice: boolean
  onShowProductPriceChange: (value: boolean) => void
  productPriceSize: number
  onProductPriceSizeChange: (value: number) => void

  showProductCode: boolean
  onShowProductCodeChange: (value: boolean) => void
  productCodeSize: number
  onProductCodeSizeChange: (value: number) => void

  showPackDate: boolean
  onShowPackDateChange: (value: boolean) => void
  packDateSize: number
  onPackDateSizeChange: (value: number) => void

  vatType: 'inclusive' | 'exclusive'
  onVatTypeChange: (value: 'inclusive' | 'exclusive') => void

  barcodeTypes: BarcodeType[]
  selectedBarcodeType: string
  onBarcodeTypeChange: (value: string) => void

  paperSettings: PaperSetting[]
  selectedPaperSetting: string
  onPaperSettingChange: (value: string) => void
}

export function LabelConfiguration({
  showBusinessName,
  onShowBusinessNameChange,
  businessNameSize,
  onBusinessNameSizeChange,
  showProductName,
  onShowProductNameChange,
  productNameSize,
  onProductNameSizeChange,
  showProductPrice,
  onShowProductPriceChange,
  productPriceSize,
  onProductPriceSizeChange,
  showProductCode,
  onShowProductCodeChange,
  productCodeSize,
  onProductCodeSizeChange,
  showPackDate,
  onShowPackDateChange,
  packDateSize,
  onPackDateSizeChange,
  vatType,
  onVatTypeChange,
  barcodeTypes,
  selectedBarcodeType,
  onBarcodeTypeChange,
  paperSettings,
  selectedPaperSetting,
  onPaperSettingChange,
}: LabelConfigurationProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">Information To Show In Labels</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Business Name */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-business"
              checked={showBusinessName}
              onCheckedChange={(checked) => onShowBusinessNameChange(checked as boolean)}
            />
            <Label htmlFor="show-business" className="font-medium cursor-pointer">Business Name</Label>
          </div>
          {showBusinessName && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Size</span>
              <Input
                type="number"
                value={businessNameSize}
                onChange={(e) => onBusinessNameSizeChange(Number(e.target.value))}
                className="h-8"
              />
            </div>
          )}
        </div>

        {/* Product Name */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-product-name"
              checked={showProductName}
              onCheckedChange={(checked) => onShowProductNameChange(checked as boolean)}
            />
            <Label htmlFor="show-product-name" className="font-medium cursor-pointer">Product Name</Label>
          </div>
          {showProductName && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Size</span>
              <Input
                type="number"
                value={productNameSize}
                onChange={(e) => onProductNameSizeChange(Number(e.target.value))}
                className="h-8"
              />
            </div>
          )}
        </div>

        {/* Product Price */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-price"
              checked={showProductPrice}
              onCheckedChange={(checked) => onShowProductPriceChange(checked as boolean)}
            />
            <Label htmlFor="show-price" className="font-medium cursor-pointer">Product Price</Label>
          </div>
          {showProductPrice && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Size</span>
              <Input
                type="number"
                value={productPriceSize}
                onChange={(e) => onProductPriceSizeChange(Number(e.target.value))}
                className="h-8"
              />
            </div>
          )}
        </div>

        {/* Product Code */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-code"
              checked={showProductCode}
              onCheckedChange={(checked) => onShowProductCodeChange(checked as boolean)}
            />
            <Label htmlFor="show-code" className="font-medium cursor-pointer">Product Code</Label>
          </div>
          {showProductCode && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Size</span>
              <Input
                type="number"
                value={productCodeSize}
                onChange={(e) => onProductCodeSizeChange(Number(e.target.value))}
                className="h-8"
              />
            </div>
          )}
        </div>

        {/* Packing Date */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-pack-date"
              checked={showPackDate}
              onCheckedChange={(checked) => onShowPackDateChange(checked as boolean)}
            />
            <Label htmlFor="show-pack-date" className="font-medium cursor-pointer">Print packing date</Label>
          </div>
          {showPackDate && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Size</span>
              <Input
                type="number"
                value={packDateSize}
                onChange={(e) => onPackDateSizeChange(Number(e.target.value))}
                className="h-8"
              />
            </div>
          )}
        </div>

        {/* Show Price (VAT) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Show Price</Label>
          <Select value={vatType} onValueChange={(v: 'inclusive' | 'exclusive') => onVatTypeChange(v)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inclusive">Inc. tax</SelectItem>
              <SelectItem value="exclusive">Exc. tax</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Barcode Type */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Barcode Type *</Label>
          <Select value={selectedBarcodeType} onValueChange={onBarcodeTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select barcode type" />
            </SelectTrigger>
            <SelectContent>
              {barcodeTypes?.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barcode Print Paper Setting */}
      <div className="space-y-2 max-w-md">
        <Label className="text-sm font-medium">Barcode Print Paper Setting</Label>
        <Select value={selectedPaperSetting} onValueChange={onPaperSettingChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select paper size" />
          </SelectTrigger>
          <SelectContent>
            {paperSettings?.map((setting) => (
              <SelectItem key={setting.value} value={setting.value}>
                {setting.label || setting.name}
                {setting.dimensions ? ` - ${setting.dimensions}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
