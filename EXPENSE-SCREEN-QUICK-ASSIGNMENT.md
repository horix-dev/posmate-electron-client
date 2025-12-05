# Quick Assignment: Expense Screen

Hi! Please build the complete **Expense Management** screen. Here's what to do:

---

## 🚀 Quick Start

```powershell
# 1. Create branch
git checkout develop && git pull origin develop
git checkout -b feature/expense-management

# 2. Follow the detailed guide
# Open: EXPENSE-SCREEN-ASSIGNMENT.md
```

---

## ✅ What to Build

### Feature 1: List View
- [ ] Table showing all expenses/income
- [ ] Tabs for "Expenses" and "Income"
- [ ] Search by description
- [ ] Filter button (by date, category, status)
- [ ] Edit/Delete actions

### Feature 2: Add/Edit Dialog
- [ ] Form with fields:
  - Type (Expense/Income)
  - Description
  - Category (dropdown)
  - Amount
  - Date
  - Reference (optional)
  - Status

### Feature 3: Statistics
- [ ] Show total expenses this month
- [ ] Show total income this month
- [ ] Show net income
- [ ] Category breakdown

### Feature 4: Offline Support
- [ ] Save offline in IndexedDB
- [ ] Sync when online
- [ ] Show sync status badges

### Feature 5: Delete with Confirmation
- [ ] Confirmation dialog
- [ ] Only allow delete for draft status

---

## 📁 Files to Create

```
src/pages/expenses/
├── ExpensesPage.tsx (update existing)
├── types.ts (new - define types)
├── hooks/
│   └── useExpenses.ts (new - CRUD logic)
└── components/
    ├── ExpensesTable.tsx (new)
    ├── AddExpenseDialog.tsx (new)
    ├── StatsCard.tsx (new)
    └── CategoryBreakdown.tsx (new)
```

And create repository:
```
src/lib/db/expenses.repository.ts (new - database layer)
```

---

## 🔍 Data Model

```typescript
interface ExpenseEntry {
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
```

---

## 📋 Step-by-Step

**Day 1:** Database layer (repository) + types  
**Day 2:** Hook + components (table, dialog, stats)  
**Day 3:** Offline support + filtering + polish  

---

## ✨ Testing Before PR

```powershell
npm run lint              # Code style ✅
npm run typecheck         # Type errors ✅
npm run test              # Tests pass ✅
npm run dev               # Manual test ✅
```

---

## 📝 PR Submission

Fill out the template with:
- Description: "Implement expense management screen"
- Type: New feature
- Changes: List what was added
- Testing: How you tested it
- Checklist: All items marked

---

## 📚 Reference Patterns

Check these files for patterns:
- `src/pages/sales/` - Similar screen structure
- `src/lib/db/index.ts` - Database pattern
- `src/hooks/useSyncData.ts` - Offline sync

---

## ❓ Questions?

Ask before starting:
1. Should expense categories be editable or fixed list?
2. What date range for statistics (month/year/custom)?
3. Any specific styling preferences?

---

## 📊 Estimated Time

- 2-3 days (14-20 hours)
- Day 1: Database + types (4h)
- Day 2: UI Components + hook (6h)
- Day 3: Offline + polish (4-6h)

---

**Full detailed guide:** See `EXPENSE-SCREEN-ASSIGNMENT.md`

Let me know if you need clarification! 🚀
