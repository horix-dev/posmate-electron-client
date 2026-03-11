import { memo, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, User, Mail, Lock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import type { StaffMember } from '@/types/api.types'
import {
  staffFormSchema,
  type StaffFormData,
  defaultStaffFormValues,
  staffMemberToFormData,
} from '../schemas'

export interface StaffFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: StaffMember | null
  onSave: (data: StaffFormData) => Promise<void>
  isSaving?: boolean
}

// Modules and their available actions
const PERMISSION_MODULES = [
  { key: 'sales', label: 'Sales', actions: ['view', 'create', 'delete'] },
  { key: 'products', label: 'Products', actions: ['view', 'create'] },
  { key: 'parties', label: 'Parties', actions: ['view', 'create'] },
  { key: 'purchases', label: 'Purchases', actions: ['view', 'create'] },
  { key: 'reports', label: 'Reports', actions: ['view'] },
  { key: 'stock_adjustments', label: 'Stock Adjustments', actions: ['view', 'create'] },
] as const

type ModuleKey = (typeof PERMISSION_MODULES)[number]['key']

function StaffFormDialogComponent({
  open,
  onOpenChange,
  initialData,
  onSave,
  isSaving = false,
}: StaffFormDialogProps) {
  const isEdit = !!initialData

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: defaultStaffFormValues,
  })

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset(staffMemberToFormData(initialData))
      } else {
        form.reset(defaultStaffFormValues)
      }
    }
  }, [open, initialData, form])

  const handleSubmit = useCallback(
    async (data: StaffFormData) => {
      try {
        await onSave(data)
        onOpenChange(false)
      } catch (err) {
        // onSave (mutation) already shows a toast via onError;
        // catch here to prevent unhandled rejection and keep dialog open
        console.error('[StaffFormDialog] save error:', err)
      }
    },
    [onSave, onOpenChange]
  )

  const handleInvalid = useCallback(() => {
    const errors = form.formState.errors
    console.error('[StaffFormDialog] Validation errors:', errors)

    // Find first error message
    const firstError = Object.values(errors)[0]
    const errorMessage = firstError?.message || 'Please fix the form errors before saving.'

    toast.error(errorMessage)
  }, [form])

  const handleClose = useCallback(() => {
    if (!isSaving) onOpenChange(false)
  }, [isSaving, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col"
        aria-describedby="staff-form-description"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          <DialogDescription id="staff-form-description">
            {isEdit
              ? 'Update staff member details and permissions.'
              : 'Fill in the details to create a new staff member.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto px-1 py-2">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="Enter full name" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            type="email"
                            placeholder="staff@example.com"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isEdit ? 'New Password' : 'Password *'}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            type="password"
                            autoComplete="new-password"
                            placeholder={isEdit ? 'Leave blank to keep existing' : 'Enter password'}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Permissions */}
              <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Module Permissions</span>
                </div>

                <div className="space-y-4">
                  {PERMISSION_MODULES.map((module) => (
                    <div key={module.key} className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {module.label}
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {module.actions.map((action) => (
                          <FormField
                            key={`${module.key}.${action}`}
                            control={form.control}
                            name={
                              `visibility.${module.key as ModuleKey}.${action}` as `visibility.${ModuleKey}.view`
                            }
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value === '1'}
                                    onCheckedChange={(checked) =>
                                      field.onChange(checked ? '1' : '0')
                                    }
                                  />
                                </FormControl>
                                <FormLabel className="cursor-pointer text-sm font-normal capitalize">
                                  {action}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 shrink-0">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Save Changes' : 'Add Staff Member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const StaffFormDialog = memo(StaffFormDialogComponent)
export type { StaffFormData }
