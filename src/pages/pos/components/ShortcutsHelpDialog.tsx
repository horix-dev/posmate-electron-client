import { memo } from 'react'
import { Keyboard, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { POS_SHORTCUT_KEYS } from '../hooks/usePOSKeyboard'

// ============================================
// Types
// ============================================

export interface ShortcutsHelpDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Close dialog callback */
  onClose: () => void
}

// ============================================
// Component
// ============================================

function ShortcutsHelpDialogComponent({
  open,
  onClose,
}: ShortcutsHelpDialogProps) {
  const shortcuts = [
    { key: POS_SHORTCUT_KEYS.PAY, label: 'Open payment dialog' },
    { key: POS_SHORTCUT_KEYS.HOLD, label: 'Hold current cart' },
    { key: POS_SHORTCUT_KEYS.RECALL, label: 'Recall held cart' },
    { key: POS_SHORTCUT_KEYS.CUSTOMER, label: 'Select customer' },
    { key: POS_SHORTCUT_KEYS.DISCOUNT, label: 'Apply discount' },
    { key: POS_SHORTCUT_KEYS.NEW_SALE, label: 'New sale' },
    { key: POS_SHORTCUT_KEYS.SEARCH_FOCUS, label: 'Focus search' },
    { key: POS_SHORTCUT_KEYS.CLEAR, label: 'Clear / Close dialogs' },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-sm"
        aria-describedby="shortcuts-help-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription id="shortcuts-help-description">
            Use these shortcuts for faster operation
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-2">
          {shortcuts.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <kbd className="rounded bg-muted px-2 py-1 text-xs font-mono font-semibold">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Barcode Scanner:</strong> Scan barcodes directly to add products
          </p>
          <p>
            <strong>Quick Search:</strong> Type in the search box to filter products
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const ShortcutsHelpDialog = memo(ShortcutsHelpDialogComponent)

ShortcutsHelpDialog.displayName = 'ShortcutsHelpDialog'

export default ShortcutsHelpDialog
