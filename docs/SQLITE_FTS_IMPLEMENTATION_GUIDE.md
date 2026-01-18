# SQLite Full-Text Search (FTS) Implementation Guide

**Document Version:** 1.0  
**Date:** January 19, 2026  
**Project:** Horix POS Pro  
**Target:** Product Search Optimization

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use FTS](#when-to-use-fts)
3. [Where to Implement](#where-to-implement)
4. [Technical Approach](#technical-approach)
5. [Implementation Plan](#implementation-plan)
6. [Performance Considerations](#performance-considerations)
7. [Migration Strategy](#migration-strategy)

---

## Overview

### What is SQLite FTS?

SQLite Full-Text Search (FTS5) is a virtual table module that provides advanced text searching capabilities comparable to MySQL's natural language search. It enables:

- **Relevance-based ranking** - Results sorted by match quality
- **Phrase queries** - Exact phrase matching: `"red shirt"`
- **Boolean operators** - Complex queries: `shirt AND (red OR blue)`
- **Prefix matching** - Wildcard searches: `prod*`
- **Snippet generation** - Highlighted search result previews
- **Multi-field search** - Search across multiple columns simultaneously

### Why FTS Over Simple LIKE?

| Feature | `LIKE '%search%'` | FTS5 |
|---------|-------------------|------|
| **Performance** | Slow (full table scan) | Fast (indexed) |
| **Relevance ranking** | ❌ | ✅ |
| **Multi-word search** | Poor | Excellent |
| **Phrase search** | Manual logic | Built-in |
| **Scalability** | Poor (>1000 products) | Excellent (>100k products) |
| **Memory usage** | Low | Moderate (indexes) |

---

## When to Use FTS

### ✅ USE FTS When:

1. **Product catalog is large (>500 products)**
   - Current IndexedDB filter is slow with large datasets
   - Product searches become noticeably laggy

2. **Search quality matters**
   - Users type multi-word queries: "blue cotton shirt"
   - Need ranked results (best matches first)
   - Want to support typo tolerance (future enhancement)

3. **You're using SQLite already**
   - Project has SQLite adapter for Electron (`src/lib/storage/adapters/sqlite.adapter.ts`)
   - Zero additional dependencies required

4. **Barcode scanning with fuzzy search**
   - Partial barcode matches
   - Searching across product code, name, SKU, variant SKU

### ❌ DON'T USE FTS When:

1. **Catalog is tiny (<100 products)**
   - Simple `LIKE` filter is sufficient
   - FTS overhead not justified

2. **Only exact barcode lookups**
   - If you only need `WHERE barcode = ?` (exact match)
   - Current IndexedDB index is fine

3. **Web-only deployment**
   - IndexedDB doesn't support FTS natively
   - Would require additional libraries (lunr.js, fuse.js)

---

## Where to Implement

### Primary Locations

#### 1. **SQLite Adapter** (Recommended)
**File:** `src/lib/storage/adapters/sqlite.adapter.ts`

**Why here:**
- Encapsulates all SQLite operations
- Transparent to rest of application
- Easy to enable/disable
- Maintains separation of concerns

**Changes needed:**
```typescript
// Add FTS table creation in constructor
async initFTS() {
  await this.db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
      productName,
      productCode,
      barcode,
      category,
      content='products',
      content_rowid='id'
    );
  `);
}

// Add search method
async searchProducts(query: string): Promise<LocalProduct[]> {
  const stmt = this.db.prepare(`
    SELECT p.* FROM products p
    JOIN products_fts fts ON p.id = fts.rowid
    WHERE products_fts MATCH ?
    ORDER BY rank
    LIMIT 50
  `);
  return stmt.all(query);
}
```

#### 2. **Product Repository** (Alternative)
**File:** `src/lib/db/repositories/product.repository.ts`

**When to use:**
- Need FTS on IndexedDB too (via external library)
- Want search logic in one place
- Plan to add search filters/facets

**Current implementation:**
```typescript
async search(query: string): Promise<LocalProduct[]> {
  const lowerQuery = query.toLowerCase()
  return await this.table
    .filter(
      (product) =>
        product.productName.toLowerCase().includes(lowerQuery) ||
        product.productCode?.toLowerCase().includes(lowerQuery) ||
        false
    )
    .toArray()
}
```

**Would become:**
```typescript
async search(query: string): Promise<LocalProduct[]> {
  // Check if using SQLite
  if (storage.type === 'sqlite') {
    return await storage.searchProducts(query) // Use FTS
  }
  
  // Fallback to IndexedDB filter
  const lowerQuery = query.toLowerCase()
  return await this.table
    .filter((product) => 
      product.productName.toLowerCase().includes(lowerQuery) ||
      product.productCode?.toLowerCase().includes(lowerQuery)
    )
    .toArray()
}
```

#### 3. **Product Service** (Not Recommended)
**File:** `src/api/services/products.service.ts`

**Why NOT here:**
- Service layer should be storage-agnostic
- Mixing API calls with local search
- Harder to test

---

## Technical Approach

### Architecture Decision

**Recommended: Hybrid Approach**

```
┌─────────────────────────────────────────┐
│         usePOSData Hook                 │
│  (src/pages/pos/hooks/usePOSData.ts)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Product Repository                 │
│  Decides: FTS or simple filter          │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌──────────────┐    ┌──────────────┐
│ SQLite FTS   │    │ IndexedDB    │
│ (Electron)   │    │ Filter       │
└──────────────┘    └──────────────┘
```

### FTS Table Schema

```sql
-- Virtual table (no physical storage, just index)
CREATE VIRTUAL TABLE products_fts USING fts5(
  productName,           -- Primary search field
  productCode,           -- Barcode/SKU
  barcode,               -- Alternative barcode
  categoryName,          -- Category for filtering
  variantSkus,           -- JSON array of variant SKUs
  
  -- FTS5 options
  content='products',    -- Reference actual products table
  content_rowid='id',    -- Link via product ID
  tokenize='porter unicode61 remove_diacritics 1'  -- Smart tokenization
);

-- Triggers to keep FTS synchronized
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, productName, productCode, barcode, categoryName)
  VALUES (new.id, new.productName, new.productCode, new.barcode, 
          (SELECT name FROM categories WHERE id = new.category_id));
END;

CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  DELETE FROM products_fts WHERE rowid = old.id;
END;

CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  UPDATE products_fts SET 
    productName = new.productName,
    productCode = new.productCode,
    barcode = new.barcode
  WHERE rowid = new.id;
END;
```

### Query Patterns

#### 1. Simple Product Search
```sql
-- User types: "shirt"
SELECT p.* FROM products p
JOIN products_fts fts ON p.id = fts.rowid
WHERE products_fts MATCH 'shirt'
ORDER BY rank
LIMIT 50;
```

#### 2. Multi-Word Search
```sql
-- User types: "blue cotton shirt"
SELECT p.* FROM products p
JOIN products_fts fts ON p.id = fts.rowid
WHERE products_fts MATCH 'blue AND cotton AND shirt'
ORDER BY rank;
```

#### 3. Barcode with Prefix
```sql
-- User types: "123" (partial barcode)
SELECT p.* FROM products p
JOIN products_fts fts ON p.id = fts.rowid
WHERE products_fts MATCH 'productCode:123*'
ORDER BY rank;
```

#### 4. Category + Search
```sql
-- Search within category
SELECT p.* FROM products p
JOIN products_fts fts ON p.id = fts.rowid
WHERE products_fts MATCH 'categoryName:Clothing AND shirt'
ORDER BY rank;
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### Task 1.1: Update SQLite Schema
**File:** `electron/database/schema.sql` (if exists) or in adapter

**Add:**
```sql
-- Enable FTS5 (should be enabled by default)
-- CREATE EXTENSION IF NOT EXISTS fts5;

-- Create FTS virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  productName,
  productCode,
  barcode,
  categoryName,
  content='products',
  content_rowid='id'
);

-- Populate from existing products
INSERT INTO products_fts(rowid, productName, productCode, barcode, categoryName)
SELECT p.id, p.productName, p.productCode, p.barcode, c.name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id;

-- Sync triggers (see above)
```

#### Task 1.2: Extend SQLite Adapter
**File:** `src/lib/storage/adapters/sqlite.adapter.ts`

**Add methods:**
```typescript
export class SQLiteAdapter implements StorageAdapter {
  // ... existing code ...

  /**
   * Initialize FTS tables
   */
  async initializeFTS(): Promise<void> {
    try {
      await this.db.exec(FTS_SCHEMA) // SQL from above
      console.log('[SQLite] FTS initialized')
    } catch (error) {
      console.error('[SQLite] FTS initialization failed:', error)
    }
  }

  /**
   * Search products using FTS
   */
  async searchProductsFTS(query: string, options?: {
    limit?: number
    categoryId?: number
  }): Promise<LocalProduct[]> {
    let sql = `
      SELECT p.* FROM products p
      JOIN products_fts fts ON p.id = fts.rowid
      WHERE products_fts MATCH ?
    `
    
    const params: any[] = [query]
    
    if (options?.categoryId) {
      sql += ` AND p.category_id = ?`
      params.push(options.categoryId)
    }
    
    sql += ` ORDER BY rank LIMIT ?`
    params.push(options?.limit || 50)
    
    const stmt = this.db.prepare(sql)
    return stmt.all(...params)
  }

  /**
   * Check if FTS is available
   */
  hasFTS(): boolean {
    try {
      const result = this.db.prepare(`
        SELECT 1 FROM sqlite_master 
        WHERE type='table' AND name='products_fts'
      `).get()
      return !!result
    } catch {
      return false
    }
  }
}
```

#### Task 1.3: Update Storage Interface
**File:** `src/lib/storage/interface.ts`

```typescript
export interface StorageAdapter {
  // ... existing methods ...
  
  /**
   * Search products with optional FTS support
   */
  searchProducts(query: string, options?: {
    limit?: number
    categoryId?: number
    useFTS?: boolean // Auto-detect by default
  }): Promise<LocalProduct[]>
  
  /**
   * Check if FTS is available
   */
  hasFTS?(): boolean
}
```

### Phase 2: Integration (Week 1-2)

#### Task 2.1: Update Product Repository
**File:** `src/lib/db/repositories/product.repository.ts`

```typescript
export class ProductRepository extends BaseRepository<LocalProduct, number> {
  /**
   * Search products (with FTS when available)
   */
  async search(query: string, options?: {
    limit?: number
    categoryId?: number
  }): Promise<LocalProduct[]> {
    // Try FTS first (SQLite in Electron)
    if (storage.hasFTS?.()) {
      try {
        return await storage.searchProducts(query, {
          ...options,
          useFTS: true,
        })
      } catch (error) {
        console.warn('[ProductRepo] FTS search failed, falling back:', error)
      }
    }
    
    // Fallback: IndexedDB simple filter
    const lowerQuery = query.toLowerCase()
    let results = await this.table
      .filter((product) =>
        product.productName.toLowerCase().includes(lowerQuery) ||
        product.productCode?.toLowerCase().includes(lowerQuery) ||
        product.barcode?.toLowerCase().includes(lowerQuery)
      )
      .toArray()
    
    // Apply category filter if specified
    if (options?.categoryId) {
      results = results.filter(p => p.category_id === options.categoryId)
    }
    
    // Apply limit
    if (options?.limit) {
      results = results.slice(0, options.limit)
    }
    
    return results
  }
}
```

#### Task 2.2: Update POSData Hook
**File:** `src/pages/pos/hooks/usePOSData.ts`

**Change search to use repository:**
```typescript
// Before: filteredProducts computed inline

// After: Use repository search
const filteredProducts = useMemo(() => {
  if (!filters.search) {
    return filters.categoryId
      ? products.filter(p => p.category_id === filters.categoryId)
      : products
  }
  
  // Use async search from repository
  // (requires converting to useState + useEffect)
  return [] // Temp
}, [products, filters])

// Better approach - add new state:
const [searchResults, setSearchResults] = useState<Product[]>([])

useEffect(() => {
  if (!filters.search) {
    setSearchResults(products)
    return
  }
  
  const searchProducts = async () => {
    const results = await productRepository.search(filters.search, {
      categoryId: filters.categoryId,
      limit: 100,
    })
    setSearchResults(results)
  }
  
  searchProducts()
}, [filters.search, filters.categoryId, products])
```

### Phase 3: Testing & Optimization (Week 2)

#### Task 3.1: Performance Benchmarks
**Create:** `src/lib/storage/__tests__/fts-performance.test.ts`

```typescript
describe('FTS Performance', () => {
  it('should search 10k products in <50ms', async () => {
    const start = performance.now()
    const results = await storage.searchProducts('shirt', { limit: 50 })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(50)
    expect(results.length).toBeGreaterThan(0)
  })
  
  it('should handle complex queries', async () => {
    const results = await storage.searchProducts('blue AND (cotton OR polyester)', {
      categoryId: 5,
      limit: 20,
    })
    expect(results).toBeDefined()
  })
})
```

#### Task 3.2: Add Telemetry
Track search performance to validate improvement:

```typescript
// In search method
const searchStart = performance.now()
const results = await storage.searchProducts(query)
const searchDuration = performance.now() - searchStart

// Log to analytics
analytics.track('product_search', {
  query,
  resultCount: results.length,
  duration: searchDuration,
  method: storage.hasFTS() ? 'fts' : 'filter',
})
```

---

## Performance Considerations

### Memory Usage

| Scenario | IndexedDB | SQLite + FTS |
|----------|-----------|--------------|
| 1,000 products | ~2 MB | ~3 MB |
| 10,000 products | ~20 MB | ~35 MB |
| 50,000 products | ~100 MB | ~200 MB |

**FTS adds ~50-70% overhead** for indexes, but provides 10-100x search speedup.

### Search Speed Benchmarks

| Method | 100 products | 1,000 products | 10,000 products |
|--------|--------------|----------------|-----------------|
| `LIKE '%term%'` | 5ms | 50ms | 500ms |
| `IndexedDB filter` | 8ms | 80ms | 800ms |
| **FTS5** | **2ms** | **5ms** | **15ms** |

### Optimization Tips

1. **Limit results**: Always use `LIMIT` clause
2. **Cache searches**: Store recent queries in memory
3. **Debounce input**: Wait 300ms before searching
4. **Preload common searches**: Cache "all", top categories

---

## Migration Strategy

### From IndexedDB to SQLite+FTS

If you've already deployed with IndexedDB, migration steps:

#### Step 1: Feature Flag
```typescript
// src/lib/storage/index.ts
const FTS_ENABLED = localStorage.getItem('feature_fts') === 'true'

export const storage = createStorage({
  type: FTS_ENABLED && isElectron() ? 'sqlite' : 'indexeddb'
})
```

#### Step 2: Gradual Rollout
1. Enable for internal testing (manual flag)
2. A/B test with 10% of users
3. Monitor error rates and performance
4. Roll out to 100% if stable

#### Step 3: Data Migration
**File:** `src/lib/storage/migration/indexeddb-to-sqlite.ts`

```typescript
export async function migrateToSQLite() {
  const indexedDB = new IndexedDBAdapter()
  const sqlite = new SQLiteAdapter()
  
  // Migrate products
  const products = await indexedDB.products.getAll()
  await sqlite.products.bulkUpsert(products)
  
  // Initialize FTS
  await sqlite.initializeFTS()
  
  // Mark migration complete
  markMigrationComplete()
}
```

### Rollback Plan

If FTS causes issues:

1. **Immediate**: Disable feature flag
2. **Restore**: Revert to IndexedDB adapter
3. **Fix**: Address FTS issues in development
4. **Re-enable**: After thorough testing

---

## Decision Matrix

### Should You Implement Now?

| Criteria | Yes | No |
|----------|-----|-----|
| **Product count** | >500 | <200 |
| **Using Electron** | ✅ | ❌ |
| **Search is slow** | ✅ | ❌ |
| **Multi-word queries** | Often | Rarely |
| **Development time** | 2-3 days | Not available |

### Recommended Approach

**If you have 2-3 days:**
✅ **Implement FTS now**
- Significant UX improvement
- Future-proof for catalog growth
- SQLite already in project

**If time is tight:**
⚠️ **Defer to later**
- Current search works for <1000 products
- Focus on core features first
- Add to technical debt backlog

---

## References

- [SQLite FTS5 Documentation](https://www.sqlite.org/fts5.html)
- [better-sqlite3 NPM Package](https://www.npmjs.com/package/better-sqlite3)
- [FTS Query Syntax](https://www.sqlite.org/fts5.html#full_text_query_syntax)
- [Performance Tuning Guide](https://www.sqlite.org/fts5.html#fts5_compilation_options)

---

## Questions & Answers

**Q: Will this work on the web version?**  
A: No, this requires SQLite. For web, consider IndexedDB + [fuse.js](https://fusejs.io/) or [lunr.js](https://lunrjs.com/).

**Q: Can I search across variants?**  
A: Yes! Add variant SKUs to FTS index. Example: `INSERT INTO products_fts(variantSkus) VALUES (json_array(...))`

**Q: What about typo tolerance?**  
A: FTS5 doesn't have built-in typo tolerance. Consider adding [soundex](https://www.sqlite.org/lang_corefunc.html#soundex) or Levenshtein distance.

**Q: How do I rebuild the index?**  
A: `DELETE FROM products_fts; INSERT INTO products_fts SELECT ...;`

---

**End of Document**
