/**
 * SQLite Database Service for Electron Main Process
 * 
 * Handles all database operations using better-sqlite3.
 * Communicates with renderer via IPC.
 */

import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'
import fs from 'node:fs'

// ============================================
// Types
// ============================================

export interface LocalProduct {
  id?: number
  productName: string
  productCode?: string
  product_type?: string
  has_variants?: boolean
  categoryId?: number
  brandId?: number
  unitId?: number
  purchasePrice?: number
  salePrice?: number
  wholesalePrice?: number
  productPicture?: string
  description?: string
  stock?: {
    id?: number
    product_id?: number
    productStock?: number
    stockAlert?: number
    productPurchasePrice?: number
    productSalePrice?: number
    productWholeSalePrice?: number
  }
  variants?: any[]
  stocks?: any[]
  lastSyncedAt?: string
}

export interface LocalCategory {
  id?: number
  categoryName: string
  parentId?: number
  lastSyncedAt?: string
}

export interface LocalParty {
  id?: number
  name: string
  phone?: string
  email?: string
  address?: string
  type: 'customer' | 'supplier'
  due?: number
  wallet?: number
  creditLimit?: number
  lastSyncedAt?: string
}

export interface LocalSale {
  id?: number
  serverId?: number
  invoiceNumber?: string
  offlineInvoiceNo?: string
  partyId?: number
  saleDate?: string
  subtotal?: number
  discountAmount?: number
  vatAmount?: number
  totalAmount?: number
  paidAmount?: number
  dueAmount?: number
  paymentTypeId?: number
  status?: string
  note?: string
  isOffline?: boolean
  isSynced?: boolean
  tempId?: string
  idempotencyKey?: string
  lastSyncedAt?: string
  syncError?: string
  items?: SaleItem[]
}

export interface SaleItem {
  id?: number
  saleId?: number
  productId: number
  stockId?: number
  quantity: number
  unitPrice: number
  discount?: number
  total: number
}

export interface SyncQueueItem {
  id?: number
  idempotencyKey: string
  entity: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  entityId?: number | string
  endpoint?: string
  method?: string
  data: string // JSON string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  error?: string
  createdAt: string
  lastAttemptAt?: string
  completedAt?: string
}

// ============================================
// Database Service Class
// ============================================

export class SQLiteService {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    // Store database in app's user data folder
    const userDataPath = app.getPath('userData')
    this.dbPath = path.join(userDataPath, 'posmate.db')
  }

  // ========== Initialization ==========

  initialize(): { success: boolean; error?: string } {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Open database
      this.db = new Database(this.dbPath)
      
      // Enable WAL mode for better performance
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('foreign_keys = ON')
      
      // Run migrations
      this.runMigrations()
      
      console.log('[SQLite] Database initialized at:', this.dbPath)
      return { success: true }
    } catch (error) {
      console.error('[SQLite] Initialization error:', error)
      return { success: false, error: String(error) }
    }
  }

  private runMigrations() {
    if (!this.db) throw new Error('Database not initialized')

    // Create tables
    this.db.exec(`
      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        product_name TEXT NOT NULL,
        product_code TEXT,
        product_type TEXT DEFAULT 'simple',
        has_variants INTEGER DEFAULT 0,
        category_id INTEGER,
        brand_id INTEGER,
        unit_id INTEGER,
        purchase_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        wholesale_price REAL DEFAULT 0,
        product_picture TEXT,
        description TEXT,
        stock_id INTEGER,
        stock_quantity REAL DEFAULT 0,
        stock_alert REAL DEFAULT 10,
        last_synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Product variants table
      CREATE TABLE IF NOT EXISTS product_variants (
        id INTEGER PRIMARY KEY,
        product_id INTEGER NOT NULL,
        sku TEXT NOT NULL,
        barcode TEXT,
        price REAL,
        cost_price REAL,
        wholesale_price REAL,
        dealer_price REAL,
        image TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        attributes_json TEXT,
        last_synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      -- Variant stocks table (handles all stock types including variants)
      CREATE TABLE IF NOT EXISTS variant_stocks (
        id INTEGER PRIMARY KEY,
        product_id INTEGER NOT NULL,
        variant_id INTEGER,
        batch_no TEXT,
        stock_quantity REAL DEFAULT 0,
        purchase_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        wholesale_price REAL DEFAULT 0,
        dealer_price REAL DEFAULT 0,
        profit_percent REAL DEFAULT 0,
        mfg_date TEXT,
        expire_date TEXT,
        last_synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        category_name TEXT NOT NULL,
        icon TEXT,
        status INTEGER DEFAULT 1,
        parent_id INTEGER,
        variation_capacity INTEGER DEFAULT 0,
        variation_color INTEGER DEFAULT 0,
        variation_size INTEGER DEFAULT 0,
        variation_type INTEGER DEFAULT 0,
        variation_weight INTEGER DEFAULT 0,
        version INTEGER DEFAULT 1,
        business_id INTEGER,
        last_synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        deleted_at TEXT
      );

      -- Parties (customers/suppliers) table
      CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        type TEXT DEFAULT 'customer',
        due REAL DEFAULT 0,
        wallet REAL DEFAULT 0,
        credit_limit REAL,
        last_synced_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        invoice_number TEXT,
        offline_invoice_no TEXT,
        party_id INTEGER,
        sale_date TEXT,
        subtotal REAL,
        discount_amount REAL DEFAULT 0,
        vat_amount REAL DEFAULT 0,
        total_amount REAL,
        paid_amount REAL,
        due_amount REAL,
        payment_type_id INTEGER,
        status TEXT DEFAULT 'completed',
        note TEXT,
        is_offline INTEGER DEFAULT 0,
        is_synced INTEGER DEFAULT 0,
        temp_id TEXT,
        idempotency_key TEXT UNIQUE,
        last_synced_at TEXT,
        sync_error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Sale items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        stock_id INTEGER,
        quantity REAL,
        unit_price REAL,
        discount REAL DEFAULT 0,
        total REAL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      );

      -- Sync queue table
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT UNIQUE NOT NULL,
        entity TEXT NOT NULL,
        operation TEXT NOT NULL,
        entity_id TEXT,
        endpoint TEXT,
        method TEXT,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        last_attempt_at TEXT,
        completed_at TEXT
      );

      -- Sync metadata table
      CREATE TABLE IF NOT EXISTS sync_metadata (
        entity TEXT PRIMARY KEY,
        last_sync_at TEXT,
        record_count INTEGER
      );

      -- Held carts table
      CREATE TABLE IF NOT EXISTS held_carts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cart_id TEXT UNIQUE NOT NULL,
        customer_id INTEGER,
        customer_name TEXT,
        payment_type_id INTEGER,
        payment_type_name TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        note TEXT,
        items TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
      CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
      CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
      CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
      CREATE INDEX IF NOT EXISTS idx_variant_stocks_product ON variant_stocks(product_id);
      CREATE INDEX IF NOT EXISTS idx_variant_stocks_variant ON variant_stocks(variant_id);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(is_synced);
      CREATE INDEX IF NOT EXISTS idx_sales_offline ON sales(is_offline);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
      CREATE INDEX IF NOT EXISTS idx_parties_phone ON parties(phone);
      CREATE INDEX IF NOT EXISTS idx_parties_type ON parties(type);
    `)
    
    // Run migration to add new columns to existing products table (if they don't exist)
    this.runColumnMigrations()
  }

  private runColumnMigrations() {
    if (!this.db) return

    try {
      // ========== Products Table Migrations ==========
      const productsInfo = this.db.prepare("PRAGMA table_info(products)").all() as any[]
      const hasProductType = productsInfo.some(col => col.name === 'product_type')
      const hasHasVariants = productsInfo.some(col => col.name === 'has_variants')

      if (!hasProductType) {
        this.db.exec("ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'simple'")
        console.log('[SQLite] Added product_type column to products table')
      }

      if (!hasHasVariants) {
        this.db.exec("ALTER TABLE products ADD COLUMN has_variants INTEGER DEFAULT 0")
        console.log('[SQLite] Added has_variants column to products table')
      }

      // ========== Categories Table Migrations ==========
      const categoriesInfo = this.db.prepare("PRAGMA table_info(categories)").all() as any[]
      const categoriesColumns = categoriesInfo.map(col => col.name)

      const categoriesToAdd = [
        { name: 'icon', type: 'TEXT', default: 'NULL' },
        { name: 'status', type: 'INTEGER', default: '1' },
        { name: 'variation_capacity', type: 'INTEGER', default: '0' },
        { name: 'variation_color', type: 'INTEGER', default: '0' },
        { name: 'variation_size', type: 'INTEGER', default: '0' },
        { name: 'variation_type', type: 'INTEGER', default: '0' },
        { name: 'variation_weight', type: 'INTEGER', default: '0' },
        { name: 'version', type: 'INTEGER', default: '1' },
        { name: 'business_id', type: 'INTEGER', default: 'NULL' },
        { name: 'updated_at', type: 'TEXT', default: 'NULL' },
        { name: 'deleted_at', type: 'TEXT', default: 'NULL' }
      ]

      for (const col of categoriesToAdd) {
        if (!categoriesColumns.includes(col.name)) {
          this.db.exec(`ALTER TABLE categories ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`)
          console.log(`[SQLite] Added ${col.name} column to categories table`)
        }
      }
    } catch (error) {
      console.warn('[SQLite] Column migration warning:', error)
    }
  }

  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[SQLite] Database closed')
    }
  }

  // ========== Products ==========

  productGetById(id: number): LocalProduct | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any
    return row ? this.mapProduct(row) : undefined
  }

  productGetAll(): LocalProduct[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM products').all() as any[]
    return rows.map(r => {
      const product = this.mapProduct(r)
      
      // Load variants if product is variable
      if (r.product_type === 'variable' && r.has_variants) {
        product.variants = this.getVariantsByProductId(r.id)
      }
      
      // Load all stocks (includes variant stocks)
      product.stocks = this.getStocksByProductId(r.id)
      
      return product
    })
  }

  productCreate(product: Omit<LocalProduct, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(`
      INSERT INTO products (id, product_name, product_code, category_id, brand_id, unit_id,
        purchase_price, sale_price, wholesale_price, product_picture, description,
        stock_id, stock_quantity, stock_alert, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      (product as any).id || null,
      product.productName,
      product.productCode,
      product.categoryId,
      product.brandId,
      product.unitId,
      product.purchasePrice || 0,
      product.salePrice || 0,
      product.wholesalePrice || 0,
      product.productPicture,
      product.description,
      product.stock?.id,
      product.stock?.productStock || 0,
      product.stock?.stockAlert || 10,
      product.lastSyncedAt || new Date().toISOString()
    )
    return result.lastInsertRowid as number
  }

  productUpdate(id: number, product: Partial<LocalProduct>): void {
    if (!this.db) throw new Error('Database not initialized')
    const fields: string[] = []
    const values: any[] = []

    if (product.productName !== undefined) { fields.push('product_name = ?'); values.push(product.productName) }
    if (product.productCode !== undefined) { fields.push('product_code = ?'); values.push(product.productCode) }
    if (product.categoryId !== undefined) { fields.push('category_id = ?'); values.push(product.categoryId) }
    if (product.salePrice !== undefined) { fields.push('sale_price = ?'); values.push(product.salePrice) }
    if (product.purchasePrice !== undefined) { fields.push('purchase_price = ?'); values.push(product.purchasePrice) }
    if (product.stock?.productStock !== undefined) { fields.push('stock_quantity = ?'); values.push(product.stock.productStock) }
    if (product.lastSyncedAt !== undefined) { fields.push('last_synced_at = ?'); values.push(product.lastSyncedAt) }
    
    fields.push("updated_at = datetime('now')")
    values.push(id)

    if (fields.length > 1) {
      this.db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  productDelete(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id)
  }

  productCount(): number {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as any
    return row.count
  }

  productClear(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM products').run()
  }

  productSearch(query: string): LocalProduct[] {
    if (!this.db) throw new Error('Database not initialized')
    const pattern = `%${query}%`
    const rows = this.db.prepare(`
      SELECT * FROM products 
      WHERE product_name LIKE ? OR product_code LIKE ?
      LIMIT 50
    `).all(pattern, pattern) as any[]
    return rows.map(r => this.mapProduct(r))
  }

  productGetByBarcode(barcode: string): LocalProduct | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM products WHERE product_code = ?').get(barcode) as any
    return row ? this.mapProduct(row) : undefined
  }

  productGetByCategory(categoryId: number): LocalProduct[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM products WHERE category_id = ?').all(categoryId) as any[]
    return rows.map(r => this.mapProduct(r))
  }

  productGetLowStock(threshold: number = 10): LocalProduct[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM products WHERE stock_quantity <= ?').all(threshold) as any[]
    return rows.map(r => this.mapProduct(r))
  }

  productBulkUpsert(products: LocalProduct[]): void {
    if (!this.db) throw new Error('Database not initialized')
    
    const upsertProduct = this.db.prepare(`
      INSERT INTO products (id, product_name, product_code, product_type, has_variants, category_id, brand_id, unit_id,
        purchase_price, sale_price, wholesale_price, product_picture, description,
        stock_id, stock_quantity, stock_alert, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        product_name = excluded.product_name,
        product_code = excluded.product_code,
        product_type = excluded.product_type,
        has_variants = excluded.has_variants,
        category_id = excluded.category_id,
        brand_id = excluded.brand_id,
        unit_id = excluded.unit_id,
        sale_price = excluded.sale_price,
        purchase_price = excluded.purchase_price,
        wholesale_price = excluded.wholesale_price,
        product_picture = excluded.product_picture,
        stock_id = excluded.stock_id,
        stock_quantity = excluded.stock_quantity,
        stock_alert = excluded.stock_alert,
        last_synced_at = excluded.last_synced_at,
        updated_at = datetime('now')
    `)

    const upsertVariant = this.db.prepare(`
      INSERT INTO product_variants (id, product_id, sku, barcode, price, cost_price, wholesale_price, dealer_price,
        image, is_active, sort_order, attributes_json, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sku = excluded.sku,
        barcode = excluded.barcode,
        price = excluded.price,
        cost_price = excluded.cost_price,
        wholesale_price = excluded.wholesale_price,
        dealer_price = excluded.dealer_price,
        image = excluded.image,
        is_active = excluded.is_active,
        sort_order = excluded.sort_order,
        attributes_json = excluded.attributes_json,
        last_synced_at = excluded.last_synced_at,
        updated_at = datetime('now')
    `)

    const upsertStock = this.db.prepare(`
      INSERT INTO variant_stocks (id, product_id, variant_id, batch_no, stock_quantity, purchase_price, sale_price,
        wholesale_price, dealer_price, profit_percent, mfg_date, expire_date, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        stock_quantity = excluded.stock_quantity,
        purchase_price = excluded.purchase_price,
        sale_price = excluded.sale_price,
        wholesale_price = excluded.wholesale_price,
        dealer_price = excluded.dealer_price,
        profit_percent = excluded.profit_percent,
        mfg_date = excluded.mfg_date,
        expire_date = excluded.expire_date,
        last_synced_at = excluded.last_synced_at,
        updated_at = datetime('now')
    `)

    const insertMany = this.db.transaction((products: LocalProduct[]) => {
      for (const p of products) {
        // Get prices from stock object (where API stores them) or fallback to top-level
        const purchasePrice = p.stock?.productPurchasePrice ?? p.purchasePrice ?? 0
        const salePrice = p.stock?.productSalePrice ?? p.salePrice ?? 0
        const wholesalePrice = p.stock?.productWholeSalePrice ?? p.wholesalePrice ?? 0
        const productType = (p as any).product_type || 'simple'
        const hasVariants = (p as any).has_variants || Boolean((p as any).variants && (p as any).variants.length > 0)
        
        // Insert/update product
        upsertProduct.run(
          p.id,
          p.productName,
          p.productCode,
          productType,
          hasVariants ? 1 : 0,
          p.categoryId ?? (p as any).category_id,
          p.brandId ?? (p as any).brand_id,
          p.unitId ?? (p as any).unit_id,
          purchasePrice,
          salePrice,
          wholesalePrice,
          p.productPicture,
          p.description,
          p.stock?.id,
          p.stock?.productStock || 0,
          p.stock?.stockAlert ?? (p as any).alert_qty ?? 10,
          p.lastSyncedAt || new Date().toISOString()
        )

        // Insert/update variants if this is a variable product
        const variants = (p as any).variants || []
        for (const variant of variants) {
          upsertVariant.run(
            variant.id,
            p.id,
            variant.sku,
            variant.barcode,
            variant.price,
            variant.cost_price,
            variant.wholesale_price,
            variant.dealer_price,
            variant.image,
            variant.is_active ? 1 : 0,
            variant.sort_order || 0,
            JSON.stringify(variant.attribute_values || variant.attributeValues || []),
            p.lastSyncedAt || new Date().toISOString()
          )
        }

        // Insert/update stocks (handles both simple and variant stocks)
        const stocks = (p as any).stocks || []
        for (const stock of stocks) {
          upsertStock.run(
            stock.id,
            p.id,
            stock.variant_id || null,
            stock.batch_no || null,
            stock.productStock || 0,
            stock.productPurchasePrice || 0,
            stock.productSalePrice || 0,
            stock.productWholeSalePrice || 0,
            stock.productDealerPrice || 0,
            stock.profit_percent || 0,
            stock.mfg_date || null,
            stock.expire_date || null,
            p.lastSyncedAt || new Date().toISOString()
          )
        }
      }
    })

    insertMany(products)
  }

  private mapProduct(row: any): LocalProduct {
    return {
      id: row.id,
      productName: row.product_name,
      productCode: row.product_code,
      product_type: row.product_type || 'simple',
      has_variants: Boolean(row.has_variants),
      categoryId: row.category_id,
      brandId: row.brand_id,
      unitId: row.unit_id,
      // Keep prices at top level for compatibility
      purchasePrice: row.purchase_price,
      salePrice: row.sale_price,
      wholesalePrice: row.wholesale_price,
      productPicture: row.product_picture,
      description: row.description,
      // Also include prices in stock object (where UI components expect them)
      stock: {
        id: row.stock_id,
        product_id: row.id,
        productStock: row.stock_quantity,
        stockAlert: row.stock_alert,
        productPurchasePrice: row.purchase_price,
        productSalePrice: row.sale_price,
        productWholeSalePrice: row.wholesale_price,
      },
      // Arrays will be populated by caller if needed
      variants: [],
      stocks: [],
      lastSyncedAt: row.last_synced_at,
    }
  }

  private getVariantsByProductId(productId: number): any[] {
    if (!this.db) return []
    const rows = this.db.prepare('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1').all(productId) as any[]
    return rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      sku: row.sku,
      barcode: row.barcode,
      price: row.price,
      cost_price: row.cost_price,
      wholesale_price: row.wholesale_price,
      dealer_price: row.dealer_price,
      image: row.image,
      is_active: Boolean(row.is_active),
      sort_order: row.sort_order,
      attribute_values: row.attributes_json ? JSON.parse(row.attributes_json) : [],
      stocks: this.getStocksByVariantId(row.id),
    }))
  }

  private getStocksByProductId(productId: number): any[] {
    if (!this.db) return []
    const rows = this.db.prepare('SELECT * FROM variant_stocks WHERE product_id = ?').all(productId) as any[]
    return rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      batch_no: row.batch_no,
      productStock: row.stock_quantity,
      productPurchasePrice: row.purchase_price,
      productSalePrice: row.sale_price,
      productWholeSalePrice: row.wholesale_price,
      productDealerPrice: row.dealer_price,
      profit_percent: row.profit_percent,
      mfg_date: row.mfg_date,
      expire_date: row.expire_date,
    }))
  }

  private getStocksByVariantId(variantId: number): any[] {
    if (!this.db) return []
    const rows = this.db.prepare('SELECT * FROM variant_stocks WHERE variant_id = ?').all(variantId) as any[]
    return rows.map(row => ({
      id: row.id,
      product_id: row.product_id,
      variant_id: row.variant_id,
      batch_no: row.batch_no,
      productStock: row.stock_quantity,
      productPurchasePrice: row.purchase_price,
      productSalePrice: row.sale_price,
      productWholeSalePrice: row.wholesale_price,
      productDealerPrice: row.dealer_price,
      profit_percent: row.profit_percent,
      mfg_date: row.mfg_date,
      expire_date: row.expire_date,
    }))
  }

  // ========== Categories ==========

  categoryGetById(id: number): LocalCategory | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any
    return row ? this.mapCategory(row) : undefined
  }

  categoryGetAll(): LocalCategory[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM categories').all() as any[]
    return rows.map(r => this.mapCategory(r))
  }

  categoryCreate(category: Omit<LocalCategory, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(`
      INSERT INTO categories (id, category_name, parent_id, last_synced_at)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(
      (category as any).id || null,
      category.categoryName,
      category.parentId,
      category.lastSyncedAt || new Date().toISOString()
    )
    return result.lastInsertRowid as number
  }

  categoryUpdate(id: number, category: Partial<LocalCategory>): void {
    if (!this.db) throw new Error('Database not initialized')
    const fields: string[] = []
    const values: any[] = []

    if (category.categoryName !== undefined) { fields.push('category_name = ?'); values.push(category.categoryName) }
    if (category.parentId !== undefined) { fields.push('parent_id = ?'); values.push(category.parentId) }
    if (category.lastSyncedAt !== undefined) { fields.push('last_synced_at = ?'); values.push(category.lastSyncedAt) }
    
    values.push(id)

    if (fields.length > 0) {
      this.db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  categoryDelete(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  }

  categoryCount(): number {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as any
    return row.count
  }

  categoryClear(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM categories').run()
  }

  categoryGetByName(name: string): LocalCategory | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM categories WHERE category_name = ? COLLATE NOCASE').get(name) as any
    return row ? this.mapCategory(row) : undefined
  }

  categoryBulkUpsert(categories: LocalCategory[]): void {
    if (!this.db) throw new Error('Database not initialized')
    
    const upsert = this.db.prepare(`
      INSERT INTO categories (
        id, category_name, icon, status, parent_id,
        variation_capacity, variation_color, variation_size, variation_type, variation_weight,
        version, business_id, last_synced_at, created_at, updated_at, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        category_name = excluded.category_name,
        icon = excluded.icon,
        status = excluded.status,
        parent_id = excluded.parent_id,
        variation_capacity = excluded.variation_capacity,
        variation_color = excluded.variation_color,
        variation_size = excluded.variation_size,
        variation_type = excluded.variation_type,
        variation_weight = excluded.variation_weight,
        version = excluded.version,
        business_id = excluded.business_id,
        last_synced_at = excluded.last_synced_at,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    `)

    // Helper to convert values to SQLite-compatible types
    const toSQLiteValue = (val: any, defaultVal: any = null) => {
      if (val === undefined || val === null) return defaultVal
      if (typeof val === 'boolean') return val ? 1 : 0
      return val
    }

    const insertMany = this.db.transaction((categories: LocalCategory[]) => {
      for (const c of categories) {
        const cat = c as any
        try {
          upsert.run(
            c.id,
            c.categoryName,
            toSQLiteValue(cat.icon, null),
            toSQLiteValue(cat.status, 1),
            toSQLiteValue(c.parentId, null),
            toSQLiteValue(cat.variationCapacity, 0),
            toSQLiteValue(cat.variationColor, 0),
            toSQLiteValue(cat.variationSize, 0),
            toSQLiteValue(cat.variationType, 0),
            toSQLiteValue(cat.variationWeight, 0),
            toSQLiteValue(cat.version, 1),
            toSQLiteValue(cat.business_id, null),
            c.lastSyncedAt || new Date().toISOString(),
            toSQLiteValue(cat.created_at, new Date().toISOString()),
            toSQLiteValue(cat.updated_at, null),
            toSQLiteValue(cat.deleted_at, null)
          )
        } catch (error) {
          console.error('[SQLite] Error inserting category:', c.id, c.categoryName, error)
          console.error('[SQLite] Category data:', JSON.stringify(c, null, 2))
          throw error
        }
      }
    })

    insertMany(categories)
  }

  private mapCategory(row: any): LocalCategory {
    return {
      id: row.id,
      categoryName: row.category_name,
      icon: row.icon || null,
      status: row.status ?? 1,
      parentId: row.parent_id,
      variationCapacity: row.variation_capacity ?? 0,
      variationColor: row.variation_color ?? 0,
      variationSize: row.variation_size ?? 0,
      variationType: row.variation_type ?? 0,
      variationWeight: row.variation_weight ?? 0,
      version: row.version ?? 1,
      business_id: row.business_id,
      lastSyncedAt: row.last_synced_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    } as LocalCategory
  }

  // ========== Parties ==========

  partyGetById(id: number): LocalParty | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM parties WHERE id = ?').get(id) as any
    return row ? this.mapParty(row) : undefined
  }

  partyGetAll(): LocalParty[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM parties').all() as any[]
    return rows.map(r => this.mapParty(r))
  }

  partyCreate(party: Omit<LocalParty, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized')
    const stmt = this.db.prepare(`
      INSERT INTO parties (id, name, phone, email, address, type, due, wallet, credit_limit, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      (party as any).id || null,
      party.name,
      party.phone,
      party.email,
      party.address,
      party.type || 'customer',
      party.due || 0,
      party.wallet || 0,
      party.creditLimit,
      party.lastSyncedAt || new Date().toISOString()
    )
    return result.lastInsertRowid as number
  }

  partyUpdate(id: number, party: Partial<LocalParty>): void {
    if (!this.db) throw new Error('Database not initialized')
    const fields: string[] = []
    const values: any[] = []

    if (party.name !== undefined) { fields.push('name = ?'); values.push(party.name) }
    if (party.phone !== undefined) { fields.push('phone = ?'); values.push(party.phone) }
    if (party.email !== undefined) { fields.push('email = ?'); values.push(party.email) }
    if (party.address !== undefined) { fields.push('address = ?'); values.push(party.address) }
    if (party.type !== undefined) { fields.push('type = ?'); values.push(party.type) }
    if (party.due !== undefined) { fields.push('due = ?'); values.push(party.due) }
    if (party.lastSyncedAt !== undefined) { fields.push('last_synced_at = ?'); values.push(party.lastSyncedAt) }
    
    fields.push("updated_at = datetime('now')")
    values.push(id)

    if (fields.length > 1) {
      this.db.prepare(`UPDATE parties SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  partyDelete(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM parties WHERE id = ?').run(id)
  }

  partyCount(): number {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT COUNT(*) as count FROM parties').get() as any
    return row.count
  }

  partyClear(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM parties').run()
  }

  partySearch(query: string): LocalParty[] {
    if (!this.db) throw new Error('Database not initialized')
    const pattern = `%${query}%`
    const rows = this.db.prepare(`
      SELECT * FROM parties 
      WHERE name LIKE ? OR phone LIKE ?
      LIMIT 50
    `).all(pattern, pattern) as any[]
    return rows.map(r => this.mapParty(r))
  }

  partyGetByPhone(phone: string): LocalParty | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM parties WHERE phone = ?').get(phone) as any
    return row ? this.mapParty(row) : undefined
  }

  partyGetCustomers(): LocalParty[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare("SELECT * FROM parties WHERE type = 'customer'").all() as any[]
    return rows.map(r => this.mapParty(r))
  }

  partyGetSuppliers(): LocalParty[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare("SELECT * FROM parties WHERE type = 'supplier'").all() as any[]
    return rows.map(r => this.mapParty(r))
  }

  partyGetWithBalance(): LocalParty[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM parties WHERE due != 0').all() as any[]
    return rows.map(r => this.mapParty(r))
  }

  partyBulkUpsert(parties: LocalParty[]): void {
    if (!this.db) throw new Error('Database not initialized')
    
    const upsert = this.db.prepare(`
      INSERT INTO parties (id, name, phone, email, address, type, due, wallet, credit_limit, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        type = excluded.type,
        due = excluded.due,
        last_synced_at = excluded.last_synced_at,
        updated_at = datetime('now')
    `)

    const insertMany = this.db.transaction((parties: LocalParty[]) => {
      for (const p of parties) {
        upsert.run(
          p.id,
          p.name,
          p.phone,
          p.email,
          p.address,
          p.type || 'customer',
          p.due || 0,
          p.wallet || 0,
          p.creditLimit,
          p.lastSyncedAt || new Date().toISOString()
        )
      }
    })

    insertMany(parties)
  }

  private mapParty(row: any): LocalParty {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      type: row.type,
      due: row.due,
      wallet: row.wallet,
      creditLimit: row.credit_limit,
      lastSyncedAt: row.last_synced_at,
    }
  }

  // ========== Sales ==========

  saleGetById(id: number): LocalSale | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any
    if (!row) return undefined
    
    const sale = this.mapSale(row)
    sale.items = this.getSaleItems(id)
    return sale
  }

  saleGetAll(): LocalSale[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all() as any[]
    return rows.map(r => this.mapSale(r))
  }

  saleCreate(sale: Omit<LocalSale, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized')
    
    const result = this.db.prepare(`
      INSERT INTO sales (server_id, invoice_number, offline_invoice_no, party_id, sale_date,
        subtotal, discount_amount, vat_amount, total_amount, paid_amount, due_amount,
        payment_type_id, status, note, is_offline, is_synced, temp_id, idempotency_key,
        last_synced_at, sync_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sale.serverId,
      sale.invoiceNumber,
      sale.offlineInvoiceNo,
      sale.partyId,
      sale.saleDate || new Date().toISOString(),
      sale.subtotal || 0,
      sale.discountAmount || 0,
      sale.vatAmount || 0,
      sale.totalAmount || 0,
      sale.paidAmount || 0,
      sale.dueAmount || 0,
      sale.paymentTypeId,
      sale.status || 'completed',
      sale.note,
      sale.isOffline ? 1 : 0,
      sale.isSynced ? 1 : 0,
      sale.tempId,
      sale.idempotencyKey,
      sale.lastSyncedAt,
      sale.syncError
    )

    const saleId = result.lastInsertRowid as number

    // Insert sale items
    if (sale.items && sale.items.length > 0) {
      const insertItem = this.db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, stock_id, quantity, unit_price, discount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const item of sale.items) {
        insertItem.run(saleId, item.productId, item.stockId, item.quantity, item.unitPrice, item.discount || 0, item.total)
      }
    }

    return saleId
  }

  saleCreateOffline(sale: Omit<LocalSale, 'id' | 'isOffline' | 'isSynced'>): number {
    const tempId = `OFF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const offlineInvoiceNo = `OFF-${Date.now()}`
    const idempotencyKey = `sale-${tempId}`

    return this.saleCreate({
      ...sale,
      tempId,
      offlineInvoiceNo,
      idempotencyKey,
      isOffline: true,
      isSynced: false,
    })
  }

  saleUpdate(id: number, sale: Partial<LocalSale>): void {
    if (!this.db) throw new Error('Database not initialized')
    const fields: string[] = []
    const values: any[] = []

    if (sale.serverId !== undefined) { fields.push('server_id = ?'); values.push(sale.serverId) }
    if (sale.invoiceNumber !== undefined) { fields.push('invoice_number = ?'); values.push(sale.invoiceNumber) }
    if (sale.isSynced !== undefined) { fields.push('is_synced = ?'); values.push(sale.isSynced ? 1 : 0) }
    if (sale.lastSyncedAt !== undefined) { fields.push('last_synced_at = ?'); values.push(sale.lastSyncedAt) }
    if (sale.syncError !== undefined) { fields.push('sync_error = ?'); values.push(sale.syncError) }
    
    values.push(id)

    if (fields.length > 0) {
      this.db.prepare(`UPDATE sales SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  saleDelete(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    // Sale items are deleted via CASCADE
    this.db.prepare('DELETE FROM sales WHERE id = ?').run(id)
  }

  saleCount(): number {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as any
    return row.count
  }

  saleClear(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM sale_items').run()
    this.db.prepare('DELETE FROM sales').run()
  }

  saleGetOffline(): LocalSale[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM sales WHERE is_offline = 1 AND is_synced = 0').all() as any[]
    return rows.map(r => {
      const sale = this.mapSale(r)
      sale.items = this.getSaleItems(r.id)
      return sale
    })
  }

  saleMarkAsSynced(id: number, serverId?: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare(`
      UPDATE sales SET is_synced = 1, server_id = ?, last_synced_at = datetime('now')
      WHERE id = ?
    `).run(serverId, id)
  }

  saleGetByInvoiceNumber(invoiceNo: string): LocalSale | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM sales WHERE invoice_number = ?').get(invoiceNo) as any
    return row ? this.mapSale(row) : undefined
  }

  saleGetByDateRange(startDate: string, endDate: string): LocalSale[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare(`
      SELECT * FROM sales WHERE sale_date BETWEEN ? AND ?
      ORDER BY sale_date DESC
    `).all(startDate, endDate) as any[]
    return rows.map(r => this.mapSale(r))
  }

  saleGetToday(): LocalSale[] {
    if (!this.db) throw new Error('Database not initialized')
    const today = new Date().toISOString().split('T')[0]
    const rows = this.db.prepare(`
      SELECT * FROM sales WHERE sale_date LIKE ?
      ORDER BY created_at DESC
    `).all(`${today}%`) as any[]
    return rows.map(r => this.mapSale(r))
  }

  saleGetSummary(startDate: string, endDate: string): { totalSales: number; totalAmount: number; totalPaid: number; totalDue: number; averageTicket: number } {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(due_amount), 0) as total_due
      FROM sales WHERE sale_date BETWEEN ? AND ?
    `).get(startDate, endDate) as any

    return {
      totalSales: row.total_sales,
      totalAmount: row.total_amount,
      totalPaid: row.total_paid,
      totalDue: row.total_due,
      averageTicket: row.total_sales > 0 ? row.total_amount / row.total_sales : 0,
    }
  }

  private getSaleItems(saleId: number): SaleItem[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId) as any[]
    return rows.map(r => ({
      id: r.id,
      saleId: r.sale_id,
      productId: r.product_id,
      stockId: r.stock_id,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      discount: r.discount,
      total: r.total,
    }))
  }

  private mapSale(row: any): LocalSale {
    return {
      id: row.id,
      serverId: row.server_id,
      invoiceNumber: row.invoice_number,
      offlineInvoiceNo: row.offline_invoice_no,
      partyId: row.party_id,
      saleDate: row.sale_date,
      subtotal: row.subtotal,
      discountAmount: row.discount_amount,
      vatAmount: row.vat_amount,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      dueAmount: row.due_amount,
      paymentTypeId: row.payment_type_id,
      status: row.status,
      note: row.note,
      isOffline: row.is_offline === 1,
      isSynced: row.is_synced === 1,
      tempId: row.temp_id,
      idempotencyKey: row.idempotency_key,
      lastSyncedAt: row.last_synced_at,
      syncError: row.sync_error,
    }
  }

  // ========== Sync Queue ==========

  syncQueueGetById(id: number): SyncQueueItem | undefined {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT * FROM sync_queue WHERE id = ?').get(id) as any
    return row ? this.mapSyncQueue(row) : undefined
  }

  syncQueueGetAll(): SyncQueueItem[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare('SELECT * FROM sync_queue ORDER BY created_at ASC').all() as any[]
    return rows.map(r => this.mapSyncQueue(r))
  }

  syncQueueCreate(item: Omit<SyncQueueItem, 'id'>): number {
    if (!this.db) throw new Error('Database not initialized')
    const result = this.db.prepare(`
      INSERT INTO sync_queue (idempotency_key, entity, operation, entity_id, endpoint, method,
        data, status, attempts, max_attempts, error, created_at, last_attempt_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.idempotencyKey,
      item.entity,
      item.operation,
      item.entityId,
      item.endpoint,
      item.method,
      item.data,
      item.status || 'pending',
      item.attempts || 0,
      item.maxAttempts || 5,
      item.error,
      item.createdAt || new Date().toISOString(),
      item.lastAttemptAt,
      item.completedAt
    )
    return result.lastInsertRowid as number
  }

  syncQueueUpdate(id: number, item: Partial<SyncQueueItem>): void {
    if (!this.db) throw new Error('Database not initialized')
    const fields: string[] = []
    const values: any[] = []

    if (item.status !== undefined) { fields.push('status = ?'); values.push(item.status) }
    if (item.attempts !== undefined) { fields.push('attempts = ?'); values.push(item.attempts) }
    if (item.error !== undefined) { fields.push('error = ?'); values.push(item.error) }
    if (item.lastAttemptAt !== undefined) { fields.push('last_attempt_at = ?'); values.push(item.lastAttemptAt) }
    if (item.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(item.completedAt) }
    
    values.push(id)

    if (fields.length > 0) {
      this.db.prepare(`UPDATE sync_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  syncQueueDelete(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id)
  }

  syncQueueCount(): number {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT COUNT(*) as count FROM sync_queue').get() as any
    return row.count
  }

  syncQueueClear(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare('DELETE FROM sync_queue').run()
  }

  syncQueueEnqueue(item: Omit<SyncQueueItem, 'id'>): number {
    return this.syncQueueCreate({
      ...item,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    })
  }

  syncQueueGetPending(limit?: number): SyncQueueItem[] {
    if (!this.db) throw new Error('Database not initialized')
    const sql = limit 
      ? "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?"
      : "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC"
    const rows = limit ? this.db.prepare(sql).all(limit) : this.db.prepare(sql).all()
    return (rows as any[]).map(r => this.mapSyncQueue(r))
  }

  syncQueueGetFailed(): SyncQueueItem[] {
    if (!this.db) throw new Error('Database not initialized')
    const rows = this.db.prepare("SELECT * FROM sync_queue WHERE status = 'failed'").all() as any[]
    return rows.map(r => this.mapSyncQueue(r))
  }

  syncQueueMarkAsProcessing(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare(`
      UPDATE sync_queue SET status = 'processing', last_attempt_at = datetime('now')
      WHERE id = ?
    `).run(id)
  }

  syncQueueMarkAsCompleted(id: number): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare(`
      UPDATE sync_queue SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(id)
  }

  syncQueueMarkAsFailed(id: number, error: string): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare(`
      UPDATE sync_queue SET status = 'failed', error = ?, attempts = attempts + 1
      WHERE id = ?
    `).run(error, id)
  }

  syncQueueClearCompleted(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare("DELETE FROM sync_queue WHERE status = 'completed'").run()
  }

  syncQueueGetStats(): { pending: number; processing: number; completed: number; failed: number; total: number } {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM sync_queue
    `).get() as any

    return {
      pending: row.pending || 0,
      processing: row.processing || 0,
      completed: row.completed || 0,
      failed: row.failed || 0,
      total: row.total || 0,
    }
  }

  private mapSyncQueue(row: any): SyncQueueItem {
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      entity: row.entity,
      operation: row.operation,
      entityId: row.entity_id,
      endpoint: row.endpoint,
      method: row.method,
      data: row.data,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      error: row.error,
      createdAt: row.created_at,
      lastAttemptAt: row.last_attempt_at,
      completedAt: row.completed_at,
    }
  }

  // ========== Sync Metadata ==========

  getLastSyncTime(entity: string): string | null {
    if (!this.db) throw new Error('Database not initialized')
    const row = this.db.prepare('SELECT last_sync_at FROM sync_metadata WHERE entity = ?').get(entity) as any
    return row?.last_sync_at || null
  }

  setLastSyncTime(entity: string, timestamp?: string): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.prepare(`
      INSERT INTO sync_metadata (entity, last_sync_at)
      VALUES (?, ?)
      ON CONFLICT(entity) DO UPDATE SET last_sync_at = excluded.last_sync_at
    `).run(entity, timestamp || new Date().toISOString())
  }

  // ========== Database Utilities ==========

  getDatabaseSize(): number {
    try {
      const stats = fs.statSync(this.dbPath)
      return stats.size
    } catch {
      return 0
    }
  }

  vacuum(): void {
    if (!this.db) throw new Error('Database not initialized')
    this.db.exec('VACUUM')
  }

  exportData(): {
    products: LocalProduct[]
    categories: LocalCategory[]
    parties: LocalParty[]
    sales: LocalSale[]
    syncQueue: SyncQueueItem[]
  } {
    return {
      products: this.productGetAll(),
      categories: this.categoryGetAll(),
      parties: this.partyGetAll(),
      sales: this.saleGetAll(),
      syncQueue: this.syncQueueGetAll(),
    }
  }
}

// Singleton instance
export const sqliteService = new SQLiteService()
