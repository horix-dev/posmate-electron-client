import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import banksService from '@/api/services/banks.service'

interface Props {
  open: boolean
  bankId: number | null
  bankName?: string
  onClose: () => void
  onDeleted: () => void
}

export default function DeleteBankDialog({ open, bankId, bankName, onClose, onDeleted }: Props) {
  const handleConfirm = async () => {
    if (!bankId) return
    try {
      await banksService.delete(bankId)
      toast.success('Bank deleted')
      onDeleted()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete bank')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bank</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold">{bankName}</span>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
