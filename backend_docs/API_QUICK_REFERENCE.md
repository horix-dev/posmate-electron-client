# API Quick Reference - Print Labels & Updated Endpoints

## Print Labels API Quick Start

### Base URL
```
https://your-domain.com/api/v1/print-labels
```

### List Print Labels
```bash
GET /print-labels
GET /print-labels?limit=100
GET /print-labels?page=1&per_page=10
GET /print-labels?cursor=0&per_page=100
```

**Response:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 1,
      "name": "4x6 Shipping Label",
      "description": "Standard shipping label template",
      "barcode_type": "code128",
      "label_format": "4x6",
      "template_data": { ... },
      "status": 1,
      "created_at": "2025-12-20T10:00:00+00:00",
      "updated_at": "2025-12-20T10:00:00+00:00",
      "business_id": 1
    }
  ],
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

---

### Search & Filter
```bash
GET /print-labels/filter?search=shipping&barcode_type=code128&label_format=4x6&status=1&per_page=10
```

**Parameters:**
- `search` - Search in name and description
- `barcode_type` - Filter by barcode type
- `label_format` - Filter by label format
- `status` - Filter by status (0=inactive, 1=active)
- `per_page` - Items per page (default: 10)

---

### Create Print Label
```bash
POST /print-labels
Content-Type: application/json
Authorization: Bearer TOKEN

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

**Response (201 Created):**
```json
{
  "message": "Print label created successfully.",
  "data": { ... }
}
```

---

### Get Single Label
```bash
GET /print-labels/1
```

---

### Update Label
```bash
PUT /print-labels/1
Content-Type: application/json

{
  "name": "Updated Label Name",
  "barcode_type": "code39",
  "label_format": "3x5",
  "status": 1
}
```

---

### Toggle Status
```bash
PATCH /print-labels/1/status
Content-Type: application/json

{
  "status": 0
}
```

---

### Delete Label
```bash
DELETE /print-labels/1
```

---

### Bulk Delete
```bash
POST /print-labels/delete-all
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Selected print labels deleted successfully",
  "deleted_count": 5
}
```

---

### Config: Barcode Types, Label Formats, Printer Presets
```bash
GET /barcodes/config
GET /print-labels/config
```

**Response:**
```json
{
  "barcode_types": ["C39E+", "C93", "S25", "S25+", "I25", "I25+", "C128", "C128A", "C128B", "C128C", "EAN2", "EAN5", "EAN8", "EAN13"],
  "label_formats": ["2x1", "1.5x1", "2x1.25"],
  "printer_settings": [1, 2, 3]
}
```

**Supported Barcode Types:**
| Value | Description |
|-------|-------------|
| `C39E+` | Code 39 Extended |
| `C93` | Code 93 |
| `S25` | Standard 2 of 5 |
| `S25+` | Standard 2 of 5 Extended |
| `I25` | Interleaved 2 of 5 |
| `I25+` | Interleaved 2 of 5 Extended |
| `C128` | Code 128 (default, recommended) |
| `C128A` | Code 128-A |
| `C128B` | Code 128-B |
| `C128C` | Code 128-C |
| `EAN2` | EAN-2 |
| `EAN5` | EAN-5 |
| `EAN8` | EAN-8 |
| `EAN13` | EAN-13 |

**Label Formats & Paper Presets:**
| Format | Size | Details |
|--------|------|---------|
| `2x1` | Roll | 50mm × 25mm, Gap: 3.1mm |
| `1.5x1` | Roll | 38mm × 25mm, Gap: 3.1mm |
| `2x1.25` | Sheet | 28 per sheet, 8.27" × 11.69" |

**Printer Settings (barcode_setting):**
| Value | Paper Format | Dimensions |
|-------|-------------|------------|
| `1` | Roll 1.5"×1" | 38mm × 25mm, Gap 3.1mm |
| `2` | Roll 2"×1" | 50mm × 25mm, Gap 3.1mm |
| `3` | Sheet 28/page | 8.27" × 11.69" |

### Search Products (for label generation)
```bash
GET /print-labels/products?search=ACME
Authorization: Bearer TOKEN
```

---

### Generate Labels
```bash
POST /print-labels/generate
Content-Type: application/json
Authorization: Bearer TOKEN

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
- `barcode_setting` (required): Printer preset — `1`, `2`, or `3`
- `barcode_type` (optional): Barcode encoding — from config barcode_types
- `stock_ids` (required): Array of stock IDs (parallel to qty and preview_date)
- `qty` (required): Array of quantities ≥ 1 (copies per stock)
- `preview_date` (optional): Array of ISO 8601 dates or null
- `vat_type` (optional): Price calculation — `inclusive` or `exclusive`
- Visibility + size: `business_name`/`business_name_size`, `product_name`/`product_name_size`, `product_price`/`product_price_size`, `product_code`/`product_code_size`, `pack_date`/`pack_date_size` (sizes 8–48px)

**Response:**
```json
{
  "message": "Labels generated successfully.",
  "data": [
    {
      "barcode_svg": "data:image/png;base64,....",
      "packing_date": "2025-12-20",
      "product_name": "ACME Widget",
      "business_name": "ACME Corp",
      "product_code": "SKU-123",
      "product_price": 99.99,
      "product_stock": 50,
      "show_business_name": true,
      "business_name_size": 15,
      "show_product_name": true,
      "product_name_size": 15,
      "show_product_price": true,
      "product_price_size": 14,
      "show_product_code": true,
      "product_code_size": 14,
      "show_pack_date": true,
      "pack_date_size": 12
    }
  ],
  "printer": "1",
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

---

## Print Labels Workflow

1. **Get Configuration:** `GET /print-labels/config` retrieves barcode types, label formats, and printer presets
2. **Search Products:** `GET /print-labels/products?search=...` returns products with stocks (batch/lot info)
3. **Generate Labels:** `POST /print-labels/generate` with aligned arrays (stock_ids, qty, preview_date) and visibility toggles
4. **Render & Print:** Display `barcode_svg` images and respect visibility flags; output to printer using `barcode_setting`

---

## Updated Endpoints Reference

### Racks API
```
GET    /api/v1/racks
GET    /api/v1/racks/filter?search=...&status=...
POST   /api/v1/racks
GET    /api/v1/racks/{id}
PUT    /api/v1/racks/{id}
DELETE /api/v1/racks/{id}
PATCH  /api/v1/racks/{id}/status
POST   /api/v1/racks/delete-all
```

**Create Rack:**
```json
{
  "name": "Rack A1",
  "shelf_id": [1, 2, 3],
  "status": 1
}
```

---

### Shelves API
```
GET    /api/v1/shelves
GET    /api/v1/shelves/filter?search=...&status=...
POST   /api/v1/shelves
GET    /api/v1/shelves/{id}
PUT    /api/v1/shelves/{id}
DELETE /api/v1/shelves/{id}
PATCH  /api/v1/shelves/{id}/status
POST   /api/v1/shelves/delete-all
```

**Create Shelf:**
```json
{
  "name": "Shelf 1",
  "status": 1
}
```

---

### Product Models API
```
GET    /api/v1/product-models
GET    /api/v1/product-models/filter?search=...&status=...
POST   /api/v1/product-models
GET    /api/v1/product-models/{id}
PUT    /api/v1/product-models/{id}
DELETE /api/v1/product-models/{id}
PATCH  /api/v1/product-models/{id}/status
POST   /api/v1/product-models/delete-all
```

**Create Model:**
```json
{
  "name": "Model Name",
  "status": 1
}
```

---

### Brands API (Updated with icon support)
```
GET    /api/v1/brands
GET    /api/v1/brands/filter?search=...&status=...
POST   /api/v1/brands
GET    /api/v1/brands/{id}
PUT    /api/v1/brands/{id}
DELETE /api/v1/brands/{id}
PATCH  /api/v1/brands/{id}/status
POST   /api/v1/brands/delete-all
```

**Create Brand:**
```json
{
  "brandName": "Brand Name",
  "description": "Brand description",
  "icon": "file (multipart/form-data)",
  "status": 1
}
```

**Response includes:**
```json
{
  "icon": "http://domain.com/storage/brands/filename.jpg",
  ...
}
```

---

## Pagination Examples

### Example 1: Get first 100 records (flat array)
```bash
curl -X GET "http://api.example.com/print-labels?limit=100" \
  -H "Authorization: Bearer TOKEN"
```

### Example 2: Offset pagination (page 2, 10 per page)
```bash
curl -X GET "http://api.example.com/print-labels?page=2&per_page=10" \
  -H "Authorization: Bearer TOKEN"
```

### Example 3: Cursor pagination (for mobile sync)
```bash
curl -X GET "http://api.example.com/print-labels?cursor=0&per_page=100" \
  -H "Authorization: Bearer TOKEN"

# Response includes next_cursor for next batch
# If has_more=false, all records fetched
```

---

## Barcode Types

| Value | Description |
|-------|-------------|
| `C128` | Code 128 (default, recommended) |
| `C128A` | Code 128-A |
| `C128B` | Code 128-B |
| `C128C` | Code 128-C |
| `C39E+` | Code 39 Extended |
| `C93` | Code 93 |
| `EAN13` | EAN-13 (European) |
| `EAN8` | EAN-8 (European) |
| `EAN5` | EAN-5 |
| `EAN2` | EAN-2 |
| `S25` | Standard 2 of 5 |
| `S25+` | Standard 2 of 5 Extended |
| `I25` | Interleaved 2 of 5 |
| `I25+` | Interleaved 2 of 5 Extended |

---

## Label Formats (Printer Paper Settings)

| Value | Format | Details |
|-------|--------|----------|
| `2x1` | Roll Label | Size: 50mm × 25mm, Gap: 3.1mm |
| `1.5x1` | Roll Label | Size: 38mm × 25mm, Gap: 3.1mm |
| `2x1.25` | Sheet Label | 28 per sheet, Sheet: 8.27" × 11.69", Label: 2" × 1.25" |

---
## Printer Settings (Paper Presets)

When calling `/generate` endpoint, `barcode_setting` maps to label format:

| barcode_setting | Paper Format | Page Size |
|-----------------|--------------|-----------|
| `1` | Roll Label 1.5"×1" | 38mm × 25mm, Gap: 3.1mm |
| `2` | Roll Label 2"×1" | 50mm × 25mm, Gap: 3.1mm |
| `3` | Sheet Label 28 per page | 8.27" × 11.69" |

---
## Common Errors

| Code | Message | Solution |
|------|---------|----------|
| 400 | Validation failed | Check required fields and format |
| 403 | Unauthorized | Resource doesn't belong to your business |
| 404 | Not found | Resource ID doesn't exist |
| 422 | Duplicate name | Name already exists for this business |

---

## Status Values

| Value | Meaning |
|-------|---------|
| `1` | Active |
| `0` | Inactive |

---

## Headers

All requests must include:

```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
Accept: application/json
```

For file uploads (e.g., brand icons):

```
Authorization: Bearer YOUR_API_TOKEN
Content-Type: multipart/form-data
```

---

## Response Format

**Success (200/201):**
```json
{
  "message": "Operation successful",
  "data": { ... },
  "_server_timestamp": "2025-12-20T10:00:00+00:00"
}
```

**Error (4xx/5xx):**
```json
{
  "message": "Error description",
  "errors": { ... }
}
```

---

## Timestamps

All timestamps are in ISO 8601 format:
```
2025-12-20T10:00:00+00:00
```

---

## Version Info

- **API Version:** v1
- **Last Updated:** December 20, 2025
- **Documentation:** `/docs/API_UPDATES_DECEMBER_2025.md`
