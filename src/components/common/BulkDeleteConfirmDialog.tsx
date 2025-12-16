import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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

interface BulkDeleteConfirmDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    itemCount: number
    itemLabel?: string
    isLoading?: boolean
    onConfirm: () => Promise<void> | void
    onCancel?: () => void
}

export function BulkDeleteConfirmDialog({
    isOpen,
    onOpenChange,
    itemCount,
    itemLabel = 'items',
    isLoading = false,
    onConfirm,
    onCancel,
}: BulkDeleteConfirmDialogProps) {
    const [isConfirming, setIsConfirming] = useState(false)

    const handleConfirm = async () => {
        setIsConfirming(true)
        try {
            await onConfirm()
        } finally {
            setIsConfirming(false)
            onOpenChange(false)
        }
    }

    const handleCancel = () => {
        onCancel?.()
        onOpenChange(false)
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md border-amber-200 shadow-2xl dark:border-amber-900/50">
                <AlertDialogHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 pt-1">
                            <AlertDialogTitle className="text-xl font-semibold text-foreground">
                                Delete {itemCount} {itemLabel}?
                            </AlertDialogTitle>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogDescription className="space-y-4 pl-16 text-base">
                    <p className="text-muted-foreground">
                        You are about to permanently delete{' '}
                        <span className="font-semibold text-foreground">{itemCount}</span>{' '}
                        {itemLabel}.
                    </p>
                    <div className="rounded-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 px-4 py-3 dark:border-red-900 dark:from-red-950 dark:to-red-900/50">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                This action cannot be undone. All data associated with these {itemLabel} will be
                                permanently removed.
                            </p>
                        </div>
                    </div>
                </AlertDialogDescription>
                <AlertDialogFooter className="pl-16 pt-2">
                    <AlertDialogCancel
                        onClick={handleCancel}
                        disabled={isLoading || isConfirming}
                        className="min-w-[100px]"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading || isConfirming}
                        className="min-w-[140px] bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 hover:shadow-xl dark:from-red-600 dark:to-red-700"
                    >
                        {isConfirming ? (
                            <>
                                <span className="mr-2">Deleting...</span>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            </>
                        ) : (
                            `Delete All ${itemCount}`
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
