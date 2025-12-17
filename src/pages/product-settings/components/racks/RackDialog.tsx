import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronsUpDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { racksService } from '@/api/services/racks.service'
import { shelvesService } from '@/api/services/shelves.service'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import type { Rack, Shelf } from '@/types/api.types'

const rackSchema = z.object({
  name: z.string().min(1, 'Rack name is required'),
  status: z.boolean().default(true),
  shelf_ids: z.array(z.number()).optional(),
})

type RackFormValues = z.infer<typeof rackSchema>

interface RackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editData?: Rack | null
  onSuccess: () => void
}

export function RackDialog({ open, onOpenChange, editData, onSuccess }: RackDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [shelvesLoading, setShelvesLoading] = useState(false)
  const [shelvesOpen, setShelvesOpen] = useState(false)

  const form = useForm<RackFormValues>({
    resolver: zodResolver(rackSchema),
    defaultValues: { name: '', status: true, shelf_ids: [] },
  })

  useEffect(() => {
    if (open) {
      if (editData) form.reset({ name: editData.name, status: (editData.status ?? 1) === 1, shelf_ids: [] })
      else form.reset({ name: '', status: true, shelf_ids: [] })

      // Load shelves list
      const fetchShelves = async () => {
        setShelvesLoading(true)
        try {
          const resp = await shelvesService.getAll({ page: 1, per_page: 1000 })
          const payload: any = resp as any
          const list: Shelf[] = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.data?.data)
            ? payload.data.data
            : []
          setShelves(Array.isArray(list) ? list : [])
        } catch (e) {
          setShelves([])
          // Non-blocking: just notify
          toast.error('Failed to load shelves')
        } finally {
          setShelvesLoading(false)
        }
      }
      fetchShelves()
    }
  }, [open, editData, form])

  const onSubmit = async (values: RackFormValues) => {
    setIsSubmitting(true)
    try {
      if (editData) {
        await racksService.update(editData.id, { name: values.name, shelf_id: values.shelf_ids })
        if ((editData.status ?? 1) !== (values.status ? 1 : 0)) await racksService.updateStatus(editData.id, values.status)
        toast.success('Rack updated successfully')
      } else {
        await racksService.create({ name: values.name, status: values.status, shelf_id: values.shelf_ids })
        toast.success('Rack created successfully')
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(editData ? 'Failed to update rack' : 'Failed to create rack')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editData ? 'Edit Rack' : 'Add New Rack'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rack Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Rack A1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shelf_ids"
              render={({ field }) => {
                const selectedIds = field.value || []
                const selectedCount = selectedIds.length
                return (
                  <FormItem>
                    <FormLabel> Shelves </FormLabel>
                    <FormControl>
                      <Popover open={shelvesOpen} onOpenChange={setShelvesOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" aria-expanded={shelvesOpen} className="w-full justify-between">
                            {selectedCount > 0 ? `${selectedCount} selected` : shelvesLoading ? 'Loading shelves...' : 'Select shelves'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0">
                          <Command>
                            <CommandInput placeholder="Search shelves..." />
                            <CommandList>
                              <CommandEmpty>No shelves found.</CommandEmpty>
                              <CommandGroup>
                                {shelves.map((s) => {
                                  const isChecked = (field.value || []).includes(s.id)
                                  return (
                                    <CommandItem
                                      key={s.id}
                                      value={s.name}
                                      onSelect={() => {
                                        const current: number[] = Array.isArray(field.value) ? field.value.slice() : []
                                        const idx = current.indexOf(s.id)
                                        if (idx > -1) current.splice(idx, 1)
                                        else current.push(s.id)
                                        field.onChange(current)
                                      }}
                                    >
                                      <Checkbox checked={isChecked} className="mr-2" />
                                      {s.name}
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormDescription>Select one or more shelves for this rack.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>Enable or disable this rack.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editData ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default RackDialog
