import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Dexie, { type Table } from 'dexie'
import { BaseRepository } from '@/lib/db/repositories/base.repository'

// ============================================
// Test Database Setup
// ============================================

interface TestItem {
  id?: number
  name: string
  value: number
  category?: string
}

class TestDatabase extends Dexie {
  items!: Table<TestItem, number>

  constructor() {
    super('TestDatabase')
    this.version(1).stores({
      items: '++id, name, category',
    })
  }
}

class TestRepository extends BaseRepository<TestItem, number> {
  constructor(table: Table<TestItem, number>) {
    super(table)
  }
}

// ============================================
// Test Suite
// ============================================

describe('BaseRepository', () => {
  let db: TestDatabase
  let repository: TestRepository

  beforeEach(async () => {
    // Create fresh database for each test
    db = new TestDatabase()
    await db.open()
    repository = new TestRepository(db.items)
  })

  afterEach(async () => {
    // Clean up
    await db.delete()
  })

  describe('create', () => {
    it('should create a new record and return its ID', async () => {
      const item: TestItem = { name: 'Test Item', value: 100 }

      const id = await repository.create(item)

      expect(id).toBe(1)

      const stored = await db.items.get(id)
      expect(stored).toBeDefined()
      expect(stored?.name).toBe('Test Item')
      expect(stored?.value).toBe(100)
    })

    it('should auto-increment IDs for multiple creates', async () => {
      const id1 = await repository.create({ name: 'Item 1', value: 10 })
      const id2 = await repository.create({ name: 'Item 2', value: 20 })
      const id3 = await repository.create({ name: 'Item 3', value: 30 })

      expect(id1).toBe(1)
      expect(id2).toBe(2)
      expect(id3).toBe(3)
    })
  })

  describe('createMany', () => {
    it('should create multiple records and return all IDs', async () => {
      const items: TestItem[] = [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ]

      const ids = await repository.createMany(items)

      expect(ids).toHaveLength(3)
      expect(ids).toEqual([1, 2, 3])

      const count = await db.items.count()
      expect(count).toBe(3)
    })
  })

  describe('getById', () => {
    it('should retrieve a record by its ID', async () => {
      await db.items.add({ name: 'Test Item', value: 100 })

      const result = await repository.getById(1)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test Item')
      expect(result?.value).toBe(100)
    })

    it('should return undefined for non-existent ID', async () => {
      const result = await repository.getById(999)

      expect(result).toBeUndefined()
    })
  })

  describe('getByIds', () => {
    it('should retrieve multiple records by IDs', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ])

      const results = await repository.getByIds([1, 3])

      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('Item 1')
      expect(results[1].name).toBe('Item 3')
    })

    it('should filter out non-existent IDs', async () => {
      await db.items.add({ name: 'Only Item', value: 100 })

      const results = await repository.getByIds([1, 999, 888])

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Only Item')
    })

    it('should return empty array for all non-existent IDs', async () => {
      const results = await repository.getByIds([999, 888, 777])

      expect(results).toEqual([])
    })
  })

  describe('getAll', () => {
    it('should retrieve all records', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ])

      const results = await repository.getAll()

      expect(results).toHaveLength(3)
    })

    it('should return empty array when no records exist', async () => {
      const results = await repository.getAll()

      expect(results).toEqual([])
    })
  })

  describe('update', () => {
    it('should update existing record', async () => {
      const id = await db.items.add({ name: 'Original', value: 100 })

      const updated = await repository.update(id, { name: 'Updated', value: 200 })

      expect(updated).toBe(1) // Number of records updated

      const stored = await db.items.get(id)
      expect(stored?.name).toBe('Updated')
      expect(stored?.value).toBe(200)
    })

    it('should only update specified fields', async () => {
      const id = await db.items.add({
        name: 'Original',
        value: 100,
        category: 'A',
      })

      await repository.update(id, { value: 999 })

      const stored = await db.items.get(id)
      expect(stored?.name).toBe('Original') // Unchanged
      expect(stored?.value).toBe(999) // Changed
      expect(stored?.category).toBe('A') // Unchanged
    })

    it('should return 0 when updating non-existent record', async () => {
      const updated = await repository.update(999, { name: 'Test' })

      expect(updated).toBe(0)
    })
  })

  describe('upsert', () => {
    it('should insert new record if ID does not exist', async () => {
      const id = await repository.upsert({ id: 1, name: 'New Item', value: 100 })

      expect(id).toBe(1)

      const stored = await db.items.get(1)
      expect(stored?.name).toBe('New Item')
    })

    it('should update existing record if ID exists', async () => {
      await db.items.add({ name: 'Original', value: 100 })

      await repository.upsert({ id: 1, name: 'Updated', value: 200 })

      const stored = await db.items.get(1)
      expect(stored?.name).toBe('Updated')
      expect(stored?.value).toBe(200)

      const count = await db.items.count()
      expect(count).toBe(1) // No duplicate created
    })
  })

  describe('upsertMany', () => {
    it('should upsert multiple records', async () => {
      // Create one existing record
      await db.items.add({ name: 'Existing', value: 100 })

      // Upsert: update existing + add new
      const ids = await repository.upsertMany([
        { id: 1, name: 'Updated Existing', value: 150 },
        { name: 'New Item 1', value: 200 },
        { name: 'New Item 2', value: 300 },
      ])

      expect(ids).toHaveLength(3)

      const all = await db.items.toArray()
      expect(all).toHaveLength(3)
      expect(all.find((i) => i.id === 1)?.name).toBe('Updated Existing')
    })
  })

  describe('delete', () => {
    it('should delete record by ID', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
      ])

      await repository.delete(1)

      const count = await db.items.count()
      expect(count).toBe(1)

      const remaining = await db.items.get(2)
      expect(remaining?.name).toBe('Item 2')
    })

    it('should not throw when deleting non-existent record', async () => {
      await expect(repository.delete(999)).resolves.not.toThrow()
    })
  })

  describe('deleteMany', () => {
    it('should delete multiple records by IDs', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
        { name: 'Item 4', value: 40 },
      ])

      await repository.deleteMany([1, 3])

      const count = await db.items.count()
      expect(count).toBe(2)

      const remaining = await db.items.toArray()
      expect(remaining.map((i) => i.name)).toEqual(['Item 2', 'Item 4'])
    })
  })

  describe('clear', () => {
    it('should delete all records', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ])

      await repository.clear()

      const count = await db.items.count()
      expect(count).toBe(0)
    })
  })

  describe('count', () => {
    it('should return total number of records', async () => {
      await db.items.bulkAdd([
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ])

      const count = await repository.count()

      expect(count).toBe(3)
    })

    it('should return 0 when no records exist', async () => {
      const count = await repository.count()

      expect(count).toBe(0)
    })
  })

  describe('exists', () => {
    it('should return true for existing record', async () => {
      await db.items.add({ name: 'Test', value: 100 })

      const exists = await repository.exists(1)

      expect(exists).toBe(true)
    })

    it('should return false for non-existent record', async () => {
      const exists = await repository.exists(999)

      expect(exists).toBe(false)
    })
  })
})
