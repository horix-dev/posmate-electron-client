import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StockAdjustmentList } from '@/pages/inventory/components/StockAdjustmentList'
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
  serverId: undefined,
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
  syncStatus: 'pending',
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

describe('StockAdjustmentList', () => {
  const mockOnViewDetails = vi.fn()
  const mockOnRetrySync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render empty state when no adjustments', () => {
    render(
      <StockAdjustmentList
        adjustments={[]}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText(/no stock adjustments found/i)).toBeInTheDocument()
  })

  it('should render loading state', () => {
    render(
      <StockAdjustmentList
        adjustments={[]}
        products={[]}
        isLoading={true}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText(/loading adjustments/i)).toBeInTheDocument()
  })

  it('should render adjustments list', () => {
    const products = [createMockProduct()]
    const adjustments = [createMockAdjustment()]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={products}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('TP001')).toBeInTheDocument()
    expect(screen.getByText('Initial Stock')).toBeInTheDocument()
  })

  it('should display product name from products prop', () => {
    const products = [createMockProduct({ id: 1, productName: 'Custom Product' })]
    const adjustments = [createMockAdjustment({ productId: 1 })]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={products}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('Custom Product')).toBeInTheDocument()
  })

  it('should fallback to "Product #ID" when product not found', () => {
    const adjustments = [createMockAdjustment({ productId: 999 })]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('Product #999')).toBeInTheDocument()
  })

  it('should display correct type badge', () => {
    const adjustments = [
      createMockAdjustment({ id: 1, type: 'in' }),
      createMockAdjustment({ id: 2, type: 'out' }),
    ]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    const inBadges = screen.getAllByText('In')
    const outBadges = screen.getAllByText('Out')

    expect(inBadges).toHaveLength(1)
    expect(outBadges).toHaveLength(1)
  })

  it('should display sync status badges', () => {
    const adjustments = [
      createMockAdjustment({ id: 1, syncStatus: 'synced' }),
      createMockAdjustment({ id: 2, syncStatus: 'pending' }),
      createMockAdjustment({ id: 3, syncStatus: 'error' }),
    ]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('Synced')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('should call onViewDetails when view button clicked', async () => {
    const adjustment = createMockAdjustment()
    render(
      <StockAdjustmentList
        adjustments={[adjustment]}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    const viewButton = screen.getByRole('button', { name: /view/i })
    fireEvent.click(viewButton)

    await waitFor(() => {
      expect(mockOnViewDetails).toHaveBeenCalledWith(adjustment)
    })
  })

  it('should show retry button for error status', () => {
    const adjustment = createMockAdjustment({ syncStatus: 'error' })

    render(
      <StockAdjustmentList
        adjustments={[adjustment]}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    const retryButton = screen.getByRole('button', { name: /retry sync/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('should call onRetrySync when retry button clicked', async () => {
    const adjustment = createMockAdjustment({ syncStatus: 'error' })

    render(
      <StockAdjustmentList
        adjustments={[adjustment]}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    const retryButton = screen.getByRole('button', { name: /retry sync/i })
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(mockOnRetrySync).toHaveBeenCalledWith(adjustment)
    })
  })

  it('should display quantity with correct sign', () => {
    const adjustments = [
      createMockAdjustment({ id: 1, type: 'in', quantity: 10 }),
      createMockAdjustment({ id: 2, type: 'out', quantity: 5 }),
    ]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('+10')).toBeInTheDocument()
    expect(screen.getByText('-5')).toBeInTheDocument()
  })

  it('should display stock changes', () => {
    const adjustment = createMockAdjustment({
      oldQuantity: 100,
      newQuantity: 110,
    })

    render(
      <StockAdjustmentList
        adjustments={[adjustment]}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('110')).toBeInTheDocument()
  })

  it('should sort adjustments by date (newest first)', () => {
    const adjustments = [
      createMockAdjustment({ id: 1, adjustmentDate: '2025-12-25T10:00:00Z' }),
      createMockAdjustment({ id: 2, adjustmentDate: '2025-12-26T10:00:00Z' }),
      createMockAdjustment({ id: 3, adjustmentDate: '2025-12-24T10:00:00Z' }),
    ]

    render(
      <StockAdjustmentList
        adjustments={adjustments}
        products={[]}
        onViewDetails={mockOnViewDetails}
        onRetrySync={mockOnRetrySync}
      />
    )

    const rows = screen.getAllByRole('row')
    // First row is header, so data starts at index 1
    expect(rows[1]).toHaveTextContent('Dec 26, 2025')
    expect(rows[2]).toHaveTextContent('Dec 25, 2025')
    expect(rows[3]).toHaveTextContent('Dec 24, 2025')
  })
})
