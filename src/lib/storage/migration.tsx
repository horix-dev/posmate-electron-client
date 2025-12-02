/**
 * IndexedDB to SQLite Migration
 * 
 * This component handles one-time migration of data from IndexedDB to SQLite.
 * Shows progress UI during migration and handles errors gracefully.
 */

import { useEffect, useState } from 'react'
import { db } from '@/lib/db/schema'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Database, Loader2 } from 'lucide-react'

interface MigrationProgress {
  stage: 'idle' | 'checking' | 'migrating' | 'completed' | 'error'
  currentEntity: string
  totalEntities: number
  completedEntities: number
  recordsCopied: number
  error?: string
}

interface MigrationResult {
  success: boolean
  recordsCopied: number
  error?: string
}

const MIGRATION_KEY = 'sqlite_migration_completed'

export function useMigrationStatus() {
  const [needsMigration, setNeedsMigration] = useState<boolean | null>(null)

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  async function checkMigrationStatus() {
    // Check if migration was already done
    const migrationDone = localStorage.getItem(MIGRATION_KEY)
    if (migrationDone === 'true') {
      setNeedsMigration(false)
      return
    }

    // Check if there's data in IndexedDB
    try {
      await db.open()
      const productCount = await db.products.count()
      const saleCount = await db.sales.count()
      
      // Only need migration if IndexedDB has data
      setNeedsMigration(productCount > 0 || saleCount > 0)
    } catch {
      // If IndexedDB check fails, assume no migration needed
      setNeedsMigration(false)
    }
  }

  function markMigrationComplete() {
    localStorage.setItem(MIGRATION_KEY, 'true')
    setNeedsMigration(false)
  }

  function skipMigration() {
    localStorage.setItem(MIGRATION_KEY, 'true')
    setNeedsMigration(false)
  }

  return { needsMigration, markMigrationComplete, skipMigration }
}

// Get SQLite API with type safety
function getSQLiteAPI() {
  const api = (window as any).electronAPI?.sqlite
  if (!api) {
    throw new Error('SQLite API not available')
  }
  return api
}

export async function migrateToSQLite(
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> {
  let sqlite: any
  try {
    sqlite = getSQLiteAPI()
  } catch {
    return { success: false, recordsCopied: 0, error: 'SQLite not available' }
  }

  let totalRecords = 0
  const entities = ['products', 'categories', 'parties', 'sales', 'syncQueue'] as const
  
  try {
    // Ensure IndexedDB is open
    await db.open()

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      
      onProgress?.({
        stage: 'migrating',
        currentEntity: entity,
        totalEntities: entities.length,
        completedEntities: i,
        recordsCopied: totalRecords,
      })

      switch (entity) {
        case 'products': {
          const products = await db.products.toArray()
          if (products.length > 0) {
            // Map to SQLite format - use actual field names from Product type
            const mapped = products.map(p => ({
              id: p.id,
              productName: p.productName,
              productCode: p.productCode,
              categoryId: p.category_id,
              brandId: p.brand_id,
              unitId: p.unit_id,
              purchasePrice: p.productPurchasePrice,
              salePrice: p.stock?.productSalePrice,
              wholesalePrice: p.stock?.productWholeSalePrice,
              productPicture: p.productPicture,
              stock: p.stock,
              lastSyncedAt: p.lastSyncedAt,
            }))
            await sqlite.product.bulkUpsert(mapped)
            totalRecords += products.length
          }
          break
        }
        
        case 'categories': {
          const categories = await db.categories.toArray()
          if (categories.length > 0) {
            const mapped = categories.map(c => ({
              id: c.id,
              categoryName: c.categoryName,
              parentId: (c as any).parentId,
              lastSyncedAt: c.lastSyncedAt,
            }))
            await sqlite.category.bulkUpsert(mapped)
            totalRecords += categories.length
          }
          break
        }
        
        case 'parties': {
          const parties = await db.parties.toArray()
          if (parties.length > 0) {
            const mapped = parties.map(p => ({
              id: p.id,
              name: p.name,
              phone: p.phone,
              email: p.email,
              address: p.address,
              type: p.type,
              due: p.due,
              wallet: p.wallet,
              creditLimit: (p as any).creditLimit,
              lastSyncedAt: p.lastSyncedAt,
            }))
            await sqlite.party.bulkUpsert(mapped)
            totalRecords += parties.length
          }
          break
        }
        
        case 'sales': {
          const sales = await db.sales.toArray()
          for (const sale of sales) {
            await sqlite.sale.create({
              serverId: (sale as any).serverId,
              invoiceNumber: sale.invoiceNumber,
              offlineInvoiceNo: (sale as any).offlineInvoiceNo,
              partyId: (sale as any).partyId,
              saleDate: sale.saleDate,
              subtotal: (sale as any).subtotal,
              discountAmount: sale.discountAmount,
              vatAmount: (sale as any).vatAmount,
              totalAmount: sale.totalAmount,
              paidAmount: sale.paidAmount,
              dueAmount: sale.dueAmount,
              paymentTypeId: (sale as any).paymentTypeId,
              status: (sale as any).status,
              note: sale.note,
              isOffline: sale.isOffline,
              isSynced: sale.isSynced,
              tempId: sale.tempId,
              idempotencyKey: (sale as any).idempotencyKey,
              lastSyncedAt: sale.lastSyncedAt,
              syncError: sale.syncError,
            })
            totalRecords++
          }
          break
        }
        
        case 'syncQueue': {
          const queue = await db.syncQueue.toArray()
          for (const item of queue) {
            await sqlite.syncQueue.create({
              idempotencyKey: (item as any).idempotencyKey || `migrate-${Date.now()}-${Math.random()}`,
              entity: item.entity,
              operation: item.operation,
              entityId: item.entityId,
              endpoint: item.endpoint,
              method: item.method,
              data: typeof item.data === 'string' ? item.data : JSON.stringify(item.data),
              status: item.status,
              attempts: item.attempts,
              maxAttempts: item.maxAttempts,
              error: item.error,
              createdAt: item.createdAt,
              lastAttemptAt: item.lastAttemptAt,
            })
            totalRecords++
          }
          break
        }
      }
    }

    onProgress?.({
      stage: 'completed',
      currentEntity: '',
      totalEntities: entities.length,
      completedEntities: entities.length,
      recordsCopied: totalRecords,
    })

    return { success: true, recordsCopied: totalRecords }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    onProgress?.({
      stage: 'error',
      currentEntity: '',
      totalEntities: entities.length,
      completedEntities: 0,
      recordsCopied: totalRecords,
      error: errorMessage,
    })
    return { success: false, recordsCopied: totalRecords, error: errorMessage }
  }
}

// ============================================
// Migration UI Component
// ============================================

interface MigrationScreenProps {
  onComplete: () => void
  onSkip: () => void
}

export function MigrationScreen({ onComplete, onSkip }: MigrationScreenProps) {
  const [progress, setProgress] = useState<MigrationProgress>({
    stage: 'idle',
    currentEntity: '',
    totalEntities: 5,
    completedEntities: 0,
    recordsCopied: 0,
  })

  const startMigration = async () => {
    setProgress(p => ({ ...p, stage: 'migrating' }))
    
    const result = await migrateToSQLite(setProgress)
    
    if (result.success) {
      // Clear IndexedDB after successful migration
      try {
        await db.clearMasterData()
        await db.clearTransactionData()
        await db.clearSyncQueue()
      } catch {
        // Ignore cleanup errors
      }
      
      setTimeout(onComplete, 1500)
    }
  }

  const progressPercent = (progress.completedEntities / progress.totalEntities) * 100

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <Card className="w-[450px]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Database Upgrade</CardTitle>
          <CardDescription>
            {progress.stage === 'idle' && 'Upgrade to SQLite for better performance'}
            {progress.stage === 'migrating' && 'Migrating your data...'}
            {progress.stage === 'completed' && 'Migration completed!'}
            {progress.stage === 'error' && 'Migration failed'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {progress.stage === 'idle' && (
            <>
              <p className="text-sm text-muted-foreground text-center">
                We're upgrading your local database to SQLite for improved performance,
                reliability, and better offline support. Your data will be preserved.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onSkip}>
                  Skip (Use New DB)
                </Button>
                <Button className="flex-1" onClick={startMigration}>
                  Migrate Data
                </Button>
              </div>
            </>
          )}

          {progress.stage === 'migrating' && (
            <>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  Migrating {progress.currentEntity}... ({progress.recordsCopied} records)
                </span>
              </div>
            </>
          )}

          {progress.stage === 'completed' && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-sm text-muted-foreground">
                Successfully migrated {progress.recordsCopied} records
              </p>
            </div>
          )}

          {progress.stage === 'error' && (
            <>
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-destructive text-center">
                  {progress.error}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={onSkip}>
                  Skip Migration
                </Button>
                <Button className="flex-1" onClick={startMigration}>
                  Retry
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
