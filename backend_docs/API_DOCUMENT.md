# API Documentation - December 20, 2025 Updates

## Overview
This document details all API updates and new endpoints added on December 20, 2025, including the Print Labels API and refactored service architecture.

---

## Architecture Pattern

All APIs now follow a consistent **Service-Controller-Resource** pattern:

```
Request → Controller (auth + validation) → Service (business logic) → Model → Database
Response ← Resource (transformation) ← Controller ← Service ← Model
```

### Key Components

1. **Service Layer** (`app/Services/`)
   - Handles flexible pagination (cursor/offset/limit)
   - Contains business logic
   - Manages filtering and data transformation
   - Handles icon uploads where applicable

2. **Resource Transformer** (`app/Http/Resources/`)
   - Transforms model data to API response format
   - Handles date formatting (ISO8601)
   - Manages asset paths (e.g., storage URLs)

3. **Controller** (`app/Http/Controllers/Api/`)
   - Request validation
   - Authorization checks
   - Delegates to service
   - Returns consistent response format

---

## Flexible Pagination System

All list endpoints support three pagination modes via query parameters:

### 1. **Default Mode** (No parameters)
Returns up to 1000 records as flat array.

```bash
GET /api/v1/print-labels
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

### 2. **Limit Mode** (?limit=N)
Returns first N records (max 1000) as flat array.

```bash
GET /api/v1/print-labels?limit=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

### 3. **Offset Pagination** (?page=1&per_page=10)
Standard Laravel pagination with total count.

```bash
GET /api/v1/print-labels?page=1&per_page=10
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": {
    "current_page": 1,
    "data": [...],
    "total": 256,
    "per_page": 10,
    "last_page": 26
  },
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

### 4. **Cursor Pagination** (?cursor=0&per_page=100)
For efficient mobile sync and large datasets.

```bash
GET /api/v1/print-labels?cursor=0&per_page=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [...],
  "pagination": {
    "next_cursor": 123,
    "has_more": true,
    "count": 100,
    "per_page": 100
  },
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

---

## Standard CRUD Operations

All refactored endpoints follow this pattern:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/resource` | List with flexible pagination |
| GET | `/resource/filter` | Search/filter with pagination |
| POST | `/resource` | Create new record |
| GET | `/resource/{id}` | Get single record |
| PUT/PATCH | `/resource/{id}` | Update record |
| DELETE | `/resource/{id}` | Delete single record |
| PATCH | `/resource/{id}/status` | Toggle active/inactive status |
| POST | `/resource/delete-all` | Bulk delete multiple records |

---

## New: Print Labels API

### Endpoints

```
GET    /api/v1/print-labels                    - List all print labels
GET    /api/v1/print-labels/filter             - Search & filter
POST   /api/v1/print-labels                    - Create new label
GET    /api/v1/print-labels/{id}               - Get single label
PUT    /api/v1/print-labels/{id}               - Update label
DELETE /api/v1/print-labels/{id}               - Delete label
PATCH  /api/v1/print-labels/{id}/status        - Toggle status
POST   /api/v1/print-labels/delete-all         - Bulk delete
GET    /api/v1/print-labels/config             - List barcode types + label formats (+ printer presets)
GET    /api/v1/print-labels/products           - Quick product search (for label generation)
POST   /api/v1/print-labels/generate           - Generate printable labels payload
GET    /api/v1/barcodes/config                 - Barcode types + printer presets (global)
```

### Data Model

```json
{
  "id": 1,
  "name": "4x6 Shipping Label",
  "description": "Standard shipping label template",
  "barcode_type": "code128",
  "label_format": "4x6",
  "template_data": {
    "show_product_name": true,
    "show_business_name": true,
    "show_product_price": true,
    "show_product_code": true,
    "show_pack_date": true
  },
  "status": 1,
  "created_at": "2025-12-20T10:00:00+00:00",
  "updated_at": "2025-12-20T10:00:00+00:00",
  "business_id": 1
}
```

### Supported Values

**Barcode Types:**
- `C39E+`
- `C93`
- `S25`
- `S25+`
- `I25`
- `I25+`
- `C128` (default)
- `C128A`
- `C128B`
- `C128C`
- `EAN2`
- `EAN5`
- `EAN8`
- `EAN13`

**Label Formats (Printer Paper Settings):**
- `2x1` - Roll Label, 50mmx25mm, Gap: 3.1mm
- `1.5x1` - Roll Label, 38mmx25mm, Gap: 3.1mm
- `2x1.25` - 28 Labels Per Sheet, Sheet Size: 8.27" × 11.69"

**Printer Presets:**
- `1`
- `2`
- `3`

### Endpoints Detail

#### Create Print Label
```bash
POST /api/v1/print-labels

{
  "name": "4x6 Shipping Label",
  "description": "Standard shipping label",
  "barcode_type": "code128",
  "label_format": "4x6",
  "template_data": {
    "show_product_name": true,
    "show_business_name": true,
    "show_product_price": true,
    "show_product_code": true,
    "show_pack_date": true
  },
  "status": 1
}
```

#### Filter Print Labels
```bash
GET /api/v1/print-labels/filter?search=shipping&barcode_type=code128&label_format=4x6&per_page=10
```

#### Update Status
```bash
PATCH /api/v1/print-labels/1/status

{
  "status": 0
}
```

#### Bulk Delete
```bash
POST /api/v1/print-labels/delete-all

{
  "ids": [1, 2, 3]
}
```

#### Config (barcode types, label formats, printer presets)
```bash
GET /api/v1/print-labels/config
GET /api/v1/barcodes/config
```

**Response:**
```json
{
  "barcode_types": ["C39E+", "C93", "S25", "S25+", "I25", "I25+", "C128", "C128A", "C128B", "C128C", "EAN2", "EAN5", "EAN8", "EAN13"],
  "label_formats": ["2x1", "1.5x1", "2x1.25"],
  "printer_settings": [1, 2, 3]
}
```

#### Search Products (for label generation)
```bash
GET /api/v1/print-labels/products?search=ACME
```

---

## Complete Barcode Generation Workflow

### Step 1: Get Available Options
```bash
GET /api/v1/print-labels/config
```

Returns all barcode types, label formats, and printer presets available for your system.

### Step 2: Search Products
```bash
GET /api/v1/print-labels/products?search=ACME
```

Returns products matching search, including stock entries (batch/lot details).

### Step 3: Generate Labels
```bash
POST /api/v1/print-labels/generate
```

Takes selected stocks, generates barcode images and payload with visibility controls.

**Key Points:**
- Arrays `stock_ids[]`, `qty[]`, `preview_date[]` must be parallel (same index = same item)
- `qty` array values must be ≥ 1 (number of label copies per stock)
- Each `stock_id` + `qty` combination creates N label copies in response
- `barcode_setting` (1/2/3) determines paper preset on printer
- Visibility toggles (`product_name`, `business_name`, etc.) control what appears on label
- Font sizes must be 8–48 pixels
- `vat_type` affects `product_price` calculation (includes/excludes tax)
- Response includes raw barcode SVG (base64) for client rendering

### Step 4: Save Template (Optional)
```bash
POST /api/v1/print-labels
```

To reuse label configuration, save as template with `template_data` containing visibility/size settings.

---
```bash
POST /api/v1/print-labels/generate
Content-Type: application/json

{
  "barcode_setting": "1",
  "barcode_type": "C128",
  "stock_ids": [101, 102],
  "qty": [2, 1],
  "preview_date": ["2025-12-20", null],
  "vat_type": "inclusive",
  "business_name": true,
  "business_name_size": 15,
  "product_name": true,
  "product_name_size": 15,
  "product_price": true,
  "product_price_size": 14,
  "product_code": true,
  "product_code_size": 14,
  "pack_date": true,
  "pack_date_size": 12
}
```

**Request Parameters:**
- `barcode_setting` (required): Printer paper preset - `1`, `2`, or `3`
  - `1` - Roll Label 1.5"×1" (38mm×25mm, Gap: 3.1mm)
  - `2` - Roll Label 2"×1" (50mm×25mm, Gap: 3.1mm)
  - `3` - Sheet Label 28 per sheet (8.27" × 11.69", Label: 2" × 1.25")
- `barcode_type` (optional): Barcode encoding standard
- `stock_ids` (required): Array of stock record IDs to generate labels for
- `qty` (required): Array of quantities for each stock (parallel to stock_ids)
- `preview_date` (optional): Array of packing dates for each stock (ISO format or null)
- `vat_type` (optional): Price calculation method - `inclusive` or `exclusive`
- `business_name` (optional): Show/hide business name - boolean
- `business_name_size` (optional): Font size 8–48
- `product_name` (optional): Show/hide product name - boolean
- `product_name_size` (optional): Font size 8–48
- `product_price` (optional): Show/hide product price - boolean
- `product_price_size` (optional): Font size 8–48
- `product_code` (optional): Show/hide product code - boolean
- `product_code_size` (optional): Font size 8–48
- `pack_date` (optional): Show/hide packing date - boolean
- `pack_date_size` (optional): Font size 8–48

---

## Refactored APIs (December 20, 2025)

### Racks API
**Files Updated:**
- Service: `app/Services/RackService.php` ✅
- Resource: `app/Http/Resources/RackResource.php` ✅
- Controller: `app/Http/Controllers/Api/RackController.php` ✅

**Improvements:**
- Flexible pagination (cursor/offset/limit)
- Service layer for business logic
- Resource transformation
- Authorization checks (business_id)
- Status toggle & bulk delete
- Shelf relationship loading

**Endpoints:**
```
GET    /api/v1/racks
GET    /api/v1/racks/filter
POST   /api/v1/racks
GET    /api/v1/racks/{id}
PUT    /api/v1/racks/{id}
DELETE /api/v1/racks/{id}
PATCH  /api/v1/racks/{id}/status
POST   /api/v1/racks/delete-all
```

---

### Shelves API
**Files Updated:**
- Service: `app/Services/ShelfService.php` ✅
- Resource: `app/Http/Resources/ShelfResource.php` ✅
- Controller: `app/Http/Controllers/Api/ShelfController.php` ⏳ (Pending)

**Improvements:**
- Same architecture as Racks API
- Relationship with Racks

**Endpoints:**
```
GET    /api/v1/shelves
GET    /api/v1/shelves/filter
POST   /api/v1/shelves
GET    /api/v1/shelves/{id}
PUT    /api/v1/shelves/{id}
DELETE /api/v1/shelves/{id}
PATCH  /api/v1/shelves/{id}/status
POST   /api/v1/shelves/delete-all
```

---

### Product Models API
**Files Updated:**
- Service: `app/Services/ProductModelService.php` ✅
- Resource: `app/Http/Resources/ProductModelResource.php` ✅
- Controller: `app/Http/Controllers/Api/ProducModelController.php` ✅

**Improvements:**
- Flexible pagination (cursor/offset/limit)
- Service layer integration
- Resource transformation
- Authorization checks
- Status toggle & bulk delete

**Endpoints:**
```
GET    /api/v1/product-models
GET    /api/v1/product-models/filter
POST   /api/v1/product-models
GET    /api/v1/product-models/{id}
PUT    /api/v1/product-models/{id}
DELETE /api/v1/product-models/{id}
PATCH  /api/v1/product-models/{id}/status
POST   /api/v1/product-models/delete-all
```

---

### Brands API
**Files Updated:**
- Service: `app/Services/BrandService.php` ✅
- Resource: `app/Http/Resources/BrandResource.php` ✅
- Controller: `app/Http/Controllers/Api/AcnooBrandController.php` ✅

**Features:**
- Icon upload/deletion handling
- Description & icon fields
- All standard operations

**Endpoints:**
```
GET    /api/v1/brands
GET    /api/v1/brands/filter
POST   /api/v1/brands
GET    /api/v1/brands/{id}
PUT    /api/v1/brands/{id}
DELETE /api/v1/brands/{id}
PATCH  /api/v1/brands/{id}/status
POST   /api/v1/brands/delete-all
```

---

### Categories API
**Status:** ✅ Complete

**Endpoints:**
```
GET    /api/v1/categories
GET    /api/v1/categories/filter
GET    /api/v1/categories/paginated
POST   /api/v1/categories
GET    /api/v1/categories/{id}
PUT    /api/v1/categories/{id}
DELETE /api/v1/categories/{id}
PATCH  /api/v1/categories/{id}/status
POST   /api/v1/categories/delete-all
```

---

### Units API
**Status:** ✅ Complete

**Endpoints:**
```
GET    /api/v1/units
GET    /api/v1/units/filter
POST   /api/v1/units
PUT    /api/v1/units/{id}
DELETE /api/v1/units/{id}
PATCH  /api/v1/units/{id}/status
POST   /api/v1/units/delete-all
```

---

## Authorization Pattern

All endpoints check authorization at the controller level:

```php
// Check if resource belongs to user's business
if ($resource->business_id !== auth()->user()->business_id) {
    return response()->json([
        'message' => __('Unauthorized.'),
    ], 403);
}
```

---

## Error Handling

### Validation Errors
```json
{
  "message": "Validation failed",
  "errors": {
    "name": ["The name field is required"],
    "barcode_type": ["The barcode_type must be one of: code128, code39, ean13..."]
  }
}
```

### Not Found
```json
{
  "message": "Resource not found",
  "status": 404
}
```

### Unauthorized
```json
{
  "message": "Unauthorized.",
  "status": 403
}
```

---

## Summary of Changes

| Component | Status | Files Modified |
|-----------|--------|-----------------|
| Print Labels API | ✅ New | 5 files created |
| Racks API | ✅ Refactored | 3 files updated |
| Shelves API | ✅ Service Created | 2 files created, Controller ⏳ |
| Product Models API | ✅ Refactored | 3 files created |
| Brands API | ✅ Refactored | 2 fields added |
| Categories API | ✅ Complete | - |
| Units API | ✅ Complete | - |

---

## Migration Required

Run database migration to create print_labels table:

```bash
php artisan migrate
```

---

## Testing

All endpoints support the same testing pattern:

```bash
# List with cursor pagination
curl -X GET "http://localhost:8000/api/v1/print-labels?cursor=0&per_page=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search & filter
curl -X GET "http://localhost:8000/api/v1/print-labels/filter?search=shipping&status=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create
curl -X POST "http://localhost:8000/api/v1/print-labels" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "4x6 Label",
    "barcode_type": "code128",
    "label_format": "4x6",
    "status": 1
  }'

# Update status
curl -X PATCH "http://localhost:8000/api/v1/print-labels/1/status" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": 0}'

# Bulk delete
curl -X POST "http://localhost:8000/api/v1/print-labels/delete-all" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids": [1, 2, 3]}'
```

---

## Next Steps

- [ ] Complete ShelfController refactoring
- [ ] Update UnitService to add version & deleted_at support
- [ ] Add Print Labels generation API endpoint
- [ ] Create comprehensive API test suite
- [ ] Document offline sync requirements
