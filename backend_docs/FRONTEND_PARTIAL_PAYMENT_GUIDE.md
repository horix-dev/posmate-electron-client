# Frontend Developer Guide - Partial Payment Implementation

**Last Updated:** December 28, 2025  
**Target Audience:** Frontend/Mobile Developers  
**Status:** ✅ Production Ready

---

## Overview

This guide explains how to implement partial payment functionality in your frontend application (Web, Mobile, POS). The backend fully supports partial payments with automatic balance tracking, validation, and audit trails.

---

## Table of Contents

1. [Understanding Partial Payments](#understanding-partial-payments)
2. [Sale with Partial Payment](#sale-with-partial-payment)
3. [Collecting Due Payments](#collecting-due-payments)
4. [Viewing Payment History](#viewing-payment-history)
5. [UI/UX Recommendations](#uiux-recommendations)
6. [Error Handling](#error-handling)
7. [Complete Code Examples](#complete-code-examples)

---

## Understanding Partial Payments

### Key Concepts

| Term | Description | Example |
|------|-------------|---------|
| **totalAmount** | Full invoice amount | $1000 |
| **paidAmount** | Amount paid by customer | $600 |
| **dueAmount** | Remaining balance | $400 |
| **isPaid** | Payment status | `false` (if dueAmount > 0) |
| **party.due** | Customer's total outstanding balance | $1200 (across all invoices) |

### Data Flow

```
Sale Created
├─ totalAmount: 1000
├─ paidAmount: 600
├─ dueAmount: 400
├─ isPaid: false
└─ party.due: +400 (incremented)

Due Collection #1 (Day 7)
├─ payDueAmount: 200
├─ invoice.dueAmount: 400 → 200
├─ party.due: 400 → 200
└─ balance: +200

Due Collection #2 (Day 14)
├─ payDueAmount: 200
├─ invoice.dueAmount: 200 → 0
├─ party.due: 200 → 0
├─ isPaid: true ✅
└─ balance: +200
```

---

## Sale with Partial Payment

### Endpoint
```
POST /api/v1/sales
```

### Request Example

```javascript
// JavaScript/TypeScript
const createPartialPaymentSale = async () => {
  const saleData = {
    party_id: 5,                    // Required for partial payment
    payment_type_id: 1,             // Cash/Card/etc
    totalAmount: 1000,
    paidAmount: 600,                // Partial payment
    dueAmount: 400,                 // Remaining balance
    isPaid: false,                  // Not fully paid
    discountAmount: 0,
    vat_amount: 100,
    vat_percent: 10,
    saleDate: "2025-12-28",
    products: [
      {
        stock_id: 10,
        quantities: 2,
        price: 500,
        lossProfit: 200
      }
    ]
  };

  const response = await fetch('/api/v1/sales', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(saleData)
  });

  const result = await response.json();
  return result;
};
```

### Response

```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 1234,
    "invoiceNumber": "S-001234",
    "totalAmount": 1000,
    "paidAmount": 600,
    "dueAmount": 400,
    "isPaid": false,
    "party": {
      "id": 5,
      "name": "John Doe",
      "due": 1200
    }
  },
  "_server_timestamp": "2025-12-28T10:00:00Z"
}
```

### Important Validations

❌ **Walk-in customers (party_id = null) CANNOT have due amount**
```javascript
// This will fail with 400 error
{
  party_id: null,
  dueAmount: 400  // ❌ Not allowed
}
```

❌ **Credit limit exceeded**
```javascript
// If customer's credit limit is 2000 and current due is 1700
{
  party_id: 5,
  dueAmount: 400  // ❌ Exceeds credit limit (1700 + 400 = 2100 > 2000)
}
```

✅ **Valid partial payment**
```javascript
{
  party_id: 5,      // ✅ Customer selected
  dueAmount: 400    // ✅ Within credit limit
}
```

---

## Collecting Due Payments

### Step 1: Get Customer's Unpaid Invoices

**Endpoint:** `GET /api/v1/dues/invoices?party_id={id}`

```javascript
const getUnpaidInvoices = async (partyId) => {
  const response = await fetch(
    `/api/v1/dues/invoices?party_id=${partyId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Response:
{
  "message": "Data fetched successfully.",
  "data": {
    "party": {
      "id": 5,
      "name": "John Doe",
      "type": "Customer",
      "total_due": 1200
    },
    "invoices": [
      {
        "id": 1234,
        "invoiceNumber": "S-001234",
        "totalAmount": 1000,
        "dueAmount": 400,
        "date": "2025-12-20"
      },
      {
        "id": 1235,
        "invoiceNumber": "S-001235",
        "totalAmount": 1500,
        "dueAmount": 800,
        "date": "2025-12-22"
      }
    ],
    "party_opening_due": 0
  }
}
```

### Step 2: Record Due Collection

**Endpoint:** `POST /api/v1/dues`

```javascript
const collectDuePayment = async (paymentData) => {
  const data = {
    party_id: 5,
    payment_type_id: 1,           // Cash, Card, etc.
    paymentDate: "2025-12-28",
    payDueAmount: 200,            // Amount being paid
    invoiceNumber: "S-001234"     // Optional but recommended
  };

  const response = await fetch('/api/v1/dues', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  return await response.json();
};

// Response:
{
  "message": "Due collected successfully.",
  "data": {
    "id": 567,
    "payDueAmount": 200,
    "totalDue": 400,              // Invoice due before payment
    "dueAmountAfterPay": 200,     // Invoice due after payment
    "party": {
      "id": 5,
      "name": "John Doe",
      "due": 1000                 // Total party due (was 1200)
    }
  }
}
```

### Payment Without Selecting Invoice

```javascript
// If you don't specify invoiceNumber, payment is applied to party's total due
const data = {
  party_id: 5,
  payment_type_id: 1,
  paymentDate: "2025-12-28",
  payDueAmount: 200,
  // invoiceNumber: null  // Not specified
};

// Backend validates: payDueAmount <= party.total_due
```

---

## Viewing Payment History

### List All Due Collections

**Endpoint:** `GET /api/v1/dues`

```javascript
// With filters
const getDueCollections = async (filters = {}) => {
  const params = new URLSearchParams({
    party_id: filters.partyId || '',
    date_from: filters.dateFrom || '',
    date_to: filters.dateTo || '',
    page: filters.page || 1,
    per_page: filters.perPage || 20
  });

  const response = await fetch(
    `/api/v1/dues?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};

// Response:
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 567,
      "payDueAmount": 200,
      "paymentDate": "2025-12-28",
      "invoiceNumber": "S-001234",
      "party": {
        "id": 5,
        "name": "John Doe"
      },
      "payment_type": {
        "id": 1,
        "name": "Cash"
      },
      "user": {
        "id": 1,
        "name": "Cashier 1"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "per_page": 20,
    "current_page": 1,
    "last_page": 3
  }
}
```

### List Unpaid Sales

```javascript
// Get all unpaid sales for customer
const getUnpaidSales = async (partyId) => {
  const response = await fetch(
    `/api/v1/sales?isPaid=false&party_id=${partyId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
};
```

---

## UI/UX Recommendations

### 1. Sale Screen (POS/Invoice)

#### Payment Section UI

```
┌─────────────────────────────────────────┐
│ Customer: John Doe  (Due: $1,200)      │
├─────────────────────────────────────────┤
│ Subtotal:              $900.00          │
│ Discount:              -$0.00           │
│ VAT (10%):             $90.00           │
├─────────────────────────────────────────┤
│ Total Amount:          $1,000.00        │
│                                         │
│ Payment Method: [Cash ▼]                │
│ Amount Received: [$600.00        ]      │
│                                         │
│ ⚠️  Remaining Due: $400.00              │
│                                         │
│ [ ] Mark as Paid   [💾 Save Sale]      │
└─────────────────────────────────────────┘
```

#### Validation Messages

✅ **Success:**
```
Sale saved successfully!
Invoice: S-001234
Paid: $600 | Due: $400
```

⚠️ **Warning (if due > 0):**
```
Customer will be notified of $400 remaining balance.
```

❌ **Error (walk-in + due):**
```
Walk-in customers cannot have due amount.
Please select a registered customer or collect full payment.
```

❌ **Error (credit limit):**
```
Customer John Doe credit limit exceeded!
Current Due: $1,700
New Due: $400
Total: $2,100 (Limit: $2,000)
```

### 2. Due Collection Screen

#### Customer Selection

```
┌─────────────────────────────────────────┐
│ Select Customer                          │
│ [Search: John Doe...            ] 🔍    │
│                                         │
│ → John Doe                              │
│   Total Due: $1,200                     │
│   Phone: +1234567890                    │
│   Credit Limit: $2,000                  │
└─────────────────────────────────────────┘
```

#### Payment Form

```
┌─────────────────────────────────────────┐
│ Collect Payment - John Doe              │
│ Total Outstanding: $1,200               │
├─────────────────────────────────────────┤
│                                         │
│ Invoice (Optional)                      │
│ [Select Invoice...            ▼]        │
│                                         │
│ Selected: S-001234                      │
│ Invoice Due: $400.00                    │
│                                         │
│ Payment Amount:                         │
│ [$200.00              ]                 │
│                                         │
│ Quick: [Full $400] [Half $200]          │
│                                         │
│ Payment Method: [Cash ▼]                │
│ Payment Date: [2025-12-28  📅]          │
│                                         │
│ New Balance:                            │
│ • Invoice Due: $400 → $200              │
│ • Customer Due: $1,200 → $1,000         │
│                                         │
│ [Cancel]           [💾 Record Payment]  │
└─────────────────────────────────────────┘
```

### 3. Customer Details Screen

#### Due Summary Card

```
┌─────────────────────────────────────────┐
│ 💰 Payment Status                       │
├─────────────────────────────────────────┤
│ Total Outstanding:        $1,200.00     │
│ Credit Limit:             $2,000.00     │
│ Available Credit:         $800.00       │
│                                         │
│ Unpaid Invoices: 2                      │
│ • S-001234: $400 (8 days overdue)       │
│ • S-001235: $800 (6 days overdue)       │
│                                         │
│ [💸 Collect Payment]                    │
└─────────────────────────────────────────┘
```

#### Payment History

```
┌─────────────────────────────────────────┐
│ Payment History                          │
├─────────────────────────────────────────┤
│ Dec 28, 2025 • $200.00 • Cash           │
│ Invoice: S-001234                        │
│ By: Cashier 1                           │
│ ─────────────────────────────────────   │
│ Dec 20, 2025 • $600.00 • Card           │
│ Invoice: S-001234                        │
│ By: Cashier 2                           │
└─────────────────────────────────────────┘
```

---

## Error Handling

### Common Errors & Solutions

#### 1. Walk-in Customer Credit Error (HTTP 400)

```javascript
{
  "message": "Walk-in customers cannot use credit payment type or have due amount. Please select a registered customer."
}
```

**Solution:**
- Show customer selection dialog
- Or collect full payment
- Don't allow "Due" payment type for walk-ins

#### 2. Credit Limit Exceeded (HTTP 400)

```javascript
{
  "message": "Customer John Doe's credit limit would be exceeded. Current due: $1700, New due: $400, Credit limit: $2000"
}
```

**Solution:**
- Show error to cashier
- Offer to collect more upfront
- Or contact manager for approval

#### 3. Payment Exceeds Invoice Due (HTTP 400)

```javascript
{
  "message": "Invoice due is $400. You cannot pay more than the invoice due amount."
}
```

**Solution:**
- Validate payment amount on frontend
- Max payment = invoice.dueAmount
- Update form validation

#### 4. No Customer Selected (HTTP 422)

```javascript
{
  "errors": {
    "party_id": ["The party id field is required when due amount is greater than 0."]
  }
}
```

**Solution:**
- Disable "Partial Payment" option if no customer selected
- Or auto-open customer selection dialog

---

## Complete Code Examples

### React/Next.js Example

```typescript
// types.ts
interface SaleData {
  party_id?: number;
  payment_type_id: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  isPaid: boolean;
  products: ProductItem[];
}

interface DueCollectionData {
  party_id: number;
  payment_type_id: number;
  paymentDate: string;
  payDueAmount: number;
  invoiceNumber?: string;
}

// SaleForm.tsx
import { useState } from 'react';

export const SaleForm = () => {
  const [formData, setFormData] = useState({
    party_id: null,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
  });

  const handlePaidAmountChange = (paid: number) => {
    const due = formData.totalAmount - paid;
    setFormData({
      ...formData,
      paidAmount: paid,
      dueAmount: due,
      isPaid: due === 0
    });
  };

  const validatePartialPayment = () => {
    if (formData.dueAmount > 0 && !formData.party_id) {
      alert('Please select a customer for partial payment');
      return false;
    }
    return true;
  };

  const submitSale = async () => {
    if (!validatePartialPayment()) return;

    try {
      const response = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Sale saved! Invoice: ${result.data.invoiceNumber}`);
        
        if (result.data.dueAmount > 0) {
          alert(`Remaining due: $${result.data.dueAmount}`);
        }
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Sale error:', error);
    }
  };

  return (
    <form>
      <CustomerSelect 
        value={formData.party_id}
        onChange={(id) => setFormData({...formData, party_id: id})}
        required={formData.dueAmount > 0}
      />
      
      <input
        type="number"
        placeholder="Amount Received"
        value={formData.paidAmount}
        onChange={(e) => handlePaidAmountChange(Number(e.target.value))}
      />
      
      {formData.dueAmount > 0 && (
        <div className="alert alert-warning">
          Remaining Due: ${formData.dueAmount}
        </div>
      )}
      
      <button onClick={submitSale}>Save Sale</button>
    </form>
  );
};

// DueCollectionForm.tsx
export const DueCollectionForm = ({ partyId }: { partyId: number }) => {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    fetchUnpaidInvoices();
  }, [partyId]);

  const fetchUnpaidInvoices = async () => {
    const response = await fetch(
      `/api/v1/dues/invoices?party_id=${partyId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await response.json();
    setInvoices(data.data.invoices);
  };

  const collectPayment = async () => {
    const data = {
      party_id: partyId,
      payment_type_id: 1,
      paymentDate: new Date().toISOString().split('T')[0],
      payDueAmount: amount,
      invoiceNumber: selectedInvoice?.invoiceNumber
    };

    try {
      const response = await fetch('/api/v1/dues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        alert('Payment collected successfully!');
        fetchUnpaidInvoices(); // Refresh
      }
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  return (
    <div>
      <h3>Collect Payment</h3>
      
      <select onChange={(e) => {
        const invoice = invoices.find(i => i.id === Number(e.target.value));
        setSelectedInvoice(invoice);
        setAmount(invoice?.dueAmount || 0);
      }}>
        <option value="">Select Invoice (Optional)</option>
        {invoices.map(inv => (
          <option key={inv.id} value={inv.id}>
            {inv.invoiceNumber} - Due: ${inv.dueAmount}
          </option>
        ))}
      </select>
      
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        max={selectedInvoice?.dueAmount}
        placeholder="Payment Amount"
      />
      
      {selectedInvoice && (
        <div>
          Invoice Due: ${selectedInvoice.dueAmount} → 
          ${selectedInvoice.dueAmount - amount}
        </div>
      )}
      
      <button onClick={collectPayment}>Record Payment</button>
    </div>
  );
};
```

### Flutter/Dart Example

```dart
// models/sale_request.dart
class SaleRequest {
  final int? partyId;
  final int paymentTypeId;
  final double totalAmount;
  final double paidAmount;
  final double dueAmount;
  final bool isPaid;
  final List<ProductItem> products;

  SaleRequest({
    this.partyId,
    required this.paymentTypeId,
    required this.totalAmount,
    required this.paidAmount,
    required this.dueAmount,
    required this.isPaid,
    required this.products,
  });

  Map<String, dynamic> toJson() => {
    'party_id': partyId,
    'payment_type_id': paymentTypeId,
    'totalAmount': totalAmount,
    'paidAmount': paidAmount,
    'dueAmount': dueAmount,
    'isPaid': isPaid,
    'products': products.map((p) => p.toJson()).toList(),
  };
}

// services/sale_service.dart
class SaleService {
  Future<SaleResponse> createSale(SaleRequest request) async {
    final response = await http.post(
      Uri.parse('${baseUrl}/api/v1/sales'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 200) {
      return SaleResponse.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }
}

// services/due_collection_service.dart
class DueCollectionService {
  Future<List<Invoice>> getUnpaidInvoices(int partyId) async {
    final response = await http.get(
      Uri.parse('${baseUrl}/api/v1/dues/invoices?party_id=$partyId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['data']['invoices'] as List)
          .map((json) => Invoice.fromJson(json))
          .toList();
    }
    throw Exception('Failed to load invoices');
  }

  Future<void> collectPayment(DueCollectionRequest request) async {
    final response = await http.post(
      Uri.parse('${baseUrl}/api/v1/dues'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body)['message']);
    }
  }
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Calculate due amount correctly (totalAmount - paidAmount)
- [ ] Validate customer required when dueAmount > 0
- [ ] Validate payment amount <= invoice due
- [ ] Handle API errors gracefully

### Integration Tests
- [ ] Create sale with partial payment
- [ ] Verify party due balance updated
- [ ] Collect due payment
- [ ] Verify invoice marked as paid when fully paid
- [ ] List unpaid invoices
- [ ] View payment history

### UI/UX Tests
- [ ] Disable partial payment for walk-in customers
- [ ] Show due amount warning
- [ ] Auto-calculate due amount
- [ ] Display customer current due balance
- [ ] Quick payment buttons work (Full, Half, etc.)
- [ ] Validation messages clear and helpful

---

## API Reference Links

- **Full API Documentation**: `/docs/API_DOCUMENTATION.md` - Section 15
- **Quick Reference**: `/docs/API_QUICK_REFERENCE.md`
- **Interactive Docs**: `http://localhost:8700/docs/api`
- **Backend Log**: `/docs/BACKEND_DEVELOPMENT_LOG.md`

---

## Support

For questions or issues:
1. Check API error messages (they're descriptive)
2. Review this guide's error handling section
3. Check backend logs for validation details
4. Consult full API documentation

---

**Document Version:** 1.0  
**Created:** December 28, 2025  
**Maintained By:** Backend Team
