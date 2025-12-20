import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LabelPayload } from '@/api/services/print-labels.service'

interface BarcodePreviewProps {
  barcodes: LabelPayload[]
  paperSetting: string
}

const paperDimensions: Record<string, { width: string; height: string; cols: number }> = {
  '1': { width: '38mm', height: '25mm', cols: 4 }, // Roll 38mm x 25mm
  '2': { width: '50mm', height: '25mm', cols: 3 }, // Roll 50mm x 25mm
  '3': { width: '50.8mm', height: '31.75mm', cols: 4 }, // A4 sheet 2"x1.25" (8 per row)
}

export function BarcodePreview({ barcodes, paperSetting }: BarcodePreviewProps) {
  const dims = paperDimensions[paperSetting] || paperDimensions['1']

  const convertPtToPixels = (pt: number): number => {
    return (pt * 96) / 72 // Approximate conversion: pt to px
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">{barcodes.length}</span> barcodes to print
        </p>
      </div>

      <ScrollArea className="h-96 border rounded-lg p-4 bg-muted/50">
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${dims.cols}, 1fr)` }}>
          {barcodes.map((barcode, idx) => (
            <Card
              key={idx}
              className="overflow-hidden flex flex-col bg-white"
              style={{
                width: dims.width,
                height: dims.height,
              }}
            >
              <CardContent className="p-1 h-full flex flex-col justify-center items-center text-center overflow-hidden gap-0.5">
                {/* Business Name */}
                {barcode.show_business_name && barcode.business_name && (
                  <div
                    className="font-semibold truncate w-full leading-tight"
                    style={{
                      fontSize: `${convertPtToPixels(barcode.business_name_size)}px`,
                    }}
                  >
                    {barcode.business_name}
                  </div>
                )}

                {/* Product Name */}
                {barcode.show_product_name && barcode.product_name && (
                  <div
                    className="truncate w-full leading-tight"
                    style={{
                      fontSize: `${convertPtToPixels(barcode.product_name_size)}px`,
                    }}
                  >
                    {barcode.product_name}
                  </div>
                )}

                {/* Price Line */}
                {barcode.show_product_price && typeof barcode.product_price === 'number' && (
                  <div
                    className="font-semibold leading-tight"
                    style={{
                      fontSize: `${convertPtToPixels(barcode.product_price_size)}px`,
                    }}
                  >
                    Price: ${barcode.product_price.toFixed(2)}
                  </div>
                )}

                {/* Barcode Image */}
                {barcode.barcode_svg && (
                  <div className="flex-1 w-full flex items-center justify-center min-h-0 my-0.5">
                    <img
                      className="max-h-full max-w-full object-contain"
                      src={barcode.barcode_svg.startsWith('<svg')
                        ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(barcode.barcode_svg)))}`
                        : `data:image/png;base64,${barcode.barcode_svg}`}
                      alt={barcode.product_code || 'barcode'}
                    />
                  </div>
                )}

                {/* Product Code (always below barcode) */}
                {barcode.show_product_code && barcode.product_code && (
                  <div
                    className="truncate w-full leading-tight"
                    style={{
                      fontSize: `${convertPtToPixels(barcode.product_code_size)}px`,
                    }}
                  >
                    {barcode.product_code}
                  </div>
                )}

                {/* Packing Date */}
                {barcode.show_pack_date && barcode.packing_date && (
                  <div
                    className="text-muted-foreground leading-tight"
                    style={{
                      fontSize: `${convertPtToPixels(barcode.pack_date_size)}px`,
                    }}
                  >
                    {barcode.packing_date}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Preview shows {dims.cols} columns. Paper: {paperSetting === '1' ? 'Roll 38mm×25mm' : paperSetting === '2' ? 'Roll 50mm×25mm' : 'A4 Sheet 2"×1.25"'}
      </p>
    </div>
  )
}
