import { memo, useEffect, useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Upload,
  X,
  User,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  Wallet,
  CreditCard,
  ArrowRightLeft,
  DollarSign,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Party } from '@/types/api.types'
import {
  customerFormSchema,
  type CustomerFormData,
  defaultCustomerFormValues,
  partyToCustomerFormData,
} from '../schemas'

// ============================================
// Types
// ============================================

export interface CustomerFormDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Customer to edit, null for create mode */
  initialData?: Party | null
  /** Callback when form is submitted successfully */
  onSave: (data: CustomerFormData) => Promise<void>
  /** Whether the form is currently saving */
  isSaving?: boolean
}

// ============================================
// Main Component
// ============================================

function CustomerFormDialogComponent({
  open,
  onOpenChange,
  initialData,
  onSave,
  isSaving = false,
}: CustomerFormDialogProps) {
  const isEdit = !!initialData
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Initialize form with react-hook-form and zod validation
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: defaultCustomerFormValues,
  })

  // Reset form when dialog opens or customer changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        const formData = partyToCustomerFormData(initialData)
        form.reset(formData)
        setImagePreview(initialData.image || null)
      } else {
        form.reset(defaultCustomerFormValues)
        setImagePreview(null)
      }
    }
  }, [open, initialData, form])

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      form.setValue('image', file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle image removal
  const handleImageRemove = () => {
    form.setValue('image', undefined)
    setImagePreview(null)
  }

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: CustomerFormData) => {
      await onSave(data)
      onOpenChange(false)
    },
    [onSave, onOpenChange]
  )

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!isSaving) {
      onOpenChange(false)
    }
  }, [isSaving, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col"
        aria-describedby="customer-form-description"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription id="customer-form-description">
            {isEdit
              ? 'Update the customer information below.'
              : 'Fill in the customer details below to add a new customer.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
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
                          <Input className="pl-9" placeholder="Enter customer name" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Customer Type */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <div className="relative">
                            <Tag className="absolute left-2.5 top-2.5 z-10 h-4 w-4 text-muted-foreground" />
                            <SelectTrigger className="pl-9">
                              <SelectValue placeholder="Select customer type" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Retailer">Retailer</SelectItem>
                          <SelectItem value="Dealer">Dealer</SelectItem>
                          <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <PhoneIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="Enter phone number" {...field} />
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
                    <FormItem className="col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            type="email"
                            placeholder="Enter email"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                          <Textarea
                            className="min-h-[80px] pl-9"
                            placeholder="Enter address details"
                            rows={2}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 rounded-lg border bg-muted/10 p-4 md:grid-cols-2">
                {/* Credit Limit */}
                <FormField
                  control={form.control}
                  name="credit_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Limit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            className="pl-9"
                            placeholder="Enter credit limit"
                            step="0.01"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? parseFloat(e.target.value) : undefined
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Max credit amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opening Balance */}
                <FormField
                  control={form.control}
                  name="opening_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Balance</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Wallet className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            className="pl-9"
                            placeholder="0.00"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? parseFloat(e.target.value) : 0)
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Initial balance amount</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Opening Balance Type */}
                <FormField
                  control={form.control}
                  name="opening_balance_type"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Balance Type *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-2"
                        >
                          <div>
                            <RadioGroupItem value="due" id="due" className="peer sr-only" />
                            <Label
                              htmlFor="due"
                              className={cn(
                                'flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 transition-all hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                                field.value === 'due' && 'border-primary bg-primary/10'
                              )}
                            >
                              <CreditCard className="mb-1 h-4 w-4" />
                              <span className="text-xs font-semibold">Due</span>
                              <span className="line-clamp-1 text-center text-[10px] text-muted-foreground">
                                They owe you
                              </span>
                            </Label>
                          </div>
                          <div>
                            <RadioGroupItem value="advance" id="advance" className="peer sr-only" />
                            <Label
                              htmlFor="advance"
                              className={cn(
                                'flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 transition-all hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary',
                                field.value === 'advance' && 'border-primary bg-primary/10'
                              )}
                            >
                              <ArrowRightLeft className="mb-1 h-4 w-4" />
                              <span className="text-xs font-semibold">Advance</span>
                              <span className="line-clamp-1 text-center text-[10px] text-muted-foreground">
                                You owe them
                              </span>
                            </Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload */}
              <FormField
                control={form.control}
                name="image"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                render={({ field: { onChange: _onChange, value: _value, ...fieldRest } }) => (
                  <FormItem>
                    <FormLabel>Customer Image</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        {imagePreview && (
                          <div className="group relative shrink-0">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="h-20 w-20 rounded-md border object-cover shadow-sm"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                              onClick={handleImageRemove}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex-1">
                          <Label
                            htmlFor="image-upload"
                            className="flex h-20 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 transition-colors hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                              <Upload className="h-4 w-4" />
                              <span className="text-sm font-medium">Click to upload image</span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">MAX 2MB</p>
                          </Label>
                          <Input
                            id="image-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/gif"
                            {...fieldRest}
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="mt-2 shrink-0 border-t pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export const CustomerFormDialog = memo(CustomerFormDialogComponent)

CustomerFormDialog.displayName = 'CustomerFormDialog'

export type { CustomerFormData }

export default CustomerFormDialog
