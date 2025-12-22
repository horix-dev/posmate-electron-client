import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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

interface DeleteConfirmDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description?: string
    itemName?: string
    isLoading?: boolean
    onConfirm: () => Promise<void> | void
    onCancel?: () => void
}

export function DeleteConfirmDialog({
    isOpen,
    onOpenChange,
    title = 'Delete Item',
    description = 'This action cannot be undone.',
    itemName,
    isLoading = false,
    onConfirm,
    onCancel,
}: DeleteConfirmDialogProps) {
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
            <AlertDialogContent className="max-w-md border-destructive/20 shadow-2xl">
                <AlertDialogHeader>
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 pt-1">
                            <AlertDialogTitle className="text-xl font-semibold text-foreground">
                                {title}
                            </AlertDialogTitle>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogDescription className="space-y-3 pl-16 text-base">
                    <p className="text-muted-foreground">{description}</p>
                    {itemName && (
                        <div className="rounded-lg bg-muted/50 px-4 py-3">
                            <p className="text-sm font-medium text-foreground">
                                <span className="text-muted-foreground">Item: </span>
                                <span className="text-foreground">{itemName}</span>
                            </p>
                        </div>
                    )}
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
                        className="min-w-[120px] bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 hover:shadow-xl dark:from-red-600 dark:to-red-700"
                    >
                        {isConfirming ? (
                            <>
                                <span className="mr-2">Deleting...</span>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
