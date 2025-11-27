/**
 * Held Cart Repository
 * Manages carts that are held/saved for later
 */

import { db } from '../schema'
import type { HeldCart } from '../schema'
import { BaseRepository } from './base.repository'

export class HeldCartRepository extends BaseRepository<HeldCart, number> {
  constructor() {
    super(db.heldCarts)
  }

  /**
   * Get cart by cartId (UUID)
   */
  async getByCartId(cartId: string): Promise<HeldCart | undefined> {
    return await this.table.where('cartId').equals(cartId).first()
  }

  /**
   * Get carts by customer
   */
  async getByCustomer(customerId: number): Promise<HeldCart[]> {
    return await this.table.where('customerId').equals(customerId).toArray()
  }

  /**
   * Get all held carts (sorted by creation time, newest first)
   */
  async getAllSorted(): Promise<HeldCart[]> {
    return await this.table.orderBy('createdAt').reverse().toArray()
  }

  /**
   * Delete cart by cartId
   */
  async deleteByCartId(cartId: string): Promise<void> {
    const cart = await this.getByCartId(cartId)
    if (cart?.id) {
      await this.delete(cart.id)
    }
  }

  /**
   * Count held carts
   */
  async countHeld(): Promise<number> {
    return await this.count()
  }

  /**
   * Clear old held carts (older than specified days)
   */
  async clearOld(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)
    const cutoffISO = cutoffDate.toISOString()

    const oldCarts = await this.table
      .where('createdAt')
      .below(cutoffISO)
      .toArray()

    const ids = oldCarts
      .map((cart) => cart.id)
      .filter((id): id is number => id !== undefined)

    await this.deleteMany(ids)
  }
}

// Export singleton instance
export const heldCartRepository = new HeldCartRepository()
