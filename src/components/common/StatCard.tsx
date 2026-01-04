import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: string
  description?: string
  icon: React.ElementType
  iconClassName?: string
  iconContainerClassName?: string
  trend?: 'up' | 'down'
  trendValue?: string
  loading?: boolean
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  iconContainerClassName,
  trend,
  trendValue,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground',
            iconContainerClassName
          )}
        >
          <Icon className={cn('h-4 w-4', iconClassName)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              <span
                className={`flex items-center ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}
              >
                {trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trendValue}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
