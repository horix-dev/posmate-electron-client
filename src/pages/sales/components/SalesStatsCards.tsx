import { DollarSign, Receipt, CreditCard, Cloud, CloudOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { SalesStats } from '../hooks'

interface SalesStatsCardsProps {
  stats: SalesStats
  currencySymbol: string
  isLoading: boolean
}

export function SalesStatsCards({ stats, currencySymbol, isLoading }: SalesStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const cards = [
    {
      title: 'Total Sales',
      value: stats.total.toString(),
      subtitle: formatCurrency(stats.totalAmount),
      icon: Receipt,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Received',
      value: formatCurrency(stats.totalPaid),
      subtitle: `${stats.paidCount} fully paid`,
      icon: DollarSign,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Due',
      value: formatCurrency(stats.totalDue),
      subtitle: `${stats.partialCount + stats.unpaidCount} pending`,
      icon: CreditCard,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Pending Sync',
      value: stats.pendingSyncCount.toString(),
      subtitle: stats.pendingSyncCount > 0 ? 'Waiting to sync' : 'All synced',
      icon: stats.pendingSyncCount > 0 ? CloudOff : Cloud,
      iconColor: stats.pendingSyncCount > 0 ? 'text-yellow-500' : 'text-green-500',
      bgColor: stats.pendingSyncCount > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default SalesStatsCards
