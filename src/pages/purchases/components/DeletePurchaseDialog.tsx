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
import type { Purchase } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface DeletePurchaseDialogProps {
  purchase: Purchase | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (purchase: Purchase) => Promise<void>
}

// ============================================
// Component
// ============================================

export const DeletePurchaseDialog = memo(function DeletePurchaseDialog({
  purchase,
  open,
  onOpenChange,
  onConfirm,
}: DeletePurchaseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!purchase) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm(purchase)
      onOpenChange(false)
    } catch {
      // Error is handled by parent
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Purchase
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete purchase{' '}
            <span className="font-semibold">{purchase.invoiceNumber}</span>?
            <br />
            <br />
            This action cannot be undone. The purchase record and all associated stock entries will
            be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
})

export default DeletePurchaseDialog
