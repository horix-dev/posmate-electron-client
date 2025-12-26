import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StockAdjustmentDetailsDialog } from '@/pages/inventory/components/StockAdjustmentDetailsDialog'
import type { StockAdjustment } from '@/types/stockAdjustment.types'
import type { Product } from '@/types/api.types'

// ============================================
// Test Fixtures
// ============================================

const createMockProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 1,
    productName: 'Test Product',
    productCode: 'TP001',
    product_type: 'simple',
    productStock: 100,
    alert_qty: 10,
    ...overrides,
  }) as Product

const createMockAdjustment = (overrides: Partial<StockAdjustment> = {}): StockAdjustment => ({
  id: 1,
  serverId: 100,
  productId: 1,
  variantId: undefined,
  batchId: undefined,
  type: 'in',
  quantity: 10,
  reason: 'Initial Stock',
  referenceNumber: 'REF-001',
  notes: 'Test notes',
  adjustedBy: 1,
  adjustmentDate: '2025-12-26T10:00:00Z',
  syncStatus: 'synced',
  syncError: undefined,
  oldQuantity: 100,
  newQuantity: 110,
  createdAt: '2025-12-26T10:00:00Z',
  updatedAt: '2025-12-26T10:00:00Z',
  ...overrides,
})

// ============================================
// Test Suite
// ============================================

describe('StockAdjustmentDetailsDialog', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when adjustment is null', () => {
    const { container } = render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={null}
        product={undefined}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('should render dialog with adjustment details', () => {
    const adjustment = createMockAdjustment()
    const product = createMockProduct()

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={product}
      />
    )

    expect(screen.getByText('Stock Adjustment Details')).toBeInTheDocument()
    expect(screen.getByText(/Adjustment ID: 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Server ID: 100/i)).toBeInTheDocument()
  })

  it('should display product information', () => {
    const adjustment = createMockAdjustment()
    const product = createMockProduct()

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={product}
      />
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText(/Code: TP001/i)).toBeInTheDocument()
  })

  it('should display fallback product name when product not provided', () => {
    const adjustment = createMockAdjustment({ productId: 999 })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Product #999')).toBeInTheDocument()
  })

  it('should display Stock In badge for in type', () => {
    const adjustment = createMockAdjustment({ type: 'in' })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Stock In')).toBeInTheDocument()
  })

  it('should display Stock Out badge for out type', () => {
    const adjustment = createMockAdjustment({ type: 'out' })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Stock Out')).toBeInTheDocument()
  })

  it('should display sync status - synced', () => {
    const adjustment = createMockAdjustment({ syncStatus: 'synced' })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Synced')).toBeInTheDocument()
  })

  it('should display sync status - pending', () => {
    const adjustment = createMockAdjustment({ syncStatus: 'pending', serverId: undefined })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Pending Sync')).toBeInTheDocument()
  })

  it('should display sync status - error with message', () => {
    const adjustment = createMockAdjustment({
      syncStatus: 'error',
      syncError: 'Network timeout',
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getAllByText('Sync Error')[0]).toBeInTheDocument()
    expect(screen.getByText('Network timeout')).toBeInTheDocument()
  })

  it('should display quantity with correct sign', () => {
    const inAdjustment = createMockAdjustment({ type: 'in', quantity: 10 })
    const { rerender } = render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={inAdjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('+10')).toBeInTheDocument()

    const outAdjustment = createMockAdjustment({ type: 'out', quantity: 5 })
    rerender(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={outAdjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('-5')).toBeInTheDocument()
  })

  it('should display old and new stock quantities', () => {
    const adjustment = createMockAdjustment({
      oldQuantity: 100,
      newQuantity: 110,
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('110')).toBeInTheDocument()
    expect(screen.getByText('Previous Stock')).toBeInTheDocument()
    expect(screen.getByText('New Stock')).toBeInTheDocument()
  })

  it('should display reason and date', () => {
    const adjustment = createMockAdjustment({
      reason: 'Damaged Goods',
      adjustmentDate: '2025-12-26T15:30:00Z',
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('Damaged Goods')).toBeInTheDocument()
    expect(screen.getByText('Dec 26, 2025 21:00')).toBeInTheDocument()
  })

  it('should display reference number', () => {
    const adjustment = createMockAdjustment({
      referenceNumber: 'REF-12345',
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('REF-12345')).toBeInTheDocument()
  })

  it('should display notes', () => {
    const adjustment = createMockAdjustment({
      notes: 'These are detailed notes about the adjustment',
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText('These are detailed notes about the adjustment')).toBeInTheDocument()
  })

  it('should display metadata timestamps', () => {
    const adjustment = createMockAdjustment({
      createdAt: '2025-12-26T10:00:00Z',
      updatedAt: '2025-12-26T11:00:00Z',
      adjustedBy: 5,
    })

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    expect(screen.getByText(/Created:/i)).toBeInTheDocument()
    expect(screen.getByText(/Updated:/i)).toBeInTheDocument()
    expect(screen.getByText(/Adjusted by User ID: 5/i)).toBeInTheDocument()
  })

  it('should call onOpenChange when dialog is closed', async () => {
    const adjustment = createMockAdjustment()

    render(
      <StockAdjustmentDetailsDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        adjustment={adjustment}
        product={undefined}
      />
    )

    // Simulate closing the dialog (typically by clicking overlay or close button)
    // This depends on your Dialog component implementation
    const closeButton = screen.getByRole('button', { name: /close/i })
    if (closeButton) {
      fireEvent.click(closeButton)
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    }
  })
})
