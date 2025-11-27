import { memo } from 'react'
import { Loader2 } from 'lucide-react'
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
import type { Product } from '@/types/api.types'

// ============================================
// Types
// ============================================

export interface DeleteProductDialogProps {
  /** Product to delete, null if dialog should be closed */
  product: Product | null
  /** Whether the delete operation is in progress */
  isDeleting: boolean
  /** Callback to confirm deletion */
  onConfirm: () => void
  /** Callback when dialog should be closed */
  onCancel: () => void
}

// ============================================
// Main Component
// ============================================

function DeleteProductDialogComponent({
  product,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteProductDialogProps) {
  return (
    <AlertDialog open={!!product} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{product?.productName}"? This action cannot be undone
            and will permanently remove the product from your inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export const DeleteProductDialog = memo(DeleteProductDialogComponent)

DeleteProductDialog.displayName = 'DeleteProductDialog'

export default DeleteProductDialog
