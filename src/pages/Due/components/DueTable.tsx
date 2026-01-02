import { useState, useEffect } from 'react'
import { useCurrency } from '@/hooks'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HandCoins, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { Party } from '@/types/api.types'

interface DueTableProps {
  data: Party[]
  isLoading: boolean
  type: 'all' | 'supplier' | 'customer'
  onSelectionChange?: (ids: number[]) => void
  onCollectDue?: (party: Party) => void
  onDelete?: (id: number) => void
}

export function DueTable({ data, isLoading, onSelectionChange, onCollectDue, onDelete }: DueTableProps) {
  const { format: formatCurrency } = useCurrency()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Handle Selection
  const totalPages = Math.ceil(data.length / perPage)
  const startIndex = (currentPage - 1) * perPage
  const paginatedData = data.slice(startIndex, startIndex + perPage)
  const startEntry = data.length === 0 ? 0 : startIndex + 1
  const endEntry = Math.min(currentPage * perPage, data.length)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const visibleIds = paginatedData.map((p) => p.id)
      setSelectedIds(visibleIds)
      onSelectionChange?.(visibleIds)
    } else {
      setSelectedIds([])
      onSelectionChange?.([])
    }
  }

  const handleSelectOne = (checked: boolean, id: number) => {
    let newSelected: number[] = []
    if (checked) {
      newSelected = [...selectedIds, id]
    } else {
      newSelected = selectedIds.filter((sid) => sid !== id)
    }
    setSelectedIds(newSelected)
    onSelectionChange?.(newSelected)
  }

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [data])

  const getPartyTypeBadge = (type: string) => {
    if (type === 'Supplier') {
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">Supplier</Badge>
    }
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 border">Customer</Badge>
  }

  const getDueStatusBadge = (dueAmount: number) => {
    if (dueAmount === 0) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Cleared
        </Badge>
      )
    }
    if (dueAmount > 0) {
      return (
        <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
          Outstanding
        </Badge>
      )
    }
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">Advance</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              setPerPage(Number(v))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={perPage} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>

        {selectedIds.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {selectedIds.length} party/parties selected
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((item) => selectedIds.includes(item.id))
                      }
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                  </TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Due Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No parties with outstanding dues found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(party.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(checked as boolean, party.id)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{party.name}</TableCell>
                      <TableCell>{getPartyTypeBadge(party.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {party.email || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {party.phone || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(party.due || 0)}
                      </TableCell>
                      <TableCell>{getDueStatusBadge(party.due || 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Collect Due"
                            onClick={() => onCollectDue?.(party)}
                          >
                            <HandCoins className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => onDelete?.(party.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">
              Showing {startEntry} to {endEntry} of {data.length} entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else {
                    if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
