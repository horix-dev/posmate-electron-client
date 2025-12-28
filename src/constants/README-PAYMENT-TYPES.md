# Payment Type Constants

## Overview

Provides utility functions and constants for working with payment types, particularly distinguishing between actual payment methods (Cash, Card, etc.) and credit/due payments.

## Usage

### Basic Checks

```typescript
import { isCreditPaymentType, isActualPayment } from '@/constants/payment-types'

// Check if payment is credit/due
const paymentType = { id: 5, name: 'Due', is_credit: true }
if (isCreditPaymentType(paymentType)) {
  console.log('This is a credit/due payment')
}

// Check if it's an actual payment method
if (isActualPayment(paymentType)) {
  console.log('This is a real payment method')
}
```

### Filtering Payment Methods

```typescript
import { getActualPaymentMethods, getCreditPaymentType } from '@/constants/payment-types'

// Get only actual payment methods (exclude Due/Credit)
const actualPayments = getActualPaymentMethods(allPaymentTypes)
// Returns: [Cash, Card, Cheque, Mobile Pay]

// Get the credit/due payment type
const creditPayment = getCreditPaymentType(allPaymentTypes)
// Returns: { id: 5, name: 'Due', is_credit: true }
```

### In POS Components

```typescript
import { requiresFullPayment } from '@/constants/payment-types'

function POSPayment({ selectedPaymentType, cartTotal }) {
  // Disable partial payment for non-credit payment types
  const canPayPartial = !requiresFullPayment(selectedPaymentType)
  
  return (
    <div>
      <input 
        type="number" 
        max={canPayPartial ? undefined : cartTotal}
        placeholder={canPayPartial ? 'Enter amount' : 'Full payment required'}
      />
    </div>
  )
}
```

## Available Functions

| Function | Description |
|----------|-------------|
| `isCreditPaymentType(paymentType)` | Check if payment type is credit/due |
| `isActualPayment(paymentType)` | Check if payment type is actual payment method |
| `getActualPaymentMethods(paymentTypes)` | Filter to only actual payment methods |
| `getCreditPaymentType(paymentTypes)` | Find the credit/due payment type |
| `requiresFullPayment(paymentType)` | Check if full payment is required |
| `getPaymentTypeLabel(paymentType)` | Get display label (i18n ready) |

## Backend Integration

The backend must include the `is_credit` field in the PaymentType response:

```json
{
  "id": 5,
  "name": "Due",
  "is_credit": true,
  "status": 1
}
```

This ensures:
- ✅ No hardcoded IDs or names
- ✅ Survives name changes/translations
- ✅ Clear business logic separation
- ✅ Works across all clients (web, mobile, desktop)
