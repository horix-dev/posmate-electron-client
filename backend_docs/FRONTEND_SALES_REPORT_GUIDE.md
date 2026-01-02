# Frontend Implementation Guide: Sales Report with Due Collections

## Overview
The sales API has been enhanced to include due collection tracking. This affects how payment status is displayed and calculated throughout the application.

---

## 🎯 Key Changes Summary

### API Response Changes

**Before:**
```json
{
  "id": 123,
  "totalAmount": 150.00,
  "paidAmount": 100.00,
  "dueAmount": 50.00,
  "isPaid": 0
}
```

**After:**
```json
{
  "id": 123,
  "totalAmount": 150.00,
  "initial_paidAmount": 100.00,      // ← Renamed (payment at sale time)
  "initial_dueAmount": 50.00,        // ← Renamed (due at sale time)
  "total_paid_amount": 150.00,       // ← NEW (includes due collections)
  "remaining_due_amount": 0.00,      // ← NEW (actual remaining due)
  "is_fully_paid": true,             // ← NEW (accurate payment status)
  "isPaid": 1,                       // ← Updated logic
  "due_collections_count": 2,        // ← NEW (number of payments made)
  "due_collections_total": 50.00     // ← NEW (total from due collections)
}
```

---

## 📋 Required Updates by Component

### 1. Sales List/Table Components

#### What to Change:
Replace all instances where you display payment status or due amounts.

#### Old Code Pattern (React/Vue example):
```javascript
// ❌ OLD - Incorrect
<Badge color={sale.isPaid ? "success" : "warning"}>
  {sale.isPaid ? "Paid" : "Unpaid"}
</Badge>
<span>Due: ${sale.dueAmount}</span>
```

#### New Code Pattern:
```javascript
// ✅ NEW - Correct
<Badge color={sale.is_fully_paid ? "success" : sale.total_paid_amount > 0 ? "warning" : "danger"}>
  {sale.is_fully_paid ? "Fully Paid" : sale.total_paid_amount > 0 ? "Partially Paid" : "Unpaid"}
</Badge>
<span>Remaining: ${sale.remaining_due_amount}</span>

{/* Show payment breakdown if not fully paid */}
{!sale.is_fully_paid && (
  <Tooltip>
    <div>Initial: ${sale.initial_paidAmount}</div>
    <div>Collected: ${sale.due_collections_total}</div>
    <div>Remaining: ${sale.remaining_due_amount}</div>
  </Tooltip>
)}
```

---

### 2. Sales Detail/View Page

#### What to Change:
Update the payment information section to show full payment history.

#### Old Display:
```
Total Amount: $150.00
Paid Amount: $100.00
Due Amount: $50.00
Status: Unpaid
```

#### New Display:
```
Total Amount: $150.00
Initial Payment: $100.00
Due Collections: $50.00 (2 payments)
Total Paid: $150.00
Remaining Due: $0.00
Status: Fully Paid ✓
```

#### Example Code:
```jsx
// ✅ NEW Payment Information Display
<Card title="Payment Information">
  <Row>
    <Col><strong>Total Amount:</strong></Col>
    <Col>${sale.totalAmount.toFixed(2)}</Col>
  </Row>
  
  <Row>
    <Col><strong>Initial Payment:</strong></Col>
    <Col>${sale.initial_paidAmount.toFixed(2)}</Col>
  </Row>
  
  {sale.due_collections_total > 0 && (
    <Row>
      <Col><strong>Due Collections:</strong></Col>
      <Col>
        ${sale.due_collections_total.toFixed(2)}
        <Badge>{sale.due_collections_count} payment(s)</Badge>
      </Col>
    </Row>
  )}
  
  <Divider />
  
  <Row>
    <Col><strong>Total Paid:</strong></Col>
    <Col className="text-success">
      ${sale.total_paid_amount.toFixed(2)}
    </Col>
  </Row>
  
  <Row>
    <Col><strong>Remaining Due:</strong></Col>
    <Col className={sale.remaining_due_amount > 0 ? "text-danger" : "text-muted"}>
      ${sale.remaining_due_amount.toFixed(2)}
    </Col>
  </Row>
  
  <Row>
    <Col><strong>Status:</strong></Col>
    <Col>
      <StatusBadge sale={sale} />
    </Col>
  </Row>
</Card>
```

---

### 3. Dashboard/Summary Cards

#### What to Change:
Update dashboard statistics to use accurate calculations.

#### Old Code:
```javascript
// ❌ OLD - Incorrect totals
const totalDue = sales.reduce((sum, sale) => sum + sale.dueAmount, 0);
const paidSales = sales.filter(sale => sale.isPaid);
```

#### New Code:
```javascript
// ✅ NEW - Correct totals
const totalDue = sales.reduce((sum, sale) => sum + sale.remaining_due_amount, 0);
const fullyPaidSales = sales.filter(sale => sale.is_fully_paid);
const partiallyPaidSales = sales.filter(sale => !sale.is_fully_paid && sale.total_paid_amount > 0);
const unpaidSales = sales.filter(sale => sale.total_paid_amount === 0);
```

---

### 4. Sales Report Endpoint

#### New Endpoint Available:
```
GET /api/v1/sales/report
```

#### Query Parameters:
```typescript
interface SalesReportParams {
  search?: string;           // Search by invoice number or party name
  party_id?: number;         // Filter by customer
  payment_type_id?: number;  // Filter by payment method
  date_from?: string;        // Start date (YYYY-MM-DD)
  date_to?: string;          // End date (YYYY-MM-DD)
  isPaid?: boolean;          // Filter by payment status
  page?: number;             // Page number
  per_page?: number;         // Items per page
}
```

#### Response Structure:
```typescript
interface SalesReportResponse {
  success: boolean;
  message: string;
  data: {
    sales: Sale[];           // Array of sales with new fields
    summary: {
      total_sales_count: number;
      total_amount: number;
      initial_paid: number;          // ← NEW
      due_collections: number;       // ← NEW
      total_paid: number;            // ← NEW (initial + collections)
      remaining_due: number;         // ← NEW
      counts: {
        fully_paid: number;          // ← NEW
        partially_paid: number;      // ← NEW
        unpaid: number;              // ← NEW
      };
    };
  };
  _server_timestamp: string;
}
```

#### Usage Example:
```javascript
// Fetch sales report with summary
const response = await fetch('/api/v1/sales/report?date_from=2025-12-01&date_to=2025-12-31', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { data } = await response.json();

// Display summary
console.log('Total Sales:', data.summary.total_sales_count);
console.log('Total Revenue:', data.summary.total_amount);
console.log('Collected:', data.summary.total_paid);
console.log('Outstanding:', data.summary.remaining_due);
console.log('Fully Paid Sales:', data.summary.counts.fully_paid);
console.log('Partially Paid:', data.summary.counts.partially_paid);
console.log('Unpaid:', data.summary.counts.unpaid);
```

---

### 5. TypeScript/Interface Updates

#### Update Your Types:
```typescript
// ✅ NEW Sale Interface
interface Sale {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  totalAmount: number;
  
  // Old fields (kept for backward compatibility)
  paidAmount: number;           // ⚠️ Deprecated, use initial_paidAmount
  dueAmount: number;            // ⚠️ Deprecated, use initial_dueAmount
  isPaid: boolean;              // ⚠️ Now calculated, use is_fully_paid
  
  // New fields
  initial_paidAmount: number;   // Payment at sale time
  initial_dueAmount: number;    // Due at sale time
  total_paid_amount: number;    // Initial + due collections
  remaining_due_amount: number; // Actual remaining due
  is_fully_paid: boolean;       // Accurate payment status
  due_collections_count: number;  // Number of collection payments
  due_collections_total: number;  // Total from collections
  
  // Relationships
  party?: Party;
  payment_type?: PaymentType;
  user?: User;
  details?: SaleDetail[];
}

// Summary stats
interface SalesSummary {
  total_sales_count: number;
  total_amount: number;
  initial_paid: number;
  due_collections: number;
  total_paid: number;
  remaining_due: number;
  counts: {
    fully_paid: number;
    partially_paid: number;
    unpaid: number;
  };
}
```

---

### 6. Filter/Search Components

#### Update Payment Status Filters:
```jsx
// ✅ NEW - More accurate filtering options
<Select name="paymentStatus" label="Payment Status">
  <option value="">All Sales</option>
  <option value="fully_paid">Fully Paid</option>
  <option value="partially_paid">Partially Paid</option>
  <option value="unpaid">Unpaid</option>
</Select>
```

#### Filter Logic:
```javascript
// ✅ NEW - Filter implementation
const filterSales = (sales, paymentStatus) => {
  switch (paymentStatus) {
    case 'fully_paid':
      return sales.filter(sale => sale.is_fully_paid);
    case 'partially_paid':
      return sales.filter(sale => !sale.is_fully_paid && sale.total_paid_amount > 0);
    case 'unpaid':
      return sales.filter(sale => sale.total_paid_amount === 0);
    default:
      return sales;
  }
};
```

---

### 7. Export/Print Reports

#### Update Export Data:
```javascript
// ✅ NEW - Export with accurate data
const exportData = sales.map(sale => ({
  'Invoice #': sale.invoiceNumber,
  'Date': sale.saleDate,
  'Customer': sale.party?.name,
  'Total': sale.totalAmount,
  'Initial Payment': sale.initial_paidAmount,
  'Due Collections': sale.due_collections_total,
  'Total Paid': sale.total_paid_amount,
  'Remaining Due': sale.remaining_due_amount,
  'Status': sale.is_fully_paid ? 'Fully Paid' : 
            sale.total_paid_amount > 0 ? 'Partially Paid' : 'Unpaid'
}));
```

---

## 🔧 Helper Functions/Utilities

Create these reusable utilities:

```javascript
// utils/saleHelpers.js

/**
 * Get payment status badge props
 */
export const getPaymentStatusBadge = (sale) => {
  if (sale.is_fully_paid) {
    return { color: 'success', text: 'Fully Paid' };
  }
  if (sale.total_paid_amount > 0) {
    return { color: 'warning', text: 'Partially Paid' };
  }
  return { color: 'danger', text: 'Unpaid' };
};

/**
 * Calculate payment percentage
 */
export const getPaymentPercentage = (sale) => {
  if (sale.totalAmount === 0) return 0;
  return (sale.total_paid_amount / sale.totalAmount) * 100;
};

/**
 * Format payment breakdown
 */
export const formatPaymentBreakdown = (sale) => {
  return {
    total: sale.totalAmount,
    initialPayment: sale.initial_paidAmount,
    collections: sale.due_collections_total,
    collectionsCount: sale.due_collections_count,
    totalPaid: sale.total_paid_amount,
    remaining: sale.remaining_due_amount,
    percentage: getPaymentPercentage(sale)
  };
};

/**
 * Get sales statistics
 */
export const calculateSalesStats = (sales) => {
  return {
    total: sales.length,
    fullyPaid: sales.filter(s => s.is_fully_paid).length,
    partiallyPaid: sales.filter(s => !s.is_fully_paid && s.total_paid_amount > 0).length,
    unpaid: sales.filter(s => s.total_paid_amount === 0).length,
    totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
    totalCollected: sales.reduce((sum, s) => sum + s.total_paid_amount, 0),
    totalOutstanding: sales.reduce((sum, s) => sum + s.remaining_due_amount, 0)
  };
};
```

---

## 🧪 Testing Checklist

### Test These Scenarios:

- [ ] **Fully Paid Sale**
  - Initial payment = Total amount
  - `is_fully_paid` = true
  - `remaining_due_amount` = 0
  - Shows "Fully Paid" badge

- [ ] **Partial Payment Sale (No Collections Yet)**
  - Initial payment < Total amount
  - `is_fully_paid` = false
  - `due_collections_total` = 0
  - `remaining_due_amount` = initial due
  - Shows "Partially Paid" or "Unpaid" badge

- [ ] **Partial Payment Sale (With Collections)**
  - `total_paid_amount` = initial + collections
  - `remaining_due_amount` < initial due
  - Shows collection count badge
  - Payment history displays correctly

- [ ] **Fully Paid Through Collections**
  - Initial payment < Total
  - Collections = remaining amount
  - `is_fully_paid` = true
  - `remaining_due_amount` = 0

- [ ] **Dashboard Statistics**
  - Totals match backend summary
  - Payment status counts accurate
  - Charts reflect correct data

- [ ] **Filters Work**
  - "Fully Paid" filter shows only `is_fully_paid` = true
  - "Partially Paid" filter correct
  - "Unpaid" filter correct

- [ ] **Export/Print**
  - Exported data uses new fields
  - Print layout shows payment breakdown
  - Totals are accurate

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T:
```javascript
// Using old fields
if (sale.isPaid) { ... }
const due = sale.dueAmount;

// Comparing with old logic
sale.paidAmount === sale.totalAmount  // Incorrect!
```

### ✅ DO:
```javascript
// Using new fields
if (sale.is_fully_paid) { ... }
const due = sale.remaining_due_amount;

// Comparing with new logic
sale.total_paid_amount === sale.totalAmount  // Correct!
```

---

## 📞 Support

### Questions?
1. Check the updated API documentation: `/docs/API_DOCUMENTATION.md` (Section 11)
2. Test with API: `GET /api/v1/sales/report`
3. Contact backend team if response doesn't match this spec

### Example API Calls:
```bash
# Get sales report
curl -X GET "http://localhost:8700/api/v1/sales/report?date_from=2025-12-01&date_to=2025-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get single sale (should include new fields)
curl -X GET "http://localhost:8700/api/v1/sales/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Priority Tasks

### High Priority (Do First):
1. ✅ Update TypeScript interfaces
2. ✅ Update sales list/table components
3. ✅ Update dashboard statistics
4. ✅ Update filters

### Medium Priority:
5. ✅ Update sales detail pages
6. ✅ Update export functionality
7. ✅ Add helper utilities

### Low Priority:
8. ✅ Update print layouts
9. ✅ Add tooltips/help text
10. ✅ Update user documentation

---

## 📝 Migration Notes

### Backward Compatibility:
- Old fields (`paidAmount`, `dueAmount`, `isPaid`) are **still present**
- They work as before, but new fields are more accurate
- You can migrate gradually (component by component)

### Recommended Approach:
1. Update one component at a time
2. Test thoroughly before moving to next
3. Keep old code commented until new code is verified
4. Update tests alongside components

---

## Example Implementation (React)

```jsx
// components/SaleRow.jsx
const SaleRow = ({ sale }) => {
  const paymentStatus = getPaymentStatusBadge(sale);
  const breakdown = formatPaymentBreakdown(sale);
  
  return (
    <tr>
      <td>{sale.invoiceNumber}</td>
      <td>{sale.party?.name}</td>
      <td>${sale.totalAmount.toFixed(2)}</td>
      
      {/* Payment Status with Breakdown Tooltip */}
      <td>
        <Tooltip content={
          <div>
            <div>Initial: ${breakdown.initialPayment.toFixed(2)}</div>
            {breakdown.collections > 0 && (
              <div>Collections: ${breakdown.collections.toFixed(2)} ({breakdown.collectionsCount})</div>
            )}
            <div>Total Paid: ${breakdown.totalPaid.toFixed(2)}</div>
            <div>Remaining: ${breakdown.remaining.toFixed(2)}</div>
          </div>
        }>
          <Badge color={paymentStatus.color}>
            {paymentStatus.text}
          </Badge>
        </Tooltip>
      </td>
      
      {/* Remaining Due */}
      <td className={sale.remaining_due_amount > 0 ? 'text-danger' : 'text-muted'}>
        ${sale.remaining_due_amount.toFixed(2)}
      </td>
      
      {/* Payment Progress Bar */}
      <td>
        <ProgressBar 
          value={breakdown.percentage} 
          max={100}
          color={breakdown.percentage === 100 ? 'success' : 'warning'}
        />
        <small>{breakdown.percentage.toFixed(0)}%</small>
      </td>
      
      <td>
        <Button onClick={() => viewDetails(sale.id)}>View</Button>
      </td>
    </tr>
  );
};
```

---

## 🔄 Before You Start

1. **Pull Latest API Docs**: Ensure you have the updated `API_DOCUMENTATION.md`
2. **Test API**: Hit `/api/v1/sales/report` to see actual response
3. **Update Types First**: Start with TypeScript interfaces
4. **Communicate**: Let backend know when you start testing

---

**Last Updated:** December 31, 2025  
**Backend Version:** Sales Report with Due Collections v2.0  
**Contact:** Backend Team
