import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import type { Bank } from '@/types/api.types'
import { useCurrency } from '@/hooks'

interface Props {
  open: boolean
  bank: Bank | null
  onClose: () => void
}

export default function BankDetailsDrawer({ open, bank, onClose }: Props) {
  const { format } = useCurrency()
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bank Details</DialogTitle>
        </DialogHeader>
        {bank && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Name</div>
                  <div className="font-medium">{bank.name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Account #</div>
                  <div className="font-medium">{bank.account_number}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Bank</div>
                  <div className="font-medium">{bank.bank_name}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Branch</div>
                  <div className="font-medium">{bank.branch?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Current Balance</div>
                  <div className="font-medium">{format(bank.current_balance || 0)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">{bank.status}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">IFSC</div>
                  <div className="font-medium">{(((bank as unknown) as Record<string, unknown>)?.ifsc || '-') as React.ReactNode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">SWIFT</div>
                  <div className="font-medium">{(((bank as unknown) as Record<string, unknown>)?.swift || '-') as React.ReactNode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Routing #</div>
                  <div className="font-medium">{(((bank as unknown) as Record<string, unknown>)?.routing_number || '-') as React.ReactNode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">UPI ID</div>
                  <div className="font-medium">{(((bank as unknown) as Record<string, unknown>)?.upi_id || '-') as React.ReactNode}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
