/**
 * Printed Receipt Repository
 * 
 * Manages tracking of offline-printed receipts for invoice number updates
 */

import { db, type PrintedReceipt } from '../schema'

export class PrintedReceiptRepository {
  /**
   * Create a new printed receipt record
   */
  async create(receipt: Omit<PrintedReceipt, 'id'>): Promise<number> {
    return await db.printedReceipts.add(receipt)
  }

  /**
   * Find printed receipt by sale ID
   */
  async findBySaleId(saleId: number): Promise<PrintedReceipt | undefined> {
    return await db.printedReceipts
      .where('saleId')
      .equals(saleId)
      .first()
  }

  /**
   * Get all printed receipts with a specific status
   */
  async findByStatus(status: PrintedReceipt['status']): Promise<PrintedReceipt[]> {
    return await db.printedReceipts
      .where('status')
      .equals(status)
      .toArray()
  }

  /**
   * Get all printed receipts that need update notification (pending_update or updated)
   */
  async findNeedingReprint(): Promise<PrintedReceipt[]> {
    return await db.printedReceipts
      .where('status')
      .anyOf(['pending_update', 'updated'])
      .toArray()
  }

  /**
   * Update printed receipt with final invoice number
   */
  async updateWithFinalInvoice(
    id: number,
    finalInvoiceNumber: string
  ): Promise<void> {
    await db.printedReceipts.update(id, {
      finalInvoiceNumber,
      status: 'updated',
    })
  }

  /**
   * Mark receipt as reprinted
   */
  async markAsReprinted(id: number): Promise<void> {
    await db.printedReceipts.update(id, {
      status: 'reprinted',
      reprintedAt: new Date().toISOString(),
    })
  }

  /**
   * Get all printed receipts
   */
  async getAll(): Promise<PrintedReceipt[]> {
    return await db.printedReceipts.toArray()
  }

  /**
   * Delete a printed receipt record
   */
  async delete(id: number): Promise<void> {
    await db.printedReceipts.delete(id)
  }

  /**
   * Clear all printed receipt records
   */
  async clear(): Promise<void> {
    await db.printedReceipts.clear()
  }
}

// Export singleton instance
export const printedReceiptRepository = new PrintedReceiptRepository()
