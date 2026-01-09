# Application UI & Code Standards

This document outlines the standard components, patterns, and implementation details to be used across the entire application. Adhering to these standards ensures a consistent user experience and simplifies maintenance.

## 1. General Page Layout
Every main management page (e.g., Products, Customers, Sales) should follow this structure:

1.  **Header**: Title, Subtitle, and Primary Action (Add New).
2.  **Navigation/Filters**: Tabs for sub-sections or Filter inputs.
3.  **Search Bar**: Prominently placed, usually above the table.
4.  **Content Area**: The main data table or grid.

```tsx
export default function StandardPage() {
    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* 1. Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Page Title</h1>
                    <p className="text-muted-foreground">Short description of the page context</p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Item
                </Button>
            </div>

            {/* 2 & 3. Tabs/Search Wrapper */}
            <div className="flex flex-col space-y-4">
                 {/* Tabs or Search components go here */}
            </div>

             {/* 4. Content */}
            <div className="flex-1 overflow-auto">
                 {/* Table or List goes here */}
            </div>
        </div>
    )
}
```

---

## 2. Data Table Standard
Tables are the core of the admin interface. They must handle:
- **Client-side & Server-side Pagination**: Hybrid approach.
- **Selection**: Checkboxes for bulk actions.
- **Actions**: Edit (Icon) and Delete (Icon).

### A. Controls Bar (Top of Table)
Place this immediately above the table.

```tsx
<div className="flex items-center justify-between mb-4">
    {/* Page Size Selector */}
    <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select value={String(perPage)} onValueChange={handlePerPageChange}>
            <SelectTrigger className="w-[70px] h-8">
                <SelectValue placeholder={perPage} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
            </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">entries</span>
    </div>

    {/* Bulk Delete - Only shows when items selected */}
    {selectedIds.length > 0 && (
        <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedIds.length})
        </Button>
    )}
</div>
```

### B. Table Header & Body
Use shadcn/ui `Table` components.

**Key visual standards:**
- **Checkbox** width: `w-[50px]`.
- **Text alignment**: Left for text, Right for Actions/Currency.
- **Images**: `h-8 w-8 rounded object-cover`.
- **Status**: Use `<Switch />` for toggleable status, or `<Badge />` for static status.

```tsx
<div className="rounded-md border">
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-[50px]">
                    <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>Column Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {/* Map data here */}
            <TableRow>
                <TableCell><Checkbox /></TableCell>
                <TableCell className="font-medium">Item Name</TableCell>
                <TableCell>
                    <Switch checked={isActive} onCheckedChange={toggleStatus} />
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={onEdit}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TableCell>
            </TableRow>
        </TableBody>
    </Table>
</div>
```

### C. Footer Pagination
Place this immediately below the table.

```tsx
<div className="flex items-center justify-between py-2">
    <div className="text-sm text-muted-foreground">
        Showing {startEntry} to {endEntry} of {total} entries
    </div>
    <div className="flex items-center gap-2">
        <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
        >
            <ChevronLeft className="h-4 w-4" />
            Previous
        </Button>

        <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                 let pageNum;
                 if (lastPage <= 5) {
                     pageNum = i + 1;
                 } else {
                     // Sliding window logic
                     if (currentPage <= 3) pageNum = i + 1;
                     else if (currentPage >= lastPage - 2) pageNum = lastPage - 4 + i;
                     else pageNum = currentPage - 2 + i;
                 }
                 
                 return (
                    <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                    >
                        {pageNum}
                    </Button>
                 );
            })}
        </div>

        <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
            disabled={currentPage === lastPage}
        >
            Next
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
</div>
```

---

## 3. Data Fetching Pattern (Hybrid Pagination)
To ensure robustness against API inconsistencies (e.g. API returning all items instead of paginated results), use this pattern in your `fetchData` function:

```tsx
const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
        const result = await apiService.getAll({ page: currentPage, per_page: perPage })
        
        // Ensure result is array safe
        let items = []
        if (Array.isArray(result)) items = result
        else if (result?.data && Array.isArray(result.data)) items = result.data
        else if (result?.data?.data && Array.isArray(result.data.data)) items = result.data.data

        setData(items)

        // HYBRID FALLBACK: If API returns more items than requested per page, 
        // it ignored pagination. Switch to client-side logic.
        if (items.length > perPage) {
            setTotal(items.length)
            setLastPage(Math.ceil(items.length / perPage))
        } else {
            // API pagination worked
            if (result.current_page) setCurrentPage(result.current_page)
            if (result.last_page) setLastPage(result.last_page)
            setTotal(result.total || items.length)
        }
    } catch (error) {
        console.error(error)
        toast.error('Failed to load data')
    } finally {
        setIsLoading(false)
    }
}, [currentPage, perPage])
```

---

## 4. Modal / Dialog Standards
Used for Adding or Editing items.

- **Title**: "Add [Item Name]" or "Edit [Item Name]".
- **Footer**: "Cancel" (Ghost) and "Save Changes" (Default).
- **Validation**: Use Zod + React Hook Form (recommended) or simple state with validation.

```tsx
<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>{editData ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Enter name" />
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
    </DialogContent>
</Dialog>
```

---

## 5. Alert Dialog Standards (Delete Confirmations)

For all delete operations, use the custom `DeleteConfirmDialog` and `BulkDeleteConfirmDialog` components instead of native `confirm()` prompts. These provide a beautiful, polished user experience.

### A. Single Item Delete
Use `DeleteConfirmDialog` when deleting one item.

```tsx
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'

// In your component state:
const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: number | null; name: string }>({ 
    open: false, 
    id: null, 
    name: '' 
})

// Handler to open dialog:
const handleDeleteClick = (id: number, name: string) => {
    setDeleteDialog({ open: true, id, name })
}

// Confirm delete handler:
const confirmDelete = async () => {
    if (!deleteDialog.id) return
    try {
        await service.delete(deleteDialog.id)
        toast.success('Item deleted successfully')
        setDeleteDialog({ open: false, id: null, name: '' })
        fetchData() // Refresh list
    } catch (error) {
        toast.error('Failed to delete item')
    }
}

// In button onClick:
<Button 
    variant="ghost" 
    size="icon" 
    className="text-destructive" 
    onClick={() => handleDeleteClick(item.id, item.name)}
>
    <Trash2 className="h-4 w-4" />
</Button>

// Render dialog:
<DeleteConfirmDialog
    isOpen={deleteDialog.open}
    onOpenChange={(open) => !open && setDeleteDialog({ open: false, id: null, name: '' })}
    onConfirm={confirmDelete}
    itemName={deleteDialog.name}
    title="Delete Item"
    description="This action cannot be undone. This will permanently delete the item from the system."
/>
```

**Features:**
- Red gradient background with trash icon
- Displays item name for confirmation
- Loading state with spinner during deletion
- Proper error/success toast feedback

### B. Bulk Delete
Use `BulkDeleteConfirmDialog` when deleting multiple items.

```tsx
import { BulkDeleteConfirmDialog } from '@/components/common/BulkDeleteConfirmDialog'

// In your component state:
const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

// Handler to open dialog:
const handleBulkDeleteClick = () => {
    setBulkDeleteOpen(true)
}

// Confirm bulk delete handler:
const confirmBulkDelete = async () => {
    try {
        await service.deleteMultiple(selectedIds)
        toast.success('Items deleted successfully')
        setSelectedIds([])
        setBulkDeleteOpen(false)
        fetchData() // Refresh list
    } catch (error) {
        toast.error('Failed to delete items')
    }
}

// In bulk delete button onClick:
{selectedIds.length > 0 && (
    <Button
        variant="destructive"
        size="sm"
        onClick={handleBulkDeleteClick}
    >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Selected ({selectedIds.length})
    </Button>
)}

// Render dialog:
<BulkDeleteConfirmDialog
    isOpen={bulkDeleteOpen}
    onOpenChange={setBulkDeleteOpen}
    onConfirm={confirmBulkDelete}
    itemCount={selectedIds.length}
    itemLabel="items"
    title="Delete Multiple Items"
    description="This action cannot be undone. All selected items will be permanently deleted."
/>
```

**Features:**
- Amber gradient background with warning icon
- Shows count of items to be deleted
- Red warning card with danger emphasis
- Prevents accidental bulk deletions

---

## 6. Standard Notifications (Toast)
Use `sonner` for all user feedbacks.

- **Success**: `toast.success('Category created successfully')`
- **Error**: `toast.error('Failed to create category')`
- **Info**: `toast.info('Processing your request')`

---

## 7. Icons
Use `lucide-react` icons. Common mappings:
- Add: `<Plus />`
- Edit: `<Pencil />`
- Delete: `<Trash2 />`
- Search: `<Search />`
- Loading: `<Loader2 className="animate-spin" />`
- Navigation: `<ChevronLeft />`, `<ChevronRight />`
- Warning: `<AlertTriangle />`

---

## 8. Responsive Design
- Ensure tables have `overflow-auto` wrappers.
- On smaller screens, standard tables usually scroll horizontally.
- Use `flex-col` for page layouts to ensure vertical sticking.
