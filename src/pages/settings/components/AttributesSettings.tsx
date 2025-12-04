import { useState, memo } from 'react'
import {
  Plus,
  Trash2,
  Palette,
  ToggleLeft,
  List,
  Loader2,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { attributesService, attributeValuesService } from '@/api/services'
import type { Attribute, AttributeDisplayType, AttributeValue } from '@/types/variant.types'

// ============================================
// Types
// ============================================

interface AttributesSettingsProps {
  attributes: Attribute[]
  isLoading: boolean
  onRefresh: () => void
}

interface NewAttributeForm {
  name: string
  type: AttributeDisplayType
}

// ============================================
// Helper Functions
// ============================================

const getAttributeTypeIcon = (type: AttributeDisplayType) => {
  switch (type) {
    case 'color':
      return <Palette className="h-4 w-4" />
    case 'button':
      return <ToggleLeft className="h-4 w-4" />
    case 'select':
      return <List className="h-4 w-4" />
    default:
      return <Tag className="h-4 w-4" />
  }
}

const getAttributeTypeLabel = (type: AttributeDisplayType) => {
  switch (type) {
    case 'color':
      return 'Color Swatches'
    case 'button':
      return 'Button Selection'
    case 'select':
      return 'Dropdown'
    default:
      return type
  }
}

// ============================================
// Attribute Value Row
// ============================================

interface ValueRowProps {
  value: AttributeValue
  attributeType: AttributeDisplayType
  onDelete: (id: number) => void
  isDeleting: boolean
}

const ValueRow = memo(function ValueRow({
  value,
  attributeType,
  onDelete,
  isDeleting,
}: ValueRowProps) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        {attributeType === 'color' && value.color_code && (
          <div
            className="h-5 w-5 rounded-full border"
            style={{ backgroundColor: value.color_code }}
          />
        )}
        <span className="text-sm">{value.value}</span>
        {value.color_code && attributeType === 'color' && (
          <span className="text-xs text-muted-foreground">{value.color_code}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive hover:text-destructive"
        onClick={() => onDelete(value.id)}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Trash2 className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
})

// ============================================
// Add Value Form
// ============================================

interface AddValueFormProps {
  attributeId: number
  attributeType: AttributeDisplayType
  onAdd: (attributeId: number, value: string, colorCode?: string) => Promise<void>
  isAdding: boolean
}

const AddValueForm = memo(function AddValueForm({
  attributeId,
  attributeType,
  onAdd,
  isAdding,
}: AddValueFormProps) {
  const [value, setValue] = useState('')
  const [colorCode, setColorCode] = useState('#000000')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    await onAdd(
      attributeId,
      value.trim(),
      attributeType === 'color' ? colorCode : undefined
    )
    setValue('')
    setColorCode('#000000')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        placeholder="Add new value..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 flex-1"
        disabled={isAdding}
      />
      {attributeType === 'color' && (
        <Input
          type="color"
          value={colorCode}
          onChange={(e) => setColorCode(e.target.value)}
          className="h-8 w-12 cursor-pointer p-1"
          disabled={isAdding}
        />
      )}
      <Button type="submit" size="sm" disabled={!value.trim() || isAdding}>
        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </form>
  )
})

// ============================================
// Attribute Card
// ============================================

interface AttributeCardProps {
  attribute: Attribute
  onDelete: (id: number) => void
  onAddValue: (attributeId: number, value: string, colorCode?: string) => Promise<void>
  onDeleteValue: (attributeId: number, valueId: number) => Promise<void>
  isDeleting: boolean
  isAddingValue: boolean
  deletingValueId: number | null
}

const AttributeCard = memo(function AttributeCard({
  attribute,
  onDelete,
  onAddValue,
  onDeleteValue,
  isDeleting,
  isAddingValue,
  deletingValueId,
}: AttributeCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getAttributeTypeIcon(attribute.type)}
              <div>
                <CardTitle className="text-base">{attribute.name}</CardTitle>
                <CardDescription className="text-xs">
                  {getAttributeTypeLabel(attribute.type)} • {attribute.values?.length || 0} values
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Values list */}
          {attribute.values && attribute.values.length > 0 ? (
            <div className="space-y-2">
              {attribute.values.map((value) => (
                <ValueRow
                  key={value.id}
                  value={value}
                  attributeType={attribute.type}
                  onDelete={(valueId) => onDeleteValue(attribute.id, valueId)}
                  isDeleting={deletingValueId === value.id}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No values added yet</p>
          )}

          <Separator />

          {/* Add value form */}
          <AddValueForm
            attributeId={attribute.id}
            attributeType={attribute.type}
            onAdd={onAddValue}
            isAdding={isAddingValue}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attribute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{attribute.name}" attribute and all its values.
              Products using this attribute may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(attribute.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

// ============================================
// Create Attribute Dialog
// ============================================

interface CreateAttributeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string, type: AttributeDisplayType) => Promise<void>
  isCreating: boolean
}

const CreateAttributeDialog = memo(function CreateAttributeDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateAttributeDialogProps) {
  const [form, setForm] = useState<NewAttributeForm>({ name: '', type: 'button' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return

    await onCreate(form.name.trim(), form.type)
    setForm({ name: '', type: 'button' })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Attribute</DialogTitle>
          <DialogDescription>
            Attributes define variations for your products (e.g., Size, Color, Material).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="attr-name">Attribute Name</Label>
            <Input
              id="attr-name"
              placeholder="e.g., Size, Color, Material"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attr-type">Display Type</Label>
            <Select
              value={form.type}
              onValueChange={(value: AttributeDisplayType) => setForm({ ...form, type: value })}
              disabled={isCreating}
            >
              <SelectTrigger id="attr-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="button">
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4" />
                    <span>Button Selection</span>
                  </div>
                </SelectItem>
                <SelectItem value="color">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <span>Color Swatches</span>
                  </div>
                </SelectItem>
                <SelectItem value="select">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Dropdown</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {form.type === 'button' && 'Best for: Size (S, M, L), Material, Style'}
              {form.type === 'color' && 'Best for: Color options with visual swatches'}
              {form.type === 'select' && 'Best for: Large number of options'}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name.trim() || isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Attribute'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
})

// ============================================
// Main Component
// ============================================

function AttributesSettingsComponent({
  attributes,
  isLoading,
  onRefresh,
}: AttributesSettingsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingAttributeId, setDeletingAttributeId] = useState<number | null>(null)
  const [addingValueToId, setAddingValueToId] = useState<number | null>(null)
  const [deletingValueId, setDeletingValueId] = useState<number | null>(null)

  // Create attribute
  const handleCreateAttribute = async (name: string, type: AttributeDisplayType) => {
    setIsCreating(true)
    try {
      await attributesService.create({ name, type })
      toast.success(`Attribute "${name}" created successfully`)
      onRefresh()
    } catch (error) {
      toast.error('Failed to create attribute')
      console.error('Create attribute error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Delete attribute
  const handleDeleteAttribute = async (id: number) => {
    setDeletingAttributeId(id)
    try {
      await attributesService.delete(id)
      toast.success('Attribute deleted')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete attribute')
      console.error('Delete attribute error:', error)
    } finally {
      setDeletingAttributeId(null)
    }
  }

  // Add value to attribute
  const handleAddValue = async (
    attributeId: number,
    value: string,
    colorCode?: string
  ) => {
    setAddingValueToId(attributeId)
    try {
      await attributesService.addValue(attributeId, { value, color_code: colorCode })
      toast.success(`Value "${value}" added`)
      onRefresh()
    } catch (error) {
      toast.error('Failed to add value')
      console.error('Add value error:', error)
    } finally {
      setAddingValueToId(null)
    }
  }

  // Delete value
  const handleDeleteValue = async (_attributeId: number, valueId: number) => {
    setDeletingValueId(valueId)
    try {
      await attributeValuesService.delete(valueId)
      toast.success('Value deleted')
      onRefresh()
    } catch (error) {
      toast.error('Failed to delete value')
      console.error('Delete value error:', error)
    } finally {
      setDeletingValueId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Product Attributes
              </CardTitle>
              <CardDescription>
                Manage attributes for variable products (e.g., Size, Color, Material)
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Attribute
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Attributes Grid */}
      {attributes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No Attributes Yet</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Create attributes like Size, Color, or Material to add variations to your products.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Attribute
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {attributes.map((attribute) => (
            <AttributeCard
              key={attribute.id}
              attribute={attribute}
              onDelete={handleDeleteAttribute}
              onAddValue={handleAddValue}
              onDeleteValue={handleDeleteValue}
              isDeleting={deletingAttributeId === attribute.id}
              isAddingValue={addingValueToId === attribute.id}
              deletingValueId={deletingValueId}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateAttributeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateAttribute}
        isCreating={isCreating}
      />
    </div>
  )
}

export const AttributesSettings = memo(AttributesSettingsComponent)
AttributesSettings.displayName = 'AttributesSettings'

export default AttributesSettings
