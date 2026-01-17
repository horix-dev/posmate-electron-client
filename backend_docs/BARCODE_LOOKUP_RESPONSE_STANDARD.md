# Barcode Lookup Response Standard (Backend Change Request)

## Overview
Standardize the response for barcode lookups so the frontend can reliably add items to cart without guessing stock or variant context. This aligns `/api/v1/products/by-barcode/{barcode}` and `/api/v1/variants/by-barcode/{barcode}` under a single, explicit schema.

## Endpoints
- GET `/api/v1/products/by-barcode/{barcode}` — Universal lookup across products, variants, and batches.
- GET `/api/v1/variants/by-barcode/{barcode}` — Direct variant lookup by barcode (optional; may delegate to the universal endpoint).

## Canonical Response Schema
Always include the `product` and the resolved `stock`. Include `variant` when applicable.

```json
{
  "message": "Data fetched successfully.",
  "data": {
    "found_in": "product" | "variant" | "batch",
    "product": { /* Product */ },
    "stock": { /* Stock */ },
    "variant": { /* Variant */ } // present only when found_in === "variant"
  }
}
```

### Field Requirements
- `product`: Full product object (includes `stocks`, `variants` arrays as available).
- `stock`: The specific stock row resolved by the barcode (never omitted). For `found_in = product`, choose the appropriate stock row (see selection rules below).
- `variant`: Provided only when the barcode matched a variant; should include `id`, `sku`, `variant_name` (if available), pricing flags.

### Stock Selection Rules (for found_in = product)
If a product barcode resolves a simple product, choose the stock row:
- Prefer stock from the current branch/warehouse if multi-warehouse.
- Otherwise, choose the most recent `created_at` or the default/primary stock row.
- Do not require the frontend to infer by taking the first item.

## Status Codes
- 200 with `data` populated when found.
- 200 with `data: null` and `message: "Not found"` when not found (prefer consistent 200 for POS scanning to avoid error interrupts), OR use `404` with a clear message — pick one approach and apply consistently.

## Examples

### Found in product (simple)
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "found_in": "product",
    "product": { "id": 17, "productName": "Example", "product_type": "simple", ... },
    "stock": { "id": 22, "product_id": 17, "productStock": 60, "productSalePrice": 1200, ... }
  }
}
```

### Found in variant (variable)
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "found_in": "variant",
    "product": { "id": 101, "product_type": "variable", ... },
    "variant": { "id": 555, "sku": "SKU-555", "variant_name": "Red / XL", ... },
    "stock": { "id": 333, "product_id": 101, "variant_id": 555, "productSalePrice": 1499, ... }
  }
}
```

### Found in batch
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "found_in": "batch",
    "product": { "id": 88, "product_type": "simple", ... },
    "stock": { "id": 77, "product_id": 88, "batch_no": "BATCH-001", "productSalePrice": 999, ... }
  }
}
```

### Not found (consistent approach)
Option A (recommended for POS):
```json
{ "message": "Not found", "data": null }
```
Option B:
```json
{ "message": "Not found" }
```
with HTTP 404.

## Rationale
- Eliminates frontend inference of `stock` and `variant`.
- Consistent contract simplifies offline cache, sync, and POS scanning logic.
- Matches prior documentation in `API_ALIGNMENT_ANALYSIS.md` and avoids divergence between environments.

## Migration Notes
- Maintain current response for one minor version while adding the canonical shape.
- Feature-flag via header `Accept: application/vnd.posmate.barcode.v2+json` if gradual rollout is needed.
- After rollout, deprecate legacy top-level `type` without `stock`.

## Frontend Impact
- The POS `handleBarcodeScan()` can directly add to cart using returned `product`, `stock`, and optional `variant`.
- Remove code that guesses the first stock.
- Keep current workaround until backend change is live, then simplify to the canonical shape.
