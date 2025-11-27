/**
 * Base Repository
 * Provides common CRUD operations for IndexedDB tables
 */

import type { Table } from 'dexie'

export abstract class BaseRepository<T, K = number> {
  constructor(protected table: Table<T, K>) {}

  /**
   * Get all records
   */
  async getAll(): Promise<T[]> {
    return await this.table.toArray()
  }

  /**
   * Get record by primary key
   */
  async getById(id: K): Promise<T | undefined> {
    return await this.table.get(id)
  }

  /**
   * Get multiple records by keys
   */
  async getByIds(ids: K[]): Promise<T[]> {
    return await this.table.bulkGet(ids).then((results) =>
      results.filter((item): item is T => item !== undefined)
    )
  }

  /**
   * Create new record
   */
  async create(data: T): Promise<K> {
    return await this.table.add(data)
  }

  /**
   * Create multiple records
   */
  async createMany(data: T[]): Promise<K[]> {
    return await this.table.bulkAdd(data, { allKeys: true }) as K[]
  }

  /**
   * Update existing record
   */
  async update(id: K, data: Partial<T>): Promise<number> {
    return await this.table.update(id, data)
  }

  /**
   * Update or insert record
   */
  async upsert(data: T): Promise<K> {
    return await this.table.put(data)
  }

  /**
   * Update or insert multiple records
   */
  async upsertMany(data: T[]): Promise<K[]> {
    return await this.table.bulkPut(data, { allKeys: true }) as K[]
  }

  /**
   * Delete record by key
   */
  async delete(id: K): Promise<void> {
    await this.table.delete(id)
  }

  /**
   * Delete multiple records
   */
  async deleteMany(ids: K[]): Promise<void> {
    await this.table.bulkDelete(ids)
  }

  /**
   * Clear all records
   */
  async clear(): Promise<void> {
    await this.table.clear()
  }

  /**
   * Count total records
   */
  async count(): Promise<number> {
    return await this.table.count()
  }

  /**
   * Check if record exists
   */
  async exists(id: K): Promise<boolean> {
    const record = await this.table.get(id)
    return record !== undefined
  }
}
