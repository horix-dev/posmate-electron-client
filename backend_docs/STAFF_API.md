# Staff API Documentation

**Base URL:** `/api/v1`  
**Authentication:** All endpoints require `Authorization: Bearer {token}`

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all staff |
| POST | `/users` | Create a staff member |
| PUT | `/users/{id}` | Update a staff member |
| DELETE | `/users/{id}` | Delete a staff member |

> **Note:** The `/users` resource only manages `role = staff` accounts. Shop-owner accounts are not returned or affected.

---

## GET `/api/v1/users`

List all staff members belonging to the authenticated user's business.

**Behaviour:**
- Returns only users with `role = staff`
- Excludes the currently authenticated user
- If the caller is a `staff` user or has a `branch_id` / `active_branch_id`, results are filtered to that branch only

**Response `200 OK`:**
```json
{
  "message": "Data fetched successfully.",
  "data": [
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@store.com",
      "role": "staff",
      "business_id": 1,
      "branch_id": 1,
      "active_branch_id": null,
      "visibility": {
        "sales": { "create": "1", "view": "1" },
        "products": { "view": "1" }
      },
      "created_at": "2025-01-15T08:30:00.000000Z",
      "updated_at": "2025-03-01T12:00:00.000000Z",
      "branch": {
        "id": 1,
        "name": "Main Branch"
      }
    }
  ]
}
```

---

## POST `/api/v1/users`

Create a new staff member.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@store.com",
  "password": "pass1234",
  "visibility": {
    "sales": { "create": "1", "view": "1" }
  },
  "branch_id": 1
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `name` | required, string, max: 30 |
| `email` | required, valid email, unique across all users |
| `password` | required, min: 4, max: 15 |
| `visibility` | optional, JSON object for module permissions |
| `branch_id` | optional, must exist in `branches` table |

**Notes:**
- `role` is automatically set to `staff`
- `business_id` is taken from the authenticated user
- If `branch_id` is not provided, defaults to the authenticated user's `branch_id` or `active_branch_id`

**Response `200 OK`:**
```json
{
  "message": "Data saved successfully.",
  "data": {
    "id": 5,
    "name": "Jane Smith",
    "email": "jane@store.com",
    "role": "staff",
    "business_id": 1,
    "branch_id": 1,
    "visibility": {
      "sales": { "create": "1", "view": "1" }
    },
    "created_at": "2026-03-11T10:00:00.000000Z",
    "updated_at": "2026-03-11T10:00:00.000000Z"
  }
}
```

**Response `422 Unprocessable Entity` (validation failure):**
```json
{
  "message": "The email has already been taken.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

## PUT `/api/v1/users/{id}`

Update an existing staff member.

**URL Parameter:**  
`id` — integer, the staff user's ID

**Request Body:**
```json
{
  "name": "Jane Smith Updated",
  "email": "jane_new@store.com",
  "password": "newpass",
  "visibility": {
    "sales": { "create": "1", "view": "1", "delete": "0" }
  },
  "branch_id": 2
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `name` | required, string, max: 30 |
| `email` | required, valid email, unique except current user |
| `password` | optional, min: 4, max: 15 — omit to keep existing password |
| `visibility` | optional, JSON object for module permissions |
| `branch_id` | optional, must exist in `branches` table |

**Notes:**
- If `password` is omitted or `null`, the existing password is preserved
- If `branch_id` is not provided, defaults to the authenticated user's branch

**Response `200 OK`:**
```json
{
  "message": "Data saved successfully."
}
```

---

## DELETE `/api/v1/users/{id}`

Delete a staff member.

**URL Parameter:**  
`id` — integer, the staff user's ID

**Response `200 OK`:**
```json
{
  "message": "Data deleted successfully."
}
```

---

## `visibility` Field Structure

The `visibility` field is a JSON object that controls what actions a staff member can perform. Keys are module names and values are action maps.

```json
{
  "sales":     { "create": "1", "view": "1", "delete": "0" },
  "products":  { "view": "1", "create": "0" },
  "parties":   { "view": "1", "create": "1" },
  "purchases": { "view": "0", "create": "0" },
  "reports":   { "view": "1" }
}
```

- `"1"` — permission granted  
- `"0"` — permission denied  
- Omitted key — treated as denied

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `401 Unauthorized` | Missing or invalid bearer token |
| `404 Not Found` | Staff user with given ID not found |
| `422 Unprocessable Entity` | Validation failed (see `errors` object) |
