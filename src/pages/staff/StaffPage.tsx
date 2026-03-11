import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  WifiOff,
  Shield,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useDebounce'
import { useStaff } from './hooks/useStaff'
import { StaffFormDialog, type StaffFormData } from './components/StaffFormDialog'
import type { CreateStaffRequest, StaffMember, StaffVisibility } from '@/types/api.types'

export function StaffPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [showForm, setShowForm] = useState(false)

  const debouncedSearch = useDebounce(searchQuery, 300)

  const {
    staff,
    isLoading,
    isOnline,
    createStaff,
    updateStaff,
    deleteStaff,
    isCreating,
    isUpdating,
    searchStaff,
  } = useStaff()

  const filteredStaff = useMemo(() => {
    if (!debouncedSearch) return staff
    return searchStaff(debouncedSearch)
  }, [staff, debouncedSearch, searchStaff])

  const handleAdd = () => {
    setSelectedMember(null)
    setShowForm(true)
  }

  const handleEdit = (member: StaffMember) => {
    setSelectedMember(member)
    setShowForm(true)
  }

  const handleDelete = async (member: StaffMember) => {
    await deleteStaff(member.id)
  }

  const handleSave = async (data: StaffFormData) => {
    const payload: CreateStaffRequest = {
      name: data.name,
      email: data.email,
      visibility: data.visibility as StaffVisibility,
      branch_id: data.branch_id === null ? undefined : data.branch_id,
    }

    if (data.password) {
      payload.password = data.password
    }

    if (!selectedMember) {
      await createStaff(payload)
    } else {
      await updateStaff(selectedMember.id, payload)
    }
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const getPermissionSummary = (visibility?: StaffVisibility | string): string => {
    if (!visibility) return 'No permissions'

    // Parse if it's a JSON string
    let parsed: StaffVisibility
    if (typeof visibility === 'string') {
      try {
        parsed = JSON.parse(visibility) as StaffVisibility
      } catch {
        return 'Invalid permissions'
      }
    } else {
      parsed = visibility
    }

    const granted = Object.entries(parsed).flatMap(([module, actions]) =>
      Object.entries(actions || {})
        .filter(([, v]) => v === '1')
        .map(([action]) => `${module}:${action}`)
    )
    if (granted.length === 0) return 'No permissions'
    if (granted.length <= 3) return granted.join(', ')
    return `${granted.length} permissions`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">Manage your staff members and their permissions</p>
        </div>
        <Button onClick={handleAdd} disabled={!isOnline}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or branch..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Loading staff...'
              : `${filteredStaff.length} ${filteredStaff.length === 1 ? 'staff member' : 'staff members'} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStaff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <UserCog className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No staff members found</h3>
                  <p className="mb-4">
                    {searchQuery
                      ? `No staff matching "${searchQuery}"`
                      : 'Get started by adding your first staff member'}
                  </p>
                  <Button onClick={handleAdd} variant="outline" disabled={!isOnline}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff Member
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {filteredStaff.map((member) => (
                    <li
                      key={member.id}
                      className="group -mx-2 flex flex-col gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border">
                          <AvatarFallback className="bg-primary/10 font-medium text-primary">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{member.name}</span>
                            {member.branch && (
                              <Badge variant="outline" className="h-5 text-[10px]">
                                {member.branch.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                            <span>{member.email}</span>
                            {member.branch && (
                              <>
                                <span className="hidden text-muted-foreground/50 sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {getPermissionSummary(member.visibility)}
                                </span>
                              </>
                            )}
                            {!member.branch && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {getPermissionSummary(member.visibility)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pl-14 sm:pl-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(member)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(member)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!isOnline && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <WifiOff className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                You are currently offline
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                You can view cached staff, but creating, editing, or deleting staff requires an
                active internet connection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <StaffFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        initialData={selectedMember}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  )
}

export default StaffPage
