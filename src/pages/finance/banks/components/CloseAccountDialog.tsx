import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import banksService from '@/api/services/banks.service'

interface Props {
  open: boolean
  bankId: number | null
  bankName?: string
  onClose: () => void
  onClosed: () => void
}

export default function CloseAccountDialog({ open, bankId, bankName, onClose, onClosed }: Props) {
  const handleConfirm = async () => {
    if (!bankId) return
    try {
      await banksService.close(bankId)
      toast.success('Account closed')
      onClosed()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to close account')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Account</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Closing <span className="font-semibold">{bankName}</span> will mark it as closed. You cannot perform deposits or withdrawals on a closed account.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Close Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
