# Loyalty Frontend Implementation Guide

## 1) Purpose
This document defines the full loyalty API usage and frontend feature scope for the current backend implementation.

Use this for:
- POS loyalty integration (lookup, redeem, earn)
- Customer loyalty profile UI
- Loyalty settings UI
- Admin adjustment and transaction history

---

## 2) Base API Rules

- Base path: `/api/v1`
- Auth: `Authorization: Bearer {token}` required on all loyalty and sales endpoints
- Tenant scope: all results are automatically scoped by authenticated `business_id`
- Timestamps: ISO8601

---

## 3) Loyalty API Endpoints (Implemented)

## 3.1 Customer Lookup by Phone/Card

### `GET /api/v1/loyalty/customers/lookup`

Query params:
- `phone` (optional, required if `card_code` missing)
- `card_code` (optional, required if `phone` missing)

Success `200`:
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "id": 12,
    "name": "John Doe",
    "phone": "01700000001",
    "type": "Retailer",
    "loyalty_points": 55,
    "loyalty_card_code": "LP-1-AAA111",
    "loyalty_tier": null
  }
}
```

Not found `404`:
```json
{
  "message": "Customer not found.",
  "data": null
}
```

Frontend usage:
- Phone search input
- Manual card code input fallback
- Customer attach to current cart/session

---

## 3.2 Quick Barcode Card Lookup (Scanner Path)

### `GET /api/v1/loyalty/quick-card/{cardCode}`

Use when barcode scanner writes full loyalty card code string.

Success `200`: same data shape as lookup endpoint.

Not found `404`: same error shape as lookup endpoint.

Frontend usage:
- POS scanner flow: auto-hit endpoint on scan complete
- If not found, prompt phone search or create customer flow (if your product allows)

---

## 3.3 Assign Loyalty Card to Customer

### `POST /api/v1/loyalty/customers/{party}/assign-card`

Body:
```json
{
  "card_code": "LP-1-MANUAL001"
}
```

Notes:
- `card_code` optional.
- If omitted, backend auto-generates a unique card code for that business.

Success `200`:
```json
{
  "message": "Loyalty card assigned successfully.",
  "data": {
    "id": 12,
    "name": "John Doe",
    "loyalty_card_code": "LP-1-AUTOGEN123",
    "loyalty_points": 55
  }
}
```

Validation/permission:
- Duplicate card code in same business returns validation error.
- Cross-business access returns `403`.

Frontend usage:
- Customer profile > Assign/Regenerate card button
- Optional manual code entry field

---

## 3.4 Customer Loyalty Transactions

### `GET /api/v1/loyalty/customers/{party}/transactions?per_page=20&page=1`

Success `200`:
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 10,
      "business_id": 1,
      "party_id": 12,
      "sale_id": 220,
      "sale_return_id": null,
      "type": "earn",
      "points": 5,
      "balance_before": 50,
      "balance_after": 55,
      "reference_type": "sale",
      "reference_id": 220,
      "reason": "Points earned from sale",
      "metadata": {"sale_id": 220},
      "created_by": 3,
      "client_reference": "sale:220:earn",
      "created_at": "2026-02-18T10:00:00Z",
      "updated_at": "2026-02-18T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "per_page": 20,
    "current_page": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

Frontend usage:
- Customer profile > Loyalty history tab
- Filter chips by `type` in client-side view (earn/redeem/reverse/adjustment)

---

## 3.5 Manual Loyalty Adjustment (Admin)

### `POST /api/v1/loyalty/customers/{party}/adjust`

Body:
```json
{
  "points": -20,
  "reason": "Manual correction"
}
```

Success `200`: returns one transaction resource.

Permission:
- Allowed role: `shop-owner`
- Non-authorized role returns `403` with message `Forbidden.`

Frontend usage:
- Admin-only action in customer loyalty panel
- Show signed number input (+/-)
- Always require reason in frontend UX (backend keeps reason optional)

---

## 3.6 Loyalty Settings Get/Update

### `GET /api/v1/loyalty/settings`

Returns merged settings (business row or config defaults):
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "enabled": true,
    "earn_mode": "amount_based",
    "earn_value": 100,
    "minimum_sale_amount": 0,
    "exclude_due_sales": false,
    "exclude_discounted_amount": false,
    "redeem_enabled": true,
    "redeem_mode": "points_to_currency",
    "point_value": 1,
    "min_points_to_redeem": 0,
    "max_redeem_percent_of_bill": 100,
    "allow_partial_redeem": true,
    "rounding_rule": "floor",
    "expiry_enabled": false,
    "expiry_days": null,
    "meta": null
  }
}
```

### `PUT /api/v1/loyalty/settings`

Body (full payload recommended):
```json
{
  "enabled": true,
  "earn_mode": "amount_based",
  "earn_value": 100,
  "minimum_sale_amount": 200,
  "exclude_due_sales": true,
  "exclude_discounted_amount": false,
  "redeem_enabled": true,
  "redeem_mode": "points_to_currency",
  "point_value": 1,
  "min_points_to_redeem": 50,
  "max_redeem_percent_of_bill": 40,
  "allow_partial_redeem": true,
  "rounding_rule": "floor",
  "expiry_enabled": false,
  "expiry_days": null,
  "meta": {
    "notes": "optional frontend extras"
  }
}
```

Validation highlights:
- `earn_mode`: `amount_based | percentage_based`
- `redeem_mode`: `points_to_currency | percentage_cap`
- `rounding_rule`: `floor | round | ceil`
- `max_redeem_percent_of_bill`: `0..100`

Permission:
- Allowed role: `shop-owner`

Frontend usage:
- Dedicated settings page with grouped sections:
  - Enable/disable
  - Earn rules
  - Redeem rules
  - Expiry

---

## 4) Sales API Loyalty Integration

Loyalty is integrated into existing sales create/update responses.

## 4.1 Create Sale

### `POST /api/v1/sales`

New optional request fields:
- `customer_phone`
- `loyalty_card_code`
- `loyalty_redeem_points`
- `loyalty_redeem_amount` (optional hint; backend recalculates)

Backend behavior:
- Identifies customer by `party_id`, else by `loyalty_card_code`, else by `customer_phone`
- Redeem applies first (if requested and valid)
- Earn applies after sale created
- Loyalty summary is written to sale `meta`

Common validation error example (`422`):
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "loyalty_redeem_points": [
      "Redeem requires an identified customer."
    ]
  }
}
```

## 4.2 Update Sale

### `PUT /api/v1/sales/{id}`

Supports same loyalty fields.

Backend behavior:
- Reverses prior loyalty effects for this sale
- Recomputes based on new payload
- Applies fresh redeem/earn entries

## 4.3 Sale Response Loyalty Block

`SaleResource` includes:
```json
"loyalty": {
  "party_id": 12,
  "card_code": "LP-1-AAA111",
  "earned_points": 15,
  "redeemed_points": 30,
  "redeem_amount": 30,
  "balance_after": 420
}
```

Also in `sale.party`:
- `loyalty_points`
- `loyalty_card_code`
- `loyalty_tier`

Frontend usage:
- POS receipt summary
- Post-payment success toast (e.g., `+15 points earned`)
- Sale detail screen loyalty panel

---

## 5) Party API Loyalty Fields

Existing party APIs now support loyalty fields in create/update payload:
- `loyalty_card_code`
- `loyalty_tier`

Use with:
- `POST /api/v1/parties`
- `PUT /api/v1/parties/{id}`

Frontend usage:
- Customer create/edit form
- Optional loyalty tier selector (if business uses tier logic)

---

## 6) Offline/Sync Impact for Frontend

Offline batch sale sync path applies loyalty logic too.

Recommendations for frontend POS clients:
- Include loyalty request data in offline queued sale payload:
  - `customer_phone`
  - `loyalty_card_code`
  - `loyalty_redeem_points`
- Preserve sale `meta.loyalty` values from server response for audit display.
- Keep idempotency key usage in sync batch requests to avoid duplicate operations.

---

## 7) Frontend Features to Implement

## 7.1 POS Checkout Features

1. Customer identify block
   - Search by phone
   - Scan loyalty card barcode
   - Attach customer to cart

2. Loyalty balance panel
   - Show current points
   - Show estimated earn points (calculated client-side for UX only)
   - Show effective server-calculated values after save

3. Redeem UI
   - Input `loyalty_redeem_points`
   - Live estimate of redeem amount
   - Guardrails (disable when no customer or no points)

4. Sale submit handling
   - Pass loyalty fields in sales payload
   - Show final returned `loyalty` block from sale response

## 7.2 Customer Profile Features

1. Loyalty card
   - Assign card
   - Regenerate card (call assign without card code)

2. Loyalty history
   - Paginated transaction table
   - Type badge (earn/redeem/reverse/adjustment)

3. Manual adjustment (admin only)
   - Signed points input
   - Reason input

## 7.3 Loyalty Settings Features

1. Settings form sections
   - General enable
   - Earn settings
   - Redeem settings
   - Expiry settings

2. Validation UX
   - Map backend validation errors per field
   - Keep submit disabled when invalid locally

3. Role gating
   - Only `shop-owner` can edit settings/adjust points

---

## 8) Suggested Frontend Data Models

```ts
export interface LoyaltySummary {
  party_id: number | null;
  card_code: string | null;
  earned_points: number;
  redeemed_points: number;
  redeem_amount: number;
  balance_after: number | null;
}

export interface LoyaltyCustomer {
  id: number;
  name: string;
  phone: string | null;
  type: string;
  loyalty_points: number;
  loyalty_card_code: string | null;
  loyalty_tier: string | null;
}

export interface LoyaltySettings {
  enabled: boolean;
  earn_mode: "amount_based" | "percentage_based";
  earn_value: number;
  minimum_sale_amount: number;
  exclude_due_sales: boolean;
  exclude_discounted_amount: boolean;
  redeem_enabled: boolean;
  redeem_mode: "points_to_currency" | "percentage_cap";
  point_value: number;
  min_points_to_redeem: number;
  max_redeem_percent_of_bill: number;
  allow_partial_redeem: boolean;
  rounding_rule: "floor" | "round" | "ceil";
  expiry_enabled: boolean;
  expiry_days: number | null;
  meta?: Record<string, unknown> | null;
}
```

---

## 9) UX Error Handling Matrix

- `404 Customer not found` on lookup/quick-card
  - Show: `Customer not found`
  - Action: allow retry by phone/card

- `403 Forbidden` on adjust/settings update
  - Show: `You do not have permission`
  - Action: hide restricted controls by role

- `422 Validation` on redeem/sales/settings
  - Show field-specific errors from `errors` object

- `500` unexpected
  - Show generic error toast + retry option

---

## 10) Frontend Delivery Checklist

- [ ] POS: phone lookup integrated
- [ ] POS: barcode quick-card integrated
- [ ] POS: redeem points input + payload wiring
- [ ] POS: sale loyalty summary shown after save
- [ ] Customer: assign/regenerate card action
- [ ] Customer: loyalty history table + pagination
- [ ] Admin: manual adjustment action
- [ ] Settings: get/update screen completed
- [ ] Role-based visibility for admin-only features
- [ ] Offline queue includes loyalty fields

---

## 11) Optional Next Enhancements (Frontend)

- Printable loyalty card with barcode/QR
- Redeem preview calculator widget
- Loyalty transaction export CSV
- Loyalty analytics dashboard (top earners/redeemers)
