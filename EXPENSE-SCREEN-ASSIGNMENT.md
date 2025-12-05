# Expense Screen Development Assignment

**Assigned to:** [Team Member Name]  
**Task:** Complete the Expense Management Screen  
**Priority:** Medium  
**Estimated Time:** 2-3 days

---

## Overview

Build a complete **Expense Management** screen for tracking business expenses and income. This screen should include CRUD operations (Create, Read, Update, Delete), offline support, and real-time sync.

---

## Requirements

### 1. Data Model

**Expense/Income Object:**
```typescript
interface ExpenseEntry {
  id: number              // Auto-increment
  type: 'expense' | 'income'
  description: string     // e.g., "Office Supplies", "Product Sales"
  amount: number         // Amount in local currency
  category: string       // e.g., "Supplies", "Utilities", "Revenue"
  date: string          // ISO date: "2025-12-05"
  reference?: string    // Optional: Invoice/Receipt number
  status: 'draft' | 'confirmed' | 'cancelled'
  createdAt: string     // Timestamp
  updatedAt: string     // Timestamp
  syncStatus: 'pending' | 'synced' | 'failed'  // For offline
}
```

---

## Features to Implement

### Feature 1: List View (Expenses & Income Tabs)

**Display:**
- [ ] Table with columns:
  - Description
  - Category
  - Amount (formatted with currency)
  - Date
  - Status badge
  - Actions (Edit, Delete)

- [ ] Search box - filter by description/category
- [ ] Filter button - filter by date range, category, status
- [ ] Sort by amount or date

**Example UI:**
```
┌─────────────────────────────────────────────────────┐
│ Description    | Category  | Amount  | Date       │
├─────────────────────────────────────────────────────┤
│ Office Rent    | Utilities | 5000    | 2025-12-01 │
│ Paper Supplies | Supplies  | 250     | 2025-12-02 │
│ Product Sales  | Revenue   | 15000   | 2025-12-05 │
│ (Edit) (Delete)                                     │
└─────────────────────────────────────────────────────┘
```

### Feature 2: Add/Edit Dialog

**Form Fields:**
```
[ Type ]           Expense / Income (radio buttons)
[ Description ]    Text input (required)
[ Category ]       Dropdown (Supplies, Utilities, Revenue, etc.)
[ Amount ]         Number input (required)
[ Date ]           Date picker (default today)
[ Reference ]      Text input (optional - receipt number)
[ Status ]         Dropdown (Draft, Confirmed)

[Cancel] [Save]
```

### Feature 3: Statistics Dashboard

**Show Summary:**
- Total Expenses (this month)
- Total Income (this month)
- Net Income (Income - Expenses)
- Breakdown by category (pie chart or progress bars)

**Example:**
```
┌─────────────────────────────────────────────────────┐
│ Total Expenses:  5,250                              │
│ Total Income:   15,000                              │
│ Net Income:      9,750                              │
└─────────────────────────────────────────────────────┘

Category Breakdown:
├─ Supplies: 250 (4.8%)
├─ Utilities: 5,000 (95.2%)
└─ Revenue: 15,000 (100%)
```

### Feature 4: Offline Support

- [ ] Save entries locally using IndexedDB when offline
- [ ] Mark entries with sync status badge
- [ ] Sync with server when back online
- [ ] Show "Pending Sync" indicator for offline entries

### Feature 5: Delete with Confirmation

- [ ] Click delete → Show confirmation dialog
- [ ] Only allow delete for "draft" status
- [ ] Show warning for "confirmed" entries
- [ ] Log deletion in DEVELOPMENT_LOG.md

---

## Technical Implementation

### Step 1: Create SQLite Repository

**File:** `src/lib/db/expenses.repository.ts`

```typescript
export interface ExpenseEntry {
  id?: number
  type: 'expense' | 'income'
  description: string
  amount: number
  category: string
  date: string
  reference?: string
  status: 'draft' | 'confirmed' | 'cancelled'
  createdAt?: string
  updatedAt?: string
  syncStatus?: 'pending' | 'synced' | 'failed'
}

export async function getAllExpenses(): Promise<ExpenseEntry[]>
export async function getExpenseById(id: number): Promise<ExpenseEntry | null>
export async function createExpense(entry: ExpenseEntry): Promise<ExpenseEntry>
export async function updateExpense(id: number, entry: Partial<ExpenseEntry>): Promise<ExpenseEntry>
export async function deleteExpense(id: number): Promise<boolean>
export async function getExpensesByMonth(year: number, month: number): Promise<ExpenseEntry[]>
export async function getExpensesByCategory(category: string): Promise<ExpenseEntry[]>
export async function getExpensesOfflineQueue(): Promise<ExpenseEntry[]>  // For sync
```

### Step 2: Create Custom Hook

**File:** `src/pages/expenses/hooks/useExpenses.ts`

```typescript
export function useExpenses() {
  const [entries, setEntries] = useState<ExpenseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all expenses
  const fetchExpenses = async () => {}

  // Create new expense
  const addExpense = async (entry: ExpenseEntry) => {}

  // Update existing expense
  const editExpense = async (id: number, updates: Partial<ExpenseEntry>) => {}

  // Delete expense
  const removeExpense = async (id: number) => {}

  // Get statistics
  const getStats = () => {}

  return {
    entries,
    loading,
    error,
    fetchExpenses,
    addExpense,
    editExpense,
    removeExpense,
    getStats,
  }
}
```

### Step 3: Create Components

**File Structure:**
```
src/pages/expenses/
├── ExpensesPage.tsx           (Main page)
├── hooks/
│   └── useExpenses.ts
├── components/
│   ├── ExpensesTable.tsx       (List view)
│   ├── AddExpenseDialog.tsx    (Form modal)
│   ├── ExpenseFilters.tsx      (Search & filter)
│   ├── StatsCard.tsx           (Summary cards)
│   └── CategoryBreakdown.tsx   (Pie chart)
└── types.ts                    (TypeScript types)
```

### Step 4: Implement Database Sync

- Use sync queue from existing pattern
- When offline: save to `syncQueue` table
- When online: batch sync to server
- Update sync status after confirmation

---

## Step-by-Step Development Guide

### Day 1: Setup & Database

```powershell
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/expense-management

# 2. Create repository layer
# File: src/lib/db/expenses.repository.ts
# - Implement all CRUD operations
# - Use IndexedDB or SQLite pattern

# 3. Create types file
# File: src/pages/expenses/types.ts
# - Define ExpenseEntry interface
# - Define component props types
```

**Test:**
```powershell
npm run test  # All database tests pass
npm run typecheck  # No type errors
```

### Day 2: Components & UI

```powershell
# 1. Create hook
# File: src/pages/expenses/hooks/useExpenses.ts
# - Fetch expenses on mount
# - Handle CRUD operations
# - Calculate statistics

# 2. Create components
# File: src/pages/expenses/components/ExpensesTable.tsx
# File: src/pages/expenses/components/AddExpenseDialog.tsx
# File: src/pages/expenses/components/StatsCard.tsx

# 3. Update main page
# File: src/pages/expenses/ExpensesPage.tsx
# - Integrate components
# - Show tabs: Expenses/Income
# - Show statistics
```

**Test:**
```powershell
npm run dev  # Manual testing
npm run test  # Unit tests
```

### Day 3: Features & Polish

```powershell
# 1. Add offline support
# - Mark offline entries
# - Queue for sync
# - Show sync status

# 2. Add filtering
# - Search by description
# - Filter by date range
# - Filter by category
# - Filter by status

# 3. Add delete with confirmation
# - Confirmation modal
# - Status validation
# - Success/error toasts

# 4. Final testing
npm run lint      # Code style
npm run typecheck # No type errors
npm run test      # All tests pass
```

---

## Testing Checklist

Before submitting PR, verify:

```typescript
// ✅ Create functionality
const expense = await addExpense({
  type: 'expense',
  description: 'Office Supplies',
  amount: 250,
  category: 'Supplies',
  date: '2025-12-05'
})
assert(expense.id !== undefined)

// ✅ Read functionality
const entries = await getAllExpenses()
assert(entries.length > 0)

// ✅ Update functionality
const updated = await editExpense(expense.id, { amount: 300 })
assert(updated.amount === 300)

// ✅ Delete functionality
await removeExpense(expense.id)
const deleted = await getExpenseById(expense.id)
assert(deleted === null)

// ✅ Offline mode
// Turn off internet, add expense
// Verify it has syncStatus: 'pending'
// Go back online, verify it syncs

// ✅ Statistics
const stats = getStats()
assert(stats.totalExpenses > 0)
assert(stats.totalIncome > 0)
assert(stats.netIncome === stats.totalIncome - stats.totalExpenses)
```

---

## Code Style Requirements

Follow project patterns:

```typescript
// ✅ Use custom hooks for state
export function useExpenses() { }

// ✅ Separate concerns: hooks, components, repositories
// hooks/ - Business logic
// components/ - UI components
// types.ts - TypeScript interfaces

// ✅ Use existing patterns
// - shadcn/ui components
// - Zustand stores
// - IndexedDB for offline
// - Sonner for toasts

// ✅ Error handling
try {
  await addExpense(entry)
  toast.success('Expense added')
} catch (err) {
  toast.error(err.message)
}

// ✅ TypeScript strict mode
// No `any` types
// All function parameters typed
// All return types explicit
```

---

## Commit Messages

Use Conventional Commits format:

```powershell
git commit -m "feat: implement expense management screen

- Create ExpensesTable component with search & filter
- Add AddExpenseDialog for creating/editing expenses
- Implement useExpenses hook with CRUD operations
- Add statistics dashboard with category breakdown
- Support offline sync for expense entries
- Add delete confirmation with validation"
```

---

## Resources & References

Check these files for patterns:

```
✅ Similar screens:
   src/pages/sales/ - Similar list/create pattern
   src/pages/products/ - Database repository pattern

✅ Hooks to understand:
   src/hooks/useSyncData.ts - Offline sync pattern
   src/hooks/useOnlineStatus.ts - Detect online/offline

✅ Components to use:
   src/components/ui/ - All UI components (Button, Dialog, etc.)
   src/components/common/ - Common components

✅ Database pattern:
   src/lib/db/index.ts - IndexedDB setup
```

---

## Submission Checklist

Before creating PR:

- [ ] Feature branch created: `feature/expense-management`
- [ ] All CRUD operations working
- [ ] TypeScript types defined
- [ ] Components created and tested
- [ ] Offline support implemented
- [ ] Statistics showing correctly
- [ ] Delete confirmation working
- [ ] Unit tests written (>80% coverage)
- [ ] Code follows style guide
- [ ] No console errors or warnings
- [ ] ESLint passes: `npm run lint`
- [ ] TypeScript passes: `npm run typecheck`
- [ ] Tests pass: `npm run test`
- [ ] DEVELOPMENT_LOG.md updated

---

## PR Template Reminder

When submitting PR, fill out:

```
## Description
Implement complete expense management screen with CRUD operations

## Related Issue
Closes #XX (if there's an issue number)

## Type of Change
- [x] New feature

## Changes Made
- Created ExpenseEntry database repository
- Implemented useExpenses hook with CRUD operations
- Created ExpensesTable, AddExpenseDialog, StatsCard components
- Added offline sync support
- Added filtering and search

## Testing
- Manual testing on Windows 10
- Tested all CRUD operations
- Tested offline mode + sync
- All unit tests pass

## Checklist
- [x] Code follows style guide
- [x] Tests pass locally
- [x] TypeScript strict mode passes
- [x] DEVELOPMENT_LOG.md updated
- [x] Tested offline functionality
```

---

## Questions?

Ask these before starting:
- Any specific styling preferences?
- Should expense categories be editable?
- Required fields for expense entry?
- Date range for statistics (today, this month, this year)?

---

## Timeline

**Day 1 (4 hours):**
- Repository layer complete
- Tests passing

**Day 2 (6 hours):**
- Components built
- Hook implemented
- Manual testing

**Day 3 (4 hours):**
- Offline support
- Filtering/search
- Polish & refinement
- PR submission

**Total: ~14 hours = 2-3 days** ✅

---

Good luck! Let me know if you have questions 🚀
