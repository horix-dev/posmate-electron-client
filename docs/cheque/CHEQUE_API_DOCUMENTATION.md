# Cheque Management API Documentation

**Version:** 2.0  
**Created:** January 31, 2026  
**Last Updated:** January 31, 2026  
**Status:** ✅ Production Ready

---

## Overview

Comprehensive cheque management system supporting **three types of cheque operations**:

### ✅ Phase 1: Manual Entry Support (Completed)
- **Type 1:** Cheques received from customers **with invoice** (linked to sale/due collection)
- **Type 2:** Cheques received from customers **without invoice** (manual entry for general payments)

### ✅ Phase 2: Supplier Payments (Completed)
- **Type 3:** Cheques **issued to suppliers** (linked to payable/purchase)

### Core Features
- Three distinct cheque creation methods for different scenarios
- Status tracking (pending → deposited → cleared/bounced)
- Deposit and clearing operations with automatic bank balance updates
- Bounce handling with charges tracking
- Bounce recovery through reopen functionality
- Transaction history and flexible filtering (4 pagination modes)
- Cheque statistics and aggregates
- Reference tracking (linked to sales, purchases, payables, purpose notes)

---

## Authentication

All endpoints require authentication:
```
Authorization: Bearer {token}
```

---

## Base URL
```
/api/v1/cheques
```

---

## Cheque Types & Creation Endpoints

### Three Types of Cheques

| Type | Scenario | Creation Endpoint | Linked To |
|------|----------|-------------------|-----------|
| **Type 1: Received with Invoice** | Customer pays with cheque for a sale | `POST /api/v1/cheques` | `due_collect_id` (with `sale_id`) |
| **Type 2: Received Manual Entry** | Customer gives cheque without invoice | `POST /api/v1/cheques/manual-entry` | `due_collect_id` (with `purpose` only) |
| **Type 3: Issued to Supplier** | You issue cheque to pay supplier | `POST /api/v1/cheques/issue-to-supplier` | `payable_id` + `drawn_from_id` (bank) |

---

## Endpoints

### 1. List Cheques (GET /api/v1/cheques)

**Supports 4 Pagination Modes:**

#### Mode 1: Default (All Cheques)
```bash
GET /api/v1/cheques
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "business_id": 1,
      "bank_id": 2,
      "party_id": 5,
      "type": "received",
      "cheque_number": "CHQ-001234",
      "amount": 15000.00,
      "issue_date": "2026-01-15",
      "due_date": "2026-02-15",
      "deposit_date": null,
      "clear_date": null,
      "bounce_date": null,
      "status": "pending",
      "reference_type": "sale",
      "reference_id": 123,
      "notes": "Payment for invoice INV-001234",
      "bounce_reason": null,
      "bounce_charges": null,
      "bank": {
        "id": 2,
        "name": "Business Bank Account",
        "account_number": "1234567890"
      },
      "party": {
        "id": 5,
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-01-15T10:00:00Z"
    }
  ],
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

#### Mode 2: Limit (Dropdown)
```bash
GET /api/v1/cheques?limit=50
```

**Use Case:** Populate dropdowns, select lists  
**Max Limit:** 1000 records

#### Mode 3: Offset Pagination (Management Table)
```bash
GET /api/v1/cheques?page=1&per_page=20
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 150,
    "per_page": 20,
    "current_page": 1,
    "last_page": 8,
    "from": 1,
    "to": 20
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Use Case:** Paginated management tables  
**Max Per Page:** 100 records

#### Mode 4: Cursor Pagination (Sync)
```bash
GET /api/v1/cheques?cursor=0&per_page=500
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "next_cursor": 500,
    "has_more": true
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Use Case:** Efficient sync operations  
**Max Per Page:** 1000 records

**Filters:**
```bash
GET /api/v1/cheques?status=pending&type=received&bank_id=2&party_id=5&date_from=2026-01-01&date_to=2026-01-31&search=CHQ
```

| Filter | Type | Des- Type 1: Received with Invoice (POST /api/v1/cheques)

**Use Case:** Customer pays with cheque for a specific sale/invoice

**Request:**
```json
{
  "type": "received",
  "due_collect_id": 123,
  "cheque_number": "CHQ-001234",
  "amount": 15000.00,
  "issue_date": "2026-01-15",
  "due_date": "2026-02-15",
  "bank_name": "Customer's Bank Name",
  "account_holder": "John Doe",
  "note": "Payment for Sale #INV-001234"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `type` | sometimes, in:received,issued |
| `due_collect_id` | required_if:type,received, exists:due_collects |
| `cheque_number` | required, max:255, unique per business |
| `amount` | required, numeric, min:0 |
| `issue_date` | required, date, format:YYYY-MM-DD |
| `due_date` | nullable, date, after_or_equal:issue_date |
| `bank_name` | required, string, max:255 |
| `account_holder` | required, string, max:255 |
| `note` | nullable, string
| Field | Rules |
|-------|-------|
| `bank_id` | required, exists:banks |
| `party_id` | required, exists:parties |
| `type` | required, in:issued,received |
| `cheque_number` | required, max:50, unique per business |
| `amount` | required, numeric, min:0.01 |
| `issue_date` | required, date, format:YYYY-MM-DD |
| `due_date` | required, date, after_or_equal:issue_date |
| `retype": "received",
    "due_collect_id": 123,
    "cheque_number": "CHQ-001234",
    "amount": 15000.00,
    "issue_date": "2026-01-15",
    "due_date": "2026-02-15",
    "bank_name": "Customer's Bank Name",
    "account_holder": "John Doe",
    "status": "pending",
    "note": "Payment for Sale #INV-001234",
    "dueCollect": {
      "id": 123,
      "sale_id": 456,
      "party_id": 5,
      "payDueAmount": 15000.00,
      "party": {
        "id": 5,
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "sale": {
        "id": 456,
        "invoiceNumber": "INV-001234"
      }
    },
    "created_at": "2026-01-31T12:00:00Z",
    "updated_at": "2026-01-31T12:00:00Z"
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

---

### 2A. Create Cheque - Type 2: Manual Entry (POST /api/v1/cheques/manual-entry) ✨ NEW

**Use Case:** Customer gives you a cheque WITHOUT a specific invoice (general payment, advance, security deposit, etc.)

**Request:**
```json
{
  "cheque_number": "CHQ-005678",
  "amount": 25000.00,
  "issue_date": "2026-01-31",
  "due_date": "2026-02-28",
  "bank_name": "State Bank",
  "account_holder": "Jane Smith",
  "purpose": "Advance payment for future orders",
  "note": "Customer provided advance payment"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `cheque_number` | required, string, unique per business |
| `amount` | required, numeric, min:0 |
| `issue_date` | required, date |
| `due_date` | nullable, date, after_or_equal:issue_date |
| `bank_name` | required, string, max:255 |
| `account_holder` | required, string, max:255 |
| `purpose` | required, string, max:255 |
| `note` | nullable, string |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Manual entry cheque created successfully.",
  "data": {
    "id": 2,
    "business_id": 1,
    "type": "received",
    "due_collect_id": 789,
    "cheque_number": "CHQ-005678",
    "amount": 25000.00,
    "issue_date": "2026-01-31",
    "due_date": "2026-02-28",
    "bank_name": "State Bank",
    "account_holder": "Jane Smith",
    "status": "pending",
    "note": "Customer provided advance payment",
    "dueCollect": {
      "id": 789,
      "purpose": "Advance payment for future orders",
      "amount": 25000.00,
      "sale_id": null,
      "party_id": null
    },
    "created_at": "2026-01-31T12:00:00Z",
    "updated_at": "2026-01-31T12:00:00Z"
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Key Differences from Type 1:**
- ✅ No `due_collect_id` required in request (auto-created)
- ✅ `purpose` field required (explains what the payment is for)
- ✅ No `sale_id` or `party_id` linked (general payment)
- ✅ Creates `DueCollect` record automatically with purpose

---

### 2B. Create Cheque - Type 3: Issue to Supplier (POST /api/v1/cheques/issue-to-supplier) ✨ NEW

**Use Case:** You issue a cheque to pay a supplier for purchases or payables

**Request:**
```json
{
  "payable_id": 45,
  "drawn_from_id": 2,
  "cheque_number": "CHQ-987654",
  "amount": 50000.00,
  "issue_date": "2026-01-31",
  "due_date": "2026-02-15",
  "bank_name": "Supplier's Bank Name",
  "account_holder": "ABC Suppliers Ltd",
  "note": "Payment for Purchase Order #PO-1234"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `payable_id` | required, exists:payables |
| `drawn_from_id` | required, exists:banks (your bank account) |
| `cheque_number` | required, string, unique per business |
| `amount` | required, numeric, min:0 |
| `issue_date` | required, date |
| `due_date` | nullable, date, after_or_equal:issue_date |
| `bank_name` | required, string, max:255 (supplier's bank) |
| `account_holder` | required, string, max:255 (supplier's name) |
| `note` | nullable, string |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Supplier cheque issued successfully.",
  "data": {
    "id": 3,
    "business_id": 1,
    "type": "issued",
    "payable_id": 45,
    "drawn_from_id": 2,
    "cheque_number": "CHQ-987654",
    "amount": 50000.00,
    "issue_date": "2026-01-31",
    "due_date": "2026-02-15",
    "bank_name": "Supplier's Bank Name",
    "account_holder": "ABC Suppliers Ltd",
    "status": "issued",
    "note": "Payment for Purchase Order #PO-1234",
    "payable": {
      "id": 45,
      "purchase_id": 123,
      "party_id": 10,
      "amount": 50000.00,
      "status": "pending",
      "party": {
        "id": 10,
        "name": "ABC Suppliers Ltd",
        "phone": "+9876543210"
      },
      "purchase": {
        "id": 123,
        "invoiceNumber": "PUR-001234"
      }
    },
    "drawnFromBank": {
      "id": 2,
      "name": "Business Main Account",
      "account_number": "9876543210",
      "current_balance": 150000.00
    },
    "created_at": "2026-01-31T12:00:00Z",
    "updated_at": "2026-01-31T12:00:00Z"
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Key Differences from Type 1 & 2:**
- ✅ Type is automatically set to `issued` (not received)
- ✅ Status is automatically set to `issued` (not pending)
- ✅ Requires `payable_id` (linked to supplier payable)
- ✅ Requires `drawn_from_id` (your bank account)
- ✅ No `due_collect_id` (different payment flow)   "account_number": "1234567890"
    },
    "party": {
      "id": 5,
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "created_at": "2026-01-31T12:00:00Z",
    "updated_at": "2026-01-31T12:00:00Z"
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Error (Duplicate Cheque Number):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "cheque_number": ["Cheque number already exists in this business"]
  }
}
```

---

### 3. Get Single Cheque (GET /api/v1/cheques/{id})

**Response:**
```json
{
  "success": true,
  "message": "Cheque fetched successfully",
  "data": {
    "id": 1,
    "business_id": 1,
    "bank_id": 2,
    "party_id": 5,
    "type": "received",
    "cheque_number": "CHQ-001234",
    "amount": 15000.00,
    "issue_date": "2026-01-15",
    "due_date": "2026-02-15",
    "deposit_date": "2026-02-10",
    "clear_date": "2026-02-17",
    "bounce_date": null,
    "status": "cleared",
    "reference_type": "sale",
    "reference_id": 123,
    "notes": "Payment for invoice INV-001234",
    "bounce_reason": null,
    "bounce_charges": null,
    "bank": {
      "id": 2,
      "name": "Business Bank Account",
      "account_number": "1234567890",
      "current_balance": 165000.00
    },
    "party": {
      "id": 5,
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St"
    },
    "created_at": "2026-01-15T10:00:00Z",
    "updated_at": "2026-02-17T14:30:00Z"
  },
  "_server_timestamp": "2026-01-31T12:00:00Z"
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "message": "Cheque not found"
}
```

---

### 4. Update Cheque (PUT /api/v1/cheques/{id})

**Request (Partial Update Supported):**
```json
{
  "bank_id": 2,
  "party_id": 5,
  "cheque_number": "CHQ-001234-UPD",
  "amount": 16000.00,
  "issue_date": "2026-01-15",
  "due_date": "2026-02-20",
  "notes": "Updated payment details"
}
```

**Validation:** Same as create, but all fields use `sometimes` rule (optional for updates)

**Business Rules:**
- ⚠️ **Only cheques with status `pending` can be updated**
- ⚠️ Once deposited, cleared, or bounced, cheques cannot be modified
- Must use `reopen()` endpoint to change bounced cheques back to pending
- Cheque number must remain unique per business

**Response:**
```json
{
  "success": true,
  "message": "Cheque updated successfully",
  "data": {
    "id": 1,
    "cheque_number": "CHQ-001234-UPD",
    "amount": 16000.00,
    "due_date": "2026-02-20",
    "status": "pending",
    "notes": "Updated payment details",
    "updated_at": "2026-01-31T13:00:00Z"
  },
  "_server_timestamp": "2026-01-31T13:00:00Z"
}
```

**Error (Cannot Update):**
```json
{
  "success": false,
  "message": "Cannot update cheque with status: cleared. Only pending cheques can be updated."
}
```

---

### 5. Delete Cheque (DELETE /api/v1/cheques/{id})

**Business Rules:**
- ⚠️ **Only cheques with status `pending` or `cancelled` can be deleted**
- ⚠️ Cannot delete deposited, cleared, or bounced cheques
- Data is soft-deleted (preserved in database)

**Response:**
```json
{
  "success": true,
  "message": "Cheque deleted successfully",
  "_server_timestamp": "2026-01-31T13:00:00Z"
}
```

**Error (Cannot Delete):**
```json
{
  "success": false,
  "message": "Cannot delete cheque with status: cleared. Only pending or cancelled cheques can be deleted."
}
```

---

### 6. Deposit Cheque (POST /api/v1/cheques/{id}/deposit)

**Request:**
```json
{
  "deposit_date": "2026-02-10"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `deposit_date` | required, date, format:YYYY-MM-DD, before_or_equal:today |

**Business Logic:**
- Changes status from `pending` → `deposited`
- Records the deposit date
- **Can only deposit cheques with status `pending`**
- **No bank balance update** at this stage
- Cheque is now marked as deposited but not yet cleared

**Response:**
```json
{
  "success": true,
  "message": "Cheque deposited successfully",
  "data": {
    "id": 1,
    "status": "deposited",
    "deposit_date": "2026-02-10",
    "cheque_number": "CHQ-001234",
    "amount": 15000.00,
    "bank": {
      "id": 2,
      "name": "Business Bank Account",
      "current_balance": 150000.00
    },
    "updated_at": "2026-02-10T10:30:00Z"
  },
  "_server_timestamp": "2026-02-10T10:30:00Z"
}
```

**Error (Cannot Deposit):**
```json
{
  "success": false,
  "message": "Only pending cheques can be deposited. Current status: cleared"
}
```

---

### 7. Clear Cheque (POST /api/v1/cheques/{id}/clear)

**Request:**
```json
{
  "clear_date": "2026-02-17"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `clear_date` | required, date, format:YYYY-MM-DD, after_or_equal:deposit_date |

**Business Logic:**
- Changes status from `deposited` → `cleared`
- Records the clear date
- **Can only clear cheques with status `deposited`**
- **UPDATES BANK BALANCE:**
  - **Received cheque (type: received):** Adds amount to bank balance (credit)
  - **Issued cheque (type: issued):** Deducts amount from bank balance (debit)
- Cheque is now permanently cleared

**Response:**
```json
{
  "success": true,
  "message": "Cheque cleared successfully. Bank balance updated.",
  "data": {
    "id": 1,
    "status": "cleared",
    "clear_date": "2026-02-17",
    "type": "received",
    "amount": 15000.00,
    "cheque_number": "CHQ-001234",
    "bank": {
      "id": 2,
      "name": "Business Bank Account",
      "previous_balance": 150000.00,
      "current_balance": 165000.00,
      "balance_change": 15000.00,
      "balance_change_reason": "Received cheque cleared (credit)"
    },
    "updated_at": "2026-02-17T14:30:00Z"
  },
  "_server_timestamp": "2026-02-17T14:30:00Z"
}
```

**Error (Cannot Clear):**
```json
{
  "success": false,
  "message": "Only deposited cheques can be cleared. Current status: pending"
}
```

**Error (Insufficient Balance - Issued Cheque):**
```json
{
  "success": false,
  "message": "Insufficient bank balance. Current: 10000.00, Required: 15000.00"
}
```

---

### 8. Bounce Cheque (POST /api/v1/cheques/{id}/bounce)

**Request:**
```json
{
  "bounce_date": "2026-02-17",
  "bounce_reason": "Insufficient funds",
  "bounce_charges": 500.00
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `bounce_date` | required, date, format:YYYY-MM-DD, after_or_equal:deposit_date |
| `bounce_reason` | nullable, string, max:500 |
| `bounce_charges` | nullable, numeric, min:0 |

**Business Logic:**
- Changes status from `deposited` → `bounced`
- Records bounce date, reason, and bank charges
- **Can only bounce cheques with status `deposited`**
- **NO bank balance update** (cheque didn't clear)
- Bounce charges are recorded but not automatically deducted from balance
- Cheque can be reopened and redeposited

**Response:**
```json
{
  "success": true,
  "message": "Cheque marked as bounced",
  "data": {
    "id": 1,
    "status": "bounced",
    "bounce_date": "2026-02-17",
    "bounce_reason": "Insufficient funds",
    "bounce_charges": 500.00,
    "cheque_number": "CHQ-001234",
    "amount": 15000.00,
    "party": {
      "id": 5,
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "updated_at": "2026-02-17T14:35:00Z"
  },
  "_server_timestamp": "2026-02-17T14:35:00Z"
}
```

**Error (Cannot Bounce):**
```json
{
  "success": false,
  "message": "Only deposited cheques can be marked as bounced. Current status: pending"
}
### Received Cheques (Type 1 & 2)
```
                PENDING
                   |
         (deposit)  | (update) | (delete)
                   |           |
                ↙ ↙ ↓           ↓
          DEPOSITED        CANCELLED
             ↙   ↖
  (clear)  /       \ (bounce)
         /           \
        ↓             ↓
    CLEARED        BOUNCED
                      ↑
                   (reopen)
                      |
                   PENDING (again)
```

### Issued Cheques (Type 3)
```
                ISSUED
                   |
         (supplier deposits)
                   |
                   ↓
              DEPOSITED
             ↙         ↖
  (clear)  /             \ (bounce)
         /                 \
        ↓                   ↓
    CLEARED              BOUNCED
```

**Note:** Issued cheques start at `ISSUED` status and follow supplier's bank clearing process.notes` | nullable, string, max:500 |

**Business Logic:**
- Changes status from `bounced` → `pending`
- Clears bounce date, reason, and charges
- Resets deposit_date to null
- Allows cheque to be deposited again
- **Can only reopen cheques with status `bounced`**
- Useful for bounce recovery workflow

**Response:**
```json
{
  "success": true,
  "message": "Cheque reopened successfully. Ready for redeposit.",
  "data": {
    "id": 1,
    "status": "pending",
    "bounce_date": null,
    "bounce_reason": null,
    "bounce_charges": null,
    "deposit_date": null,
    "clear_date": null,
    "notes": "Party confirmed sufficient funds now. Redepositing cheque.",
    "cheque_number": "CHQ-001234",
    "amount": 15000.00,
    "updated_at": "2026-02-20T10:00:00Z"
  },
  "_server_timestamp": "2026-02-20T10:00:00Z"
}
```

**Error (Cannot Reopen):**
```json
{
  "success": false,
  "message": "Only bounced cheques can be reopened. Current status: cleared"
}
```

---

### 10. Cheque Statistics (GET /api/v1/cheques/statistics)

**Query Parameters:**
```bash
GET /api/v1/cheques/statistics?date_from=2026-01-01&date_to=2026-01-31&bank_id=2&type=received
```

| Filter | Type | Description |
|--------|------|-------------|
| `date_from` | date | Filter from date (YYYY-MM-DD) |
| `date_to` | date | Filter to date (YYYY-MM-DD) |
| `bank_id` | integer | Filter by specific bank |
| `type` | string | Filter by cheque type (issued/received) |

**Response:**
```json
{
  "success": true,
  "message": "Cheque statistics fetched successfully",
  "data": {
    "total_cheques": 150,
    "total_amount": 2500000.00,
    "by_status": {
      "pending": {
        "count": 25,
        "amount": 450000.00,
        "percentage": 16.67
      },
      "deposited": {
        "count": 30,
        "amount": 550000.00,
        "percentage": 20.00
      },
      "cleared": {
        "count": 85,
        "amount": 1400000.00,
        "percentage": 56.00
      },
      "bounced": {
        "count": 8,
        "amount": 95000.00,
        "percentage": 3.33
      },
      "cancelled": {
        "count": 2,
   Complete Workflow Examples

### Scenario 1: Type 1 - Received Cheque from Customer WITH Invoice
    },
    "by_type": {
      "issued": {
        "count": 60,
        "amount": 950000.00
      },
      "received": {
        "count": 90,
        "amount": 1550000.00
      }
    },
    "by_bank": {
      "bank_1": {
        "id": 1,
        "name": "Main Account",
        "count": 75,
        "amount": 1250000.00
      },
      "bank_2": {
        "id": 2,
        "name": "Secondary Account",
        "count": 75,
        "amount": 1250000.00
      }
    },
    "bounce_statistics": {
      "total_bounced": 8,
      "total_bounce_charges": 4500.00,
      "bounce_rate": 5.33
    },Type 2 - Received Cheque WITHOUT Invoice (Manual Entry) ✨ NEW
```bash
# Step 1: Customer gives cheque for advance/general payment
POST /api/v1/cheques/manual-entry
{
  "cheque_number": "CHQ-112233",
  "amount": 25000.00,
  "issue_date": "2026-01-31",
  "due_date": "2026-02-28",
  "bank_name": "State Bank",
  "account_holder": "Jane Smith",
  "purpose": "Advance payment for future orders",
  "note": "Received advance"
}
# Response: Status = pending, DueCollect auto-created with purpose
# No sale_id or party_id linked

# Step 2: Deposit cheque
POST /api/v1/cheques/2/deposit
{"deposit_date": "2026-02-05"}
# Response: Status = deposited

# Step 3: Clear cheque (balance increases)
POST /api/v1/cheques/2/clear
{"clear_date": "2026-02-12"}
# Response: Status = cleared, Bank balance increases by 25000
# Bank: 65000 → 90000
```

### Scenario 3: Type 3 - Issue Cheque to Supplier ✨ NEW
```bash
# Step 1: Create payable for supplier first (if not exists)
POST /api/v1/payables
{
  "purchase_id": 456,
  "party_id": 10,
  "amount": 50000.00,
  "payment_type_id": 3,
  "purpose": "Payment for Purchase #PUR-456",
  "note": "Supplier payment due"
}
# Response: payable_id = 45

# Step 2: Issue cheque to supplier
POST /api/v1/cheques/issue-to-supplier
{
  "payable_id": 45,
  "drawn_from_id": 2,
  "cheque_number": "CHQ-654321",
  "amount": 50000.00,
  "issue_date": "2026-01-31",
  "due_date": "2026-02-15",
  "bank_name": "Supplier's Bank",
  "account_holder": "ABC Suppliers Ltd",
  "note": "Payment for PUR-456"
}
# Response: Status = issued, type = issued, No balance change

# Step 3: Supplier deposits cheque (manual status update)
POST /api/v1/cheques/3/deposit
{"deposit_date": "2026-02-03"}
# Response: Status = deposited, No balance change

# Step 4: Supplier's bank clears (our balance decreases)
POST /api/v1/cheques/3/clear
{"clear_date": "2026-02-10"}
# Response: Status = cleared, Bank balance decreases by 50000
# Bank: 90000 → 40
```
                PENDING
                   |
         (deposit)  | (update) | (delete)
                   |           |
                ↙ ↙ ↓           ↓
          DEPOSITED        CANCELLED
             ↙   ↖
  (clear)  /       \ (bounce)
         /           \
        ↓             ↓
    CLEARED        BOUNCED
                      ↑
                   (reopen)
                      |
                   PENDING (again)
```

---

## Status Transitions

| From Status | To Status | Action | Bank Balance Updated? |
|-------------|-----------|--------|----------------------|
| `pending` | `deposited` | `deposit()` | ❌ No |
| `pending` | `cancelled` | `delete()` | ❌ No |
| `pending` | `*` (partial) | `update()` | ❌ No |
| `deposited` | `cleared` | `clear()` | **✅ Yes** |
| `deposited` | `bounced` | `bounce()` | ❌ No |
| `bounced` | `pending` | `reopen()` | ❌ No |

---

## Cheque Types

| Type | Description | Bank Balance Impact (on clear) |
|------|-------------|-------------------------------|
| `received` | Cheque received from customer/party | Credit (adds to balance) |
| `issued` | Cheque issued to supplier/party | Debit (subtracts from balance) |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed or business logic error"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Cheque not found"
}
```

### 422 Unprocessable Entity
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "cheque_number": ["Cheque number already exists in this business"],
    "amount": ["The amount must be at least 0.01"],
    "due_date": ["The due date must be after or equal to the issue date"]
  }
}
```

### 406 Not Acceptable (Status Conflict)
```json
{
  "success": false,
  "message": "Cannot perform operation on cheque with this status"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "An error occurred while processing your request"
}
```

---

## Important Business Rules

### 1. Update Restrictions
- ✅ Can update: `pending` status cheques
- ❌ Cannot update: `deposited`, `cleared`, `bounced` cheques
- Use `reopen()` to change bounced cheques back to pending

### 2. Delete Restrictions
- ✅ Can delete: `pending`, `cancelled` status cheques
- ❌ Cannot delete: `deposited`, `cleared`, `bounced` cheques

### 3. Bank Balance Updates
- **Only `clear()` operation updates bank balance**
- **Received cheques:** Add amount to bank balance (credit)
- **Issued cheques:** Subtract amount from bank balance (debit)

### 4. Bounce Charges
- Optional field to track bank charges
- Does **NOT automatically deduct** from bank balance
- Should be recorded as separate expense if needed
- Tracked separately for reporting purposes

### 5. Reference Tracking
- Link cheques to related transactions
- `reference_type`: sale, purchase, expense, income, other
- `reference_id`: ID of the related transaction
- Helps track which transaction the cheque is for

---

## Use Cases

### Scenario 1: Received Cheque from Customer (Complete Flow)
```bash
# Step 1: Cre4: Bounced Cheque Recovery (Works for All Types
POST /api/v1/cheques
{
  "bank_id": 1,
  "party_id": 5,
  "type": "received",
  "cheque_number": "CHQ-123456",
  "amount": 15000.00,
  "issue_date": "2026-01-15",
  "due_date": "2026-02-15",
  "reference_type": "sale",
  "reference_id": 123,
  "notes": "Payment for Sale #123"
}
# Response: Status = pending, No balance change

# Step 2: Deposit cheque after 3 days
POST /api/v1/cheques/1/deposit
{"deposit_date": "2026-01-18"}
# Response: Status = deposited, No balance change (yet)

# Step 3: Bank clears after 7 more days (balance updates)
POST /api/v1/cheques/1/clear
{"clear_date": "2026-01-25"}
# Response: Status = cleared, Bank balance increases by 15000
# Bank: 50000 → 65000
```

### Scenario 5: Issued Cheque to Supplier (Complete Flow)
```bash
# Step 1: Create issued cheque for supplier
POST /api/v1/cheques
{
  "bank_id": 1,
  "party_id": 10,
  "type": "issued",
  "cheque_number": "CHQ-654321",
  "amount": 50000.00,
  "issue_date": "2026-01-20",
  "due_date": "2026-02-20",
  "reference_type": "purchase",
  "reference_id": 456,
  "notes": "Payment for PUR-456"
}
# Response: Status = pending, No balance change

# Step 2: Supplier deposits cheque
POST /api/v1/cheques/2/deposit
{"deposit_date": "2026-01-25"}
# Response: Status = deposited, No balance change

# Step 3: Supplier's bank clears (our balance decreases)
POST /api/v1/cheques/2/clear
{"clear_date": "2026-02-01"}
# Response: Status = cleared, Bank balance decreases by 50000
# Bank: 65000 → 15000
```

### Scenario 3: Bounced Cheque Recovery (3-Step Recovery)
```bash6
# Step 1: Cheque bounces during clearing
POST /api/v1/cheques/1/bounce
{
  "bounce_date": "2026-01-25",
  "bounce_reason": "Insufficient funds",
  "bounce_charges": 500.00
}
# Response: Status = bounced, No balance change (cheque never cleared)
# Note: Bounce charges not automatically deducted - manual expense entry needed

# Step 2: Customer adds funds, reopen cheque
POST /api/v1/cheques/1/reopen
{"notes": "Customer confirmed sufficient funds. Redepositing."}
# Response: Status = pending (back to start)

# Step 3: Redeposit cheque
POST /api/v1/cheques/1/deposit
{"deposit_date": "2026-02-01"}
# Status = deposited

# Step 4: Clear successfully
POST /api/v1/cheques/1/clear
{"clear_date": "2026-02-08"}
# Status = cleared, Bank balance finally updated
```

### Scenario 4: Update Pending Cheque Details
```bash
# Correct cheque details before deposit
PUT /api/v1/cheques/1
{
  "cheque_number": "CHQ-123456-CORRECTED",
  "amount": 16000.00,
  "notes": "Corrected amount"
}
# Works only if status = pending
# Response: Updated cheque data
```

### Scenario 5: Delete Unused Cheque
```bash
# Cancel pending cheque before deposit
DELETE /api/v1/cheques/1
# Works only if status = pending or cancelled
# Response: Cheque deleted (soft delete)
```

---

## Testing Examples

### Using cURL

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8700/api/v1/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"password"}' \
  | jq -r '.token')

# Create received cheque
curl -X POST http://localhost:8700/api/v1/cheques \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bank_id": 1,
    "party_id": 5,
    "type": "received",
    "cheque_number": "CHQ-TEST-001",
    "amount": 10000.00,
    "issue_date": "2026-01-31",
    "due_date": "2026-02-15",
    "reference_type": "sale",
    "reference_id": 100,
    "notes": "Test cheque"
  }'

# Deposit cheque
curl -X POST http://localhost:8700/api/v1/cheques/1/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deposit_date": "2026-02-01"}'

# Clear cheque
curl -X POST http://localhost:8700/api/v1/cheques/1/clear \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"clear_date": "2026-02-08"}'

# Get cheque details
curl -X GET http://localhost:8700/api/v1/cheques/1 \
  -H "Authorization: Bearer $TOKEN"

# List cheques with filters
curl -X GET "http://localhost:8700/api/v1/cheques?status=cleared&type=received&page=1&per_page=20" \
  -H "Authorization: Bearer $TOKEN"

# Get statistics
curl -X GET "http://localhost:8700/api/v1/cheques/statistics?date_from=2026-01-01&date_to=2026-02-28" \
  -H "Authorization: Bearer $TOKEN"

# Update pending cheque
curl -X PUT http://localhost:8700/api/v1/cheques/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cheque_number": "CHQ-TEST-001-UPDATED",
    "notes": "Updated test cheque"
  }'

# Delete cheque
curl -X DELETE http://localhost:8700/api/v1/cheques/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related Documentation

- **ARCHITECTURE_AND_PATTERNS.md** - Design patterns followed
- **BACKEND_DEVELOPMENT_LOG.md** - Implementation details
- **API_DOCUMENTATION.md** - Complete API reference with section 36
- **API_QUICK_REFERENCE.md** - Quick lookup guide
- **BANK_API_DOCUMENTATION.md** - Bank management API (similar structure)
- **cheque.md** - Original feature plan

---

**Last Updated:** January 31, 2026  
**Maintained By:** Development Team  
**Status:** ✅ Production Ready
