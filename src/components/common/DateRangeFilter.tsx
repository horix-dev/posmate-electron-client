import { useState } from 'react'
import { CalendarIcon, X, Check } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DashboardDuration = 'today' | 'yesterday' | 'last_seven_days' | 'last_thirty_days' | 'current_month' | 'last_month' | 'current_year' | 'custom_date'

const DASHBOARD_DURATION_LABELS: Record<DashboardDuration, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last_seven_days: 'Last 7 Days',
  last_thirty_days: 'Last 30 Days',
  current_month: 'Current Month',
  last_month: 'Last Month',
  current_year: 'Current Year',
  custom_date: 'Custom Range',
}

function getDateRangeForDuration(duration: DashboardDuration): DateRange | undefined {
  const today = new Date()
  switch (duration) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const yest = subDays(today, 1)
      return { from: yest, to: yest }
    }
    case 'last_seven_days':
      return { from: subDays(today, 6), to: today }
    case 'last_thirty_days':
      return { from: subDays(today, 29), to: today }
    case 'current_month':
      return { from: startOfMonth(today), to: endOfMonth(today) }
    case 'last_month': {
      const lastMonth = subMonths(today, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'current_year':
      return { from: startOfYear(today), to: today }
    default:
      return undefined
  }
}

interface DateRangeFilterProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
}

export function DateRangeFilter({ value, onChange, placeholder = 'Filter by date' }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<DashboardDuration>('today')
  const [date, setDate] = useState<DateRange | undefined>(value)

  const handlePresetSelect = (preset: DashboardDuration) => {
    setSelectedPreset(preset)
    if (preset !== 'custom_date') {
      const range = getDateRangeForDuration(preset)
      setDate(range)
    }
  }

  const handleDateSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate)
  }

  const handleApply = () => {
    onChange(date)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
    setDate(undefined)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-10 justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            <>
              {format(date.from, 'MMM dd, yyyy')} -{' '}
              {date.to ? format(date.to, 'MMM dd, yyyy') : '...'}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
          {date?.from && (
            <span
              className="ml-2 rounded-full p-0.5 hover:bg-background/20"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex h-full flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="flex min-w-[150px] flex-col border-b bg-muted/10 p-2 sm:border-b-0 sm:border-r">
            <div className="mb-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
              Quick Select
            </div>
            <div className="flex flex-col gap-1">
              {(Object.keys(DASHBOARD_DURATION_LABELS) as DashboardDuration[])
                .filter((k) => k !== 'custom_date')
                .map((key) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 justify-start px-2 font-normal',
                      selectedPreset === key && 'bg-primary/10 font-medium text-primary'
                    )}
                    onClick={() => handlePresetSelect(key)}
                  >
                    {DASHBOARD_DURATION_LABELS[key]}
                    {selectedPreset === key && <Check className="ml-auto h-3 w-3 opacity-50" />}
                  </Button>
                ))}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 justify-start px-2 font-normal',
                  selectedPreset === 'custom_date' && 'bg-primary/10 font-medium text-primary'
                )}
                onClick={() => handlePresetSelect('custom_date')}
              >
                Custom Range
                {selectedPreset === 'custom_date' && (
                  <Check className="ml-auto h-3 w-3 opacity-50" />
                )}
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col p-3">
            <div className="mb-3 flex flex-col gap-1 px-1">
              <span className="text-sm font-semibold">
                {selectedPreset === 'custom_date'
                  ? 'Select Range'
                  : DASHBOARD_DURATION_LABELS[selectedPreset]}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {date?.from ? (
                  <>
                    {format(date.from, 'MMM dd, yyyy')} -{' '}
                    {date.to ? format(date.to, 'MMM dd, yyyy') : '...'}
                  </>
                ) : (
                  'Pick a date range'
                )}
              </span>
            </div>
            <CalendarComponent
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="rounded-md border p-0"
            />
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}


