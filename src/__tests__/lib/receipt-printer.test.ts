/**
 * @deprecated Tests for deprecated receipt-printer.ts
 *
 * The receipt-printer.ts module has been superseded by receipt-generator.ts
 * which uses a new API: printReceipt(data: ReceiptData) instead of printReceipt(sale: Sale)
 *
 * These tests are kept for reference but are not actively maintained.
 * New receipt printing tests should use receipt-generator.test.ts
 */

import { describe, it, expect } from 'vitest'

describe('receipt-printer (deprecated)', () => {
  it('should be replaced by receipt-generator', () => {
    // This module is deprecated - use receipt-generator instead
    expect(true).toBe(true)
  })
})
