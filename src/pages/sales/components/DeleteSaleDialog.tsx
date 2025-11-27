import { memo, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Sale } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface DeleteSaleDialogProps {
  /** Sale to delete */
  sale: Sale | null
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when delete is confirmed */
  onConfirm: (sale: Sale) => Promise<void>
}

// ============================================
// Main Component
// ============================================

function DeleteSaleDialogComponent({
  sale,
  open,
  onOpenChange,
  onConfirm,
}: DeleteSaleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    if (!sale) return
    
    setIsDeleting(true)
    try {
      await onConfirm(sale)
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!sale) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to delete sale{' '}
            <span className="font-medium text-foreground">
              {sale.invoiceNumber || `#${sale.id}`}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const DeleteSaleDialog = memo(DeleteSaleDialogComponent)

DeleteSaleDialog.displayName = 'DeleteSaleDialog'

export default DeleteSaleDialog
