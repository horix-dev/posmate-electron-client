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

  // console.log('barcodes => ', barcodes);
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

      <ScrollArea className="h-96 rounded-lg border bg-muted/50 p-4">
        <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${dims.cols}, 1fr)` }}>
          {barcodes.map((barcode, idx) => {
            const barcodeNumber = String(barcode.product_code || '')

            return (
              <Card
                key={idx}
                className="flex flex-col overflow-hidden bg-white"
                style={{
                  width: dims.width,
                  height: dims.height,
                  padding: '2px',
                }}
              >
                <CardContent className="relative flex h-full flex-col items-center justify-start gap-0.5 overflow-hidden p-1 text-center">
                  {/* Business Name */}
                  {barcode.show_product_name && barcode.product_name && (
                    <div
                      className="w-full truncate pr-2 font-bold leading-tight"
                      style={{
                        fontSize: `${convertPtToPixels(barcode.business_name_size)}px`,
                      }}
                    >
                      {barcode.product_name}
                    </div>
                  )}

                  {/* Main Content Layout */}
                  <div className="relative flex h-full w-full flex-1">
                    {/* Left Section: Price + Barcode */}
                    <div className="flex flex-1 flex-col items-center justify-around pr-2">
                      {/* Price */}
                      {barcode.show_product_price && typeof barcode.product_price === 'number' && (
                        <div
                          className="text-center font-semibold leading-tight"
                          style={{
                            fontSize: `${convertPtToPixels(barcode.product_price_size)}px`,
                          }}
                        >
                          ${barcode.product_price.toFixed(2)}
                        </div>
                      )}

                      {/* Barcode and Number */}
                      <div className="flex flex-col items-start" style={{ width: '90%' }}>
                        {/* Barcode Image */}
                        <>
                          {barcode.barcode_svg && (
                            <div className="flex w-full items-center justify-around">
                              <img
                                className="object-cover"
                                style={{ maxHeight: '8mm', maxWidth: '100%', minWidth: '85%' }}
                                src={
                                  barcode.barcode_svg.startsWith('data:')
                                    ? barcode.barcode_svg
                                    : barcode.barcode_svg.startsWith('<svg')
                                      ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(barcode.barcode_svg)))}`
                                      : `data:image/png;base64,${barcode.barcode_svg}`
                                }
                                alt={barcode.product_code || 'barcode'}
                              />
                            </div>
                          )}
                          {/* {console.log(' => ', barcodeNumber)} */}
                          {/* Barcode Number */}
                          {barcode.show_product_code && barcodeNumber && (
                            <div
                              className="w-full text-center leading-tight"
                              style={{
                                fontSize: `${Math.max(6, convertPtToPixels(barcode.product_code_size))}px`,
                              }}
                            >
                              {barcodeNumber}
                            </div>
                          )}
                        </>
                      </div>
                    </div>

                    {/* Right Section: Product Description (Rotated) */}
                    {barcode.show_business_name && barcode.business_name && (
                      <div
                        className="absolute right-0 top-1/2 whitespace-nowrap"
                        style={{
                          fontSize: `${convertPtToPixels(barcode.product_name_size)}px`,
                          transform: 'translateY(-50%) rotate(180deg)',
                          writingMode: 'vertical-rl',
                          textOrientation: 'mixed',
                          maxWidth: dims.height,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          paddingLeft: '1mm',
                        }}
                      >
                        {barcode.business_name}
                      </div>
                    )}
                  </div>

                  {/* Packing Date (if shown, at the bottom) */}
                  {barcode.show_pack_date && barcode.packing_date && (
                    <div
                      className="w-full truncate text-xs leading-tight text-muted-foreground"
                      style={{
                        fontSize: `${convertPtToPixels(barcode.pack_date_size)}px`,
                      }}
                    >
                      {barcode.packing_date}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Preview shows {dims.cols} columns. Paper:{' '}
        {paperSetting === '1'
          ? 'Roll 38mm×25mm'
          : paperSetting === '2'
            ? 'Roll 50mm×25mm'
            : 'A4 Sheet 2"×1.25"'}
      </p>
    </div>
  )
}
