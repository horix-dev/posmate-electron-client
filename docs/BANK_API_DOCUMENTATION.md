# Bank Management API Documentation

**Version:** 1.0  
**Created:** January 26, 2026  
**Status:** ✅ Production Ready

---

## Overview

Complete bank account management system for POS with support for:
- Multiple bank accounts per business
- Deposits and withdrawals with balance tracking
- Inter-bank transfers (atomic transactions)
- Transaction history with filtering
- Account lifecycle management (active → inactive → closed)
- Bank reconciliation tracking

---

## Authentication

All endpoints require authentication:
```
Authorization: Bearer {token}
```

---

## Base URL
```
/api/v1/banks
```

---

## Endpoints

### 1. List Banks (GET /api/v1/banks)

**Supports 4 Pagination Modes:**

#### Mode 1: Default (All Banks)
```bash
GET /api/v1/banks
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "Main Business Account",
      "account_number": "1234567890",
      "account_holder": "ABC Company",
      "bank_name": "State Bank",
      "current_balance": 50000.00,
      "opening_balance": 50000.00,
      "status": "active",
      "show_in_invoice": true,
      "branch": {
        "id": 1,
        "name": "Main Branch"
      },
      "transaction_count": 25,
      "latest_transaction_date": "2026-01-25T10:30:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-25T10:30:00Z"
    }
  ],
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

#### Mode 2: Limit (Dropdown)
```bash
GET /api/v1/banks?limit=50
```

**Use Case:** Populate dropdowns, select lists  
**Max Limit:** 1000 records

#### Mode 3: Offset Pagination (Management Table)
```bash
GET /api/v1/banks?page=1&per_page=20
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5,
    "from": 1,
    "to": 20
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Use Case:** Paginated management tables  
**Max Per Page:** 100 records

#### Mode 4: Cursor Pagination (Sync)
```bash
GET /api/v1/banks?cursor=0&per_page=500
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
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Use Case:** Efficient sync operations  
**Max Per Page:** 1000 records

**Filters:**
```bash
GET /api/v1/banks?status=active&search=business&branch_id=1&min_balance=1000
```

| Filter | Type | Description |
|--------|------|-------------|
| `status` | string | active, inactive, closed |
| `search` | string | Search by name, account_number, bank_name |
| `branch_id` | integer | Filter by branch |
| `min_balance` | decimal | Minimum balance |
| `max_balance` | decimal | Maximum balance |

---

### 2. Create Bank (POST /api/v1/banks)

**Request:**
```json
{
  "name": "Main Business Account",
  "account_number": "1234567890",
  "account_holder": "ABC Company",
  "bank_name": "State Bank",
  "branch_id": 1,
  "opening_balance": 50000.00,
  "opening_date": "2026-01-01",
  "routing_number": "026009593",
  "swift_code": "SBININBB",
  "ifsc_code": "SBIN0001234",
  "upi_id": "abc@bank",
  "branch_name": "Downtown Branch",
  "status": "active",
  "show_in_invoice": true
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | required, max:191 |
| `account_number` | required, max:50, unique per business |
| `account_holder` | required, max:191 |
| `bank_name` | required, max:191 |
| `branch_id` | required, exists:branches |
| `opening_balance` | nullable, numeric, min:0 |
| `opening_date` | required, date |
| `routing_number` | nullable, max:50 |
| `swift_code` | nullable, max:50 |
| `ifsc_code` | nullable, max:50 |
| `upi_id` | nullable, max:100 |
| `branch_name` | nullable, max:191 |
| `status` | required, in:active,inactive,closed |
| `show_in_invoice` | boolean |

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Bank account created successfully.",
  "data": {
    "id": 1,
    "name": "Main Business Account",
    "account_number": "1234567890",
    "current_balance": 50000.00,
    ...
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

---

### 3. Get Single Bank (GET /api/v1/banks/{id})

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 1,
    "name": "Main Business Account",
    "account_number": "1234567890",
    "account_holder": "ABC Company",
    "bank_name": "State Bank",
    "current_balance": 50000.00,
    "opening_balance": 50000.00,
    "opening_date": "2026-01-01",
    "routing_number": "026009593",
    "swift_code": "SBININBB",
    "ifsc_code": "SBIN0001234",
    "upi_id": "abc@bank",
    "branch_name": "Downtown Branch",
    "status": "active",
    "show_in_invoice": true,
    "branch": {
      "id": 1,
      "name": "Main Branch"
    },
    "transaction_count": 25,
    "latest_transaction_date": "2026-01-25T10:30:00Z",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-25T10:30:00Z"
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Error (404 Not Found):**
```json
{
  "success": false,
  "message": "Bank not found"
}
```

---

### 4. Update Bank (PUT/PATCH /api/v1/banks/{id})

**Request (Partial Update Supported):**
```json
{
  "name": "Updated Account Name",
  "status": "inactive",
  "show_in_invoice": false
}
```

**Validation:** Same as create, but all fields use `sometimes` rule (optional for updates)

**Response:**
```json
{
  "success": true,
  "message": "Bank account updated successfully.",
  "data": { ... },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

---

### 5. Delete Bank (DELETE /api/v1/banks/{id})

**Validation:** Bank cannot have any transactions

**Response:**
```json
{
  "success": true,
  "message": "Bank account deleted successfully.",
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Error (Transactions Exist):**
```json
{
  "success": false,
  "message": "Cannot delete bank with existing transactions. Please close the account instead."
}
```

---

### 6. Deposit (POST /api/v1/banks/{id}/deposit)

**Request:**
```json
{
  "amount": 5000.00,
  "description": "Cash deposit from sales",
  "reference": "SALE-001234"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `amount` | required, numeric, min:0.01 |
| `description` | required, string, max:500 |
| `reference` | nullable, string, max:100 |

**Response:**
```json
{
  "success": true,
  "message": "Deposit processed successfully.",
  "data": {
    "transaction": {
      "id": 101,
      "bank_id": 1,
      "type": "deposit",
      "amount": 5000.00,
      "balance_before": 50000.00,
      "balance_after": 55000.00,
      "balance_change": 5000.00,
      "description": "Cash deposit from sales",
      "reference": "SALE-001234",
      "transaction_date": "2026-01-26T12:00:00Z",
      "processed_by": {
        "id": 1,
        "name": "Admin User"
      }
    },
    "bank": {
      "id": 1,
      "name": "Main Business Account",
      "current_balance": 55000.00,
      ...
    }
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

---

### 7. Withdraw (POST /api/v1/banks/{id}/withdraw)

**Request:**
```json
{
  "amount": 2000.00,
  "description": "Payment to supplier",
  "reference": "PUR-001234"
}
```

**Validation:** Same as deposit + sufficient balance check

**Response:** Same structure as deposit, with `type: "withdrawal"`

**Error (Insufficient Balance):**
```json
{
  "success": false,
  "message": "Insufficient balance. Available: 1000.00, Required: 2000.00"
}
```

---

### 8. Transfer (POST /api/v1/banks/transfer)

**Request:**
```json
{
  "from_bank_id": 1,
  "to_bank_id": 2,
  "amount": 10000.00,
  "description": "Transfer to secondary account"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| `from_bank_id` | required, exists:banks, different from to_bank_id |
| `to_bank_id` | required, exists:banks |
| `amount` | required, numeric, min:0.01 |
| `description` | required, string, max:500 |

**Business Rules:**
- Both banks must belong to authenticated user's business
- Source bank must have sufficient balance
- Both banks must be active
- Transaction is atomic (both debit and credit succeed or fail together)

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully.",
  "data": {
    "id": 50,
    "from_bank_id": 1,
    "to_bank_id": 2,
    "amount": 10000.00,
    "description": "Transfer to secondary account",
    "transfer_date": "2026-01-26T12:00:00Z",
    "from_bank": {
      "id": 1,
      "name": "Main Business Account",
      "current_balance": 40000.00
    },
    "to_bank": {
      "id": 2,
      "name": "Secondary Account",
      "current_balance": 20000.00
    },
    "processed_by": {
      "id": 1,
      "name": "Admin User"
    }
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Error (Insufficient Balance):**
```json
{
  "success": false,
  "message": "Insufficient balance in source bank. Available: 5000.00, Required: 10000.00"
}
```

---

### 9. Get Transaction History (GET /api/v1/banks/{id}/transactions)

**Filters:**
```bash
GET /api/v1/banks/1/transactions?type=deposit&from_date=2026-01-01&to_date=2026-01-31&page=1&per_page=20
```

| Filter | Type | Description |
|--------|------|-------------|
| `type` | string | deposit, withdrawal, transfer_in, transfer_out |
| `from_date` | date | YYYY-MM-DD format |
| `to_date` | date | YYYY-MM-DD format |

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 101,
      "bank_id": 1,
      "type": "deposit",
      "amount": 5000.00,
      "balance_before": 50000.00,
      "balance_after": 55000.00,
      "balance_change": 5000.00,
      "description": "Cash deposit from sales",
      "reference": "SALE-001234",
      "transaction_date": "2026-01-26T10:00:00Z",
      "processed_by": {
        "id": 1,
        "name": "Admin User"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "per_page": 20,
    "current_page": 1,
    "last_page": 5,
    "from": 1,
    "to": 20
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

---

### 10. Close Account (POST /api/v1/banks/{id}/close)

**Business Rules:**
- Account balance must be zero
- Status will be permanently set to 'closed'
- Closed accounts cannot be reopened
- No further transactions allowed

**Response:**
```json
{
  "success": true,
  "message": "Bank account closed successfully.",
  "data": {
    "id": 1,
    "name": "Main Business Account",
    "current_balance": 0.00,
    "status": "closed",
    ...
  },
  "_server_timestamp": "2026-01-26T12:00:00Z"
}
```

**Error (Non-Zero Balance):**
```json
{
  "success": false,
  "message": "Cannot close account with balance. Current balance: 5000.00. Please transfer funds first."
}
```

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
  "message": "Bank not found"
}
```

### 422 Unprocessable Entity
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "account_number": ["The account number has already been taken."],
    "amount": ["The amount must be at least 0.01."]
  }
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

## Transaction Types

| Type | Description | Balance Change |
|------|-------------|----------------|
| `deposit` | Money added to account | Positive (+) |
| `withdrawal` | Money removed from account | Negative (-) |
| `transfer_in` | Money received from another bank | Positive (+) |
| `transfer_out` | Money sent to another bank | Negative (-) |

---

## Status Types

| Status | Description | Can Transact? |
|--------|-------------|---------------|
| `active` | Account is operational | ✅ Yes |
| `inactive` | Account is temporarily disabled | ❌ No |
| `closed` | Account is permanently closed | ❌ No |

---

## Use Cases

### 1. Daily Cash Deposit
```bash
# Record daily sales cash deposit
POST /api/v1/banks/1/deposit
{
  "amount": 12500.00,
  "description": "Daily sales deposit - January 26",
  "reference": "DAILY-2026-01-26"
}
```

### 2. Supplier Payment
```bash
# Pay supplier via bank withdrawal
POST /api/v1/banks/1/withdraw
{
  "amount": 5000.00,
  "description": "Payment to XYZ Supplier",
  "reference": "PUR-001234"
}
```

### 3. Transfer to Secondary Account
```bash
# Move excess cash to savings account
POST /api/v1/banks/transfer
{
  "from_bank_id": 1,
  "to_bank_id": 2,
  "amount": 50000.00,
  "description": "Transfer to savings account"
}
```

### 4. Monthly Reconciliation
```bash
# Get all transactions for the month
GET /api/v1/banks/1/transactions?from_date=2026-01-01&to_date=2026-01-31

# Compare with bank statement
# Create reconciliation record (future feature)
```

### 5. Account Closure
```bash
# Transfer all funds out
POST /api/v1/banks/transfer
{
  "from_bank_id": 1,
  "to_bank_id": 2,
  "amount": 45000.00,
  "description": "Closing account - transfer all funds"
}

# Close the account
POST /api/v1/banks/1/close
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

# Create bank account
curl -X POST http://localhost:8700/api/v1/banks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Account",
    "account_number": "9876543210",
    "account_holder": "Test Company",
    "bank_name": "Test Bank",
    "branch_id": 1,
    "opening_balance": 10000.00,
    "opening_date": "2026-01-01",
    "status": "active",
    "show_in_invoice": true
  }'

# Deposit
curl -X POST http://localhost:8700/api/v1/banks/1/deposit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000.00,
    "description": "Test deposit"
  }'

# Withdraw
curl -X POST http://localhost:8700/api/v1/banks/1/withdraw \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2000.00,
    "description": "Test withdrawal"
  }'

# Transfer
curl -X POST http://localhost:8700/api/v1/banks/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from_bank_id": 1,
    "to_bank_id": 2,
    "amount": 3000.00,
    "description": "Test transfer"
  }'

# Get transactions
curl -X GET http://localhost:8700/api/v1/banks/1/transactions \
  -H "Authorization: Bearer $TOKEN"

# List banks
curl -X GET http://localhost:8700/api/v1/banks?limit=50 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Related Documentation

- **ARCHITECTURE_AND_PATTERNS.md** - Design patterns followed
- **BACKEND_DEVELOPMENT_LOG.md** - Implementation details
- **bank.md** - Original feature plan

---

**Last Updated:** January 26, 2026  
**Maintained By:** Development Team  
**Status:** ✅ Production Ready
