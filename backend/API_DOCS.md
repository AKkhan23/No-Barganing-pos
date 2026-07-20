# No Bargaining POS — Complete API Documentation

**Base URL:** `https://<your-domain>/api`  
**Auth:** Bearer token in `Authorization: Bearer <token>` header  
**Swagger UI:** `GET /api/docs`  
**Health:** `GET /api/health` → `{ ok: true, mongo: "connected", uptime: 123.45 }`  
**Info:** `GET /api` → `{ service: "No Bargaining POS", ok: true }`

---

## Authentication

### POST /api/auth/login
Login with email & password.

**Request Body:**
```json
{
  "email": "admin@nobargaining.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "admin@nobargaining.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Error Responses:**
- `401` — `{ "detail": "Invalid email or password" }`
- `403` — `{ "detail": "Account is inactive" }`

---

### GET /api/auth/me
Get current authenticated user info. (JWT required)

**Response (200):**
```json
{
  "id": "usr_abc123",
  "email": "admin@nobargaining.com",
  "name": "Admin User",
  "role": "admin"
}
```

---

## Users

### GET /api/users
List all users. (admin only)

**Response (200):**
```json
[
  {
    "id": "usr_001",
    "email": "admin@nobargaining.com",
    "name": "Admin User",
    "role": "admin",
    "active": true,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### POST /api/users
Create a new user. (admin only)

**Request Body:**
```json
{
  "email": "cashier@store.com",
  "name": "Cashier Name",
  "role": "cashier",
  "password": "password123"
}
```

**Success Response (201):**
```json
{
  "id": "usr_002",
  "email": "cashier@store.com",
  "name": "Cashier Name",
  "role": "cashier",
  "active": true,
  "created_at": "2025-06-15T10:30:00.000Z"
}
```

**Error Responses:**
- `409` — `{ "detail": "Email already exists" }`
- `422` — Zod validation error

---

### PATCH /api/users/:id
Update a user. (admin only)

**Request Body:** (all optional)
```json
{
  "name": "Updated Name",
  "role": "manager",
  "active": true,
  "password": "newpass123"
}
```

**Error:** `404` — `{ "detail": "User not found" }`

---

### DELETE /api/users/:id
Delete a user. (admin only, cannot delete self)

**Error:** `400` — `{ "detail": "Cannot delete yourself" }`

---

### GET /api/users/profile
Get own profile. (JWT required)

---

### PATCH /api/users/profile
Update own profile. (JWT required)

**Request Body:** (all optional)
```json
{
  "name": "New Name",
  "email": "new@email.com",
  "phone": "9876543210"
}
```

---

### POST /api/users/change-password
Change own password. (JWT required)

**Request Body:**
```json
{
  "current_password": "oldpass",
  "new_password": "newpass123"
}
```

---

### PATCH /api/users/:id/security
Set security question/answer. (admin only)

**Request Body:**
```json
{
  "security_question": "What is your pet's name?",
  "security_answer": "Fluffy"
}
```

---

### POST /api/users/verify-security
Verify security answer. (public, no auth)

**Request Body:**
```json
{
  "user_id": "usr_001",
  "answer": "Fluffy"
}
```

**Error:** `400` — `{ "detail": "Incorrect answer" }`

---

## Products

### GET /api/products
List products. Roles: admin, manager, cashier.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search by name, SKU, or barcode |
| `category` | string | Filter by category name |
| `low_stock` | bool | `"true"` to show only low-stock products |
| `limit` | number | Max results (default 200) |

**Response (200):**
```json
[
  {
    "id": "prod_001",
    "name": "Basmati Rice 5kg",
    "sku": "RICE-001",
    "barcode": "8901234567890",
    "category": "Groceries",
    "price": 550,
    "cost": 480,
    "tax_rate": 5,
    "stock": 100,
    "low_stock_threshold": 10,
    "unit": "kg",
    "sell_by": "kg",
    "brand": "BrandName",
    "rack": "Aisle-3",
    "variant_group_id": null,
    "variant_name": null,
    "repack_parent_id": null,
    "active": true,
    "sold_today": 5,
    "revenue_today": 2750,
    "created_at": "2025-01-15T00:00:00.000Z",
    "updated_at": "2025-06-15T12:00:00.000Z"
  }
]
```

---

### GET /api/products/barcode/:code
Find product by barcode or SKU. Supports EAN-13 check digit handling.

**Response (200):** Same as single product object.  
**Error (404):**
```json
{
  "detail": "Product not found",
  "scanned": "890123456789",
  "computed_ean13": "8901234567890"
}
```

---

### GET /api/products/:id
Get single product by ID.

---

### GET /api/products/:id/variants
Get all variants sharing the same `variant_group_id`.

---

### POST /api/products
Create a product with optional variants. Roles: admin, manager.

**Request Body:**
```json
{
  "name": "Premium Tea",
  "sku": "TEA-001",
  "barcode": "8909876543210",
  "category": "Beverages",
  "price": 250,
  "cost": 180,
  "tax_rate": 5,
  "stock": 200,
  "low_stock_threshold": 20,
  "unit": "pcs",
  "sell_by": "pcs",
  "brand": "Tata Tea",
  "rack": "Aisle-1",
  "variants": [
    {
      "variant_name": "250g Pack",
      "sku": "TEA-001-250",
      "price": 150,
      "cost": 100,
      "stock": 100,
      "barcode": "8909876543211"
    },
    {
      "variant_name": "500g Pack",
      "sku": "TEA-001-500",
      "price": 250,
      "cost": 180,
      "stock": 100
    }
  ]
}
```

**Success Response (201):**
```json
{
  "product": { "...product fields..." },
  "variants": [
    { "...variant fields..." }
  ]
}
```

**Error:** `409` — `{ "detail": "SKU already exists" }`

---

### POST /api/products/bulk-update
Batch update multiple products. (admin only)

**Request Body:**
```json
{
  "ids": ["prod_001", "prod_002"],
  "updates": {
    "field": "price",
    "value": 600
  }
}
```

**Response:**
```json
{
  "ok": true,
  "modified": 2
}
```

---

### PATCH /api/products/:id
Update a product. (admin, manager)

**Request Body:** (any subset)
```json
{
  "price": 275,
  "stock": 150
}
```

---

### DELETE /api/products/:id
Delete a product. (admin, manager)

---

### POST /api/products/:id/adjust-stock
Adjust stock manually. (admin, manager)

**Request Body:**
```json
{
  "quantity": 50,
  "note": "Stock count adjustment",
  "type": "adjustment"
}
```

**Note:** Positive quantity = increase, negative = decrease.

**Response:**
```json
{
  "id": "prod_001",
  "stock": 250
}
```

---

### POST /api/products/:id/repack
Repack a bulk product into smaller packets. (admin, manager)

**Request Body:**
```json
{
  "packet_weight": 0.5,
  "packet_count": 100,
  "packet_name": "Basmati Rice 500g Packets",
  "packet_price": 60
}
```

**Response (201):**
```json
{
  "source": { "id": "prod_001", "stock": 50 },
  "packet": { "...new product fields..." }
}
```

**Error:** `400` — `{ "detail": "Insufficient stock" }`

---

### GET /api/products/:id/repack-children
Get all child packets created from a repack operation.

---

### POST /api/products/backfill-repack-parents
Admin: Link orphan `-PKT` products to their parent products.

---

### POST /api/products/backfill-barcodes
Admin: Auto-generate barcodes for products missing them.

---

## Categories

### GET /api/categories
### POST /api/categories
### PATCH /api/categories/:id
### DELETE /api/categories/:id

**POST Request Body:**
```json
{
  "name": "Beverages",
  "description": "Drinks and liquids"
}
```

---

## Brands

### GET /api/brands
### POST /api/brands
### PATCH /api/brands/:id
### DELETE /api/brands/:id

**POST Request Body:**
```json
{
  "name": "Tata Tea"
}
```

---

## Units

### GET /api/units
### POST /api/units
### PATCH /api/units/:id
### DELETE /api/units/:id

**POST Request Body:**
```json
{
  "name": "kg",
  "unit_name": "kg",
  "type": "weight"
}
```

---

## Racks

### GET /api/racks
### POST /api/racks
### PATCH /api/racks/:id
### DELETE /api/racks/:id

**POST Request Body:**
```json
{
  "name": "Aisle-3"
}
```

---

## Variations

### GET /api/variations
### POST /api/variations
### PATCH /api/variations/:id
### DELETE /api/variations/:id

**POST Request Body:**
```json
{
  "name": "Size",
  "variation_values": ["Small", "Medium", "Large"]
}
```

---

## Batches

### GET /api/batches/product/:productId
List all batches for a product.

### GET /api/batches/expired
List all expired batches.

### GET /api/batches/check-expiry/:productId
Check expiry status for a product's batches.

### POST /api/batches
Create batch:

```json
{
  "product_id": "prod_001",
  "batch_no": "BATCH-001",
  "quantity": 100,
  "manufacturing_date": "2025-01-01",
  "expiry_date": "2026-01-01",
  "cost": 480,
  "mrp": 550
}
```

### POST /api/batches/deduct-fifo
Deduct stock using FIFO (First In, First Out):

```json
{
  "product_id": "prod_001",
  "quantity": 10
}
```

### PATCH /api/batches/:id
### DELETE /api/batches/:id

---

## Orders / Sales

### GET /api/orders
List orders with pagination. Roles: admin, manager, cashier.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `date_from` | string | ISO date string filter |
| `date_to` | string | ISO date string filter |
| `cashier_id` | string | Filter by cashier |
| `payment_mode` | string | Filter by payment mode |
| `page` | number | Page number (default 1) |
| `limit` | number | Per page (default 50) |

**Response (200):**
```json
[
  {
    "id": "ord_001",
    "invoice_no": "INV-000001",
    "customer_id": "cus_001",
    "customer_name": "John Doe",
    "cashier_id": "usr_001",
    "cashier_name": "Admin User",
    "items": [
      {
        "product_id": "prod_001",
        "product_name": "Basmati Rice 5kg",
        "quantity": 2,
        "price": 550,
        "tax_rate": 5,
        "total": 1100,
        "line_total": 1100
      }
    ],
    "subtotal": 1100,
    "tax_total": 55,
    "discount_percent": 10,
    "discount_amount": 110,
    "grand_total": 1045,
    "paid": 1000,
    "due": 45,
    "payment_mode": "cash",
    "status": "completed",
    "note": "",
    "created_at": "2025-06-15T14:30:00.000Z"
  }
]
```

---

### GET /api/orders/:id
Get a single order by ID.

---

### POST /api/orders
Create a new order. Auto-decrements stock, creates StockMovement entries, and manages customer dues.

**Request Body:**
```json
{
  "customer_id": null,
  "customer_name": "Walk-in Customer",
  "customer_phone": "",
  "items": [
    {
      "product_id": "prod_001",
      "name": "Basmati Rice 5kg",
      "quantity": 2,
      "price": 550,
      "tax_rate": 5,
      "total": 1100,
      "line_total": 1100,
      "unit": "kg",
      "sell_by": "kg"
    }
  ],
  "subtotal": 1100,
  "tax_total": 55,
  "discount_percent": 10,
  "amount_paid": 1000,
  "payment_mode": "cash",
  "note": ""
}
```

**Success Response (201):** Full order object with computed `grand_total`, `due`, etc.

**Error Responses:**
- `400` — `{ "detail": "Insufficient stock for ProductName (available: 5, requested: 10)" }`
- `400` — `{ "detail": "Product not found: SomeProduct" }`

---

## Customers

### GET /api/customers
List customers. Query: `?q=search_term`

**Response:**
```json
[
  {
    "id": "cus_001",
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@email.com",
    "address": "123 Main St",
    "opening_balance": 0,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

### POST /api/customers
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@email.com",
  "address": "123 Main St",
  "opening_balance": 0
}
```

### PATCH /api/customers/:id
### DELETE /api/customers/:id

---

## Customer Dues

### GET /api/customer-dues
Aggregate all orders with `due > 0`, grouped by `customer_name`.

**Response:**
```json
[
  {
    "id": "John Doe",
    "customer_name": "John Doe",
    "phone": "",
    "due": 450.00,
    "since": "2025-06-01T10:00:00.000Z"
  }
]
```

### POST /api/customer-dues/receive-payment
Receive payment against customer dues. Reduces customer receivable + order dues FIFO + creates LedgerEntry.

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "amount": 500,
  "mode": "cash",
  "note": "Partial payment"
}
```

**Response:**
```json
{
  "customer": {
    "id": "cus_001",
    "name": "John Doe",
    "receivable": 0
  },
  "ledger_entry": {
    "id": "ldg_001",
    "date": "2025-06-15",
    "account": "cash",
    "credit": 500,
    "note": "Partial payment"
  }
}
```

---

## Customer Groups

### GET /api/customer-groups
### POST /api/customer-groups
```json
{
  "name": "Wholesale",
  "discount_percent": 15,
  "description": "Wholesale buyers"
}
```
### PATCH /api/customer-groups/:id
### DELETE /api/customer-groups/:id

---

## Suppliers

### GET /api/suppliers
List all suppliers. Query: `?q=search_term`

### GET /api/suppliers/:id
### GET /api/suppliers/:id/ledger
### GET /api/suppliers/:id/purchases
### POST /api/suppliers
```json
{
  "name": "ABC Distributors",
  "phone": "9876543210",
  "email": "abc@distributor.com",
  "address": "456 Market St",
  "gstin": "27ABCDE1234F1Z5",
  "opening_balance": 0
}
```
### PATCH /api/suppliers/:id
### DELETE /api/suppliers/:id

---

## Supplier Payments

### GET /api/supplier-payments
Query: `?supplier_id=&limit=`

### POST /api/supplier-payments
Creates payment + 2 LedgerEntry records (debit Supplier Payable, credit mode account) + reduces supplier.current_balance.

**Request Body:**
```json
{
  "supplier_id": "sup_001",
  "amount": 10000,
  "mode": "bank",
  "note": "Payment for invoice INV-001"
}
```

### DELETE /api/supplier-payments/:id
Reverses payment: increments supplier balance, deletes ledger entries.

---

## Purchases

### GET /api/purchases
Query: `?supplier_id=&status=&date_from=&date_to=&page=&limit=`

### GET /api/purchases/:id
### POST /api/purchases
Creates purchase order. Does NOT auto-increment stock (use receive endpoint).

**Request Body:**
```json
{
  "supplier_id": "sup_001",
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 50,
      "cost": 480,
      "tax_rate": 5
    }
  ],
  "reference": "PO-2025-001",
  "note": "Monthly stock order"
}
```

### PATCH /api/purchases/:id
### DELETE /api/purchases/:id

### POST /api/purchases/:id/receive
Marks purchase as received. Increments product stock, creates StockMovement, updates supplier balance.

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 50,
      "cost": 480
    }
  ]
}
```

---

## Purchase Returns

### GET /api/purchase-returns
### GET /api/purchase-returns/:id
### POST /api/purchase-returns
Returns items to supplier. Decrements stock, creates StockMovement.

**Request Body:**
```json
{
  "purchase_id": "po_001",
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 5,
      "cost": 480,
      "reason": "Damaged packaging"
    }
  ],
  "note": "Returned to supplier"
}
```

### DELETE /api/purchase-returns/:id

---

## Sale Returns

### GET /api/sale-returns
### POST /api/sale-returns
Customer returns items. Restores stock, creates StockMovement.

**Request Body:**
```json
{
  "order_id": "ord_001",
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 1,
      "price": 550,
      "reason": "Defective product"
    }
  ],
  "note": "Customer returned"
}
```

---

## Stock Movements

### GET /api/stock-movements
Query: `?product_id=&type=sale|purchase|adjustment|repack_out&date_from=&date_to=&limit=`

**Response:**
```json
[
  {
    "id": "sm_001",
    "product_id": "prod_001",
    "product_name": "Basmati Rice 5kg",
    "type": "sale",
    "quantity": -2,
    "reference": "INV-000001",
    "user_id": "usr_001",
    "user_name": "Admin User",
    "note": "",
    "created_at": "2025-06-15T14:30:00.000Z"
  }
]
```

---

## Damage Stock

### GET /api/damage-stock
### POST /api/damage-stock
```json
{
  "product_id": "prod_001",
  "quantity": 3,
  "reason": "Expired",
  "note": "Found in storage"
}
```

---

## Transfers

### GET /api/transfers
### POST /api/transfers
Stock transfer between outlets.

```json
{
  "from_outlet": "outlet_001",
  "to_outlet": "outlet_002",
  "items": [
    {
      "product_id": "prod_001",
      "quantity": 10
    }
  ],
  "note": "Replenishment transfer"
}
```

---

## Dashboard

### GET /api/dashboard/stats
**Response:**
```json
{
  "today_revenue": 15250,
  "today_orders": 24,
  "today_transactions": 24,
  "total_products": 350,
  "total_customers": 85,
  "total_suppliers": 12,
  "low_stock_count": 5,
  "recent_orders": [ "...5 most recent orders..." ],
  "low_stock_products": [ "...products with stock <= threshold..." ],
  "today_sales": [ "...today's daily sales summary..." ]
}
```

---

## Reports

### GET /api/reports/sales
Comprehensive sales report.

**Query:** `?date_from=&date_to=&period=daily|weekly|monthly`

**Response:**
```json
{
  "kpis": {
    "total_sales": 500000,
    "total_orders": 850,
    "avg_order_value": 588.24,
    "total_tax": 25000,
    "total_discount": 15000
  },
  "chart_data": [
    { "date": "2025-06-01", "sales": 15000, "orders": 25 }
  ],
  "top_products": [
    { "product_name": "Basmati Rice 5kg", "quantity": 120, "revenue": 66000 }
  ],
  "orders": [ "...paginated orders list..." ]
}
```

---

## Extra Reports

### GET /api/extra-reports/cash-flow
`?date_from=&date_to=`

### GET /api/extra-reports/customer-balance
### GET /api/extra-reports/customer-ledger/:customerId
### GET /api/extra-reports/supplier-balance
### GET /api/extra-reports/supplier-ledger/:supplierId
### GET /api/extra-reports/balance-statement
### GET /api/extra-reports/deposit-report
### GET /api/extra-reports/register-report

---

## BI Dashboard

### GET /api/bi/comparison
### GET /api/bi/top-products
### GET /api/bi/top-customers
### GET /api/bi/profit-margin
### GET /api/bi/cash-flow

---

## Accounting

### GET /api/accounting/trial-balance
### GET /api/accounting/balance-sheet
### GET /api/accounting/balance-statement
### GET /api/accounting/account_balances
### GET /api/accounting/income_statement
### GET /api/accounting/cash_flow
### GET /api/accounting/aging_summary

---

## Accounts

### GET /api/accounts
### GET /api/accounts/:id
### POST /api/accounts
```json
{
  "name": "Cash Account",
  "type": "asset",
  "opening_balance": 50000
}
```
### PATCH /api/accounts/:id
### DELETE /api/accounts/:id

---

## Expenses

### GET /api/expenses
### POST /api/expenses
```json
{
  "expense_item_id": "ei_001",
  "amount": 5000,
  "note": "Electricity bill",
  "date": "2025-06-15",
  "payment_mode": "bank"
}
```

---

## Expense Items (Categories)

### GET /api/expense-items
### POST /api/expense-items
```json
{
  "name": "Utilities",
  "description": "Electricity, Water, Internet"
}
```
### PATCH /api/expense-items/:id
### DELETE /api/expense-items/:id

---

## Income

### GET /api/income
### POST /api/income
```json
{
  "income_item_id": "ii_001",
  "amount": 25000,
  "note": "Rent received",
  "date": "2025-06-01",
  "payment_mode": "cash"
}
```

---

## Income Items (Categories)

### GET /api/income-items
### POST /api/income-items
```json
{
  "name": "Rental Income",
  "description": "Property rental revenue"
}
```
### PATCH /api/income-items/:id
### DELETE /api/income-items/:id

---

## Payroll

### GET /api/payroll
### POST /api/payroll/generate
Generates payroll entries for all active users.

### POST /api/payroll/:id/mark-paid
```json
{
  "payment_mode": "bank"
}
```

---

## Attendance

### GET /api/attendance
Query: `?date=&user_id=`

### GET /api/attendance/summary
Query: `?month=2025-06&user_id=`

### POST /api/attendance/check-in
```json
{ "note": "Arrived on time" }
```

### POST /api/attendance/check-out
```json
{ "note": "Left at 6 PM" }
```

---

## Check-In/Out

### GET /api/check-in-out/today
### GET /api/check-in-out/user/:userId
### POST /api/check-in-out/check-in
```json
{ "note": "Morning shift start" }
```
### POST /api/check-in-out/check-out
```json
{ "note": "Shift end" }
```

---

## Shifts

### GET /api/shifts
### POST /api/shifts
```json
{
  "outlet_id": "outlet_001",
  "opening_balance": 5000,
  "notes": "Morning shift"
}
```
### PATCH /api/shifts/:id
```json
{
  "closing_balance": 15000,
  "notes": "Shift ended"
}
```

---

## Outlets

### GET /api/outlets
### GET /api/outlets/current
### GET /api/outlets/:id
### POST /api/outlets
```json
{
  "name": "Main Store",
  "address": "123 Main Road",
  "phone": "9876543210",
  "gstin": "27ABCDE1234F1Z5"
}
```
### PATCH /api/outlets/:id
### DELETE /api/outlets/:id

---

## Settings

### GET /api/settings
Returns full settings object.

### PUT /api/settings
Update entire settings document.

### PATCH /api/settings/:group
Update specific config group.

**Groups:** `invoice_settings`, `email_config`, `sms_config`, `whatsapp_config`, `payment_gateway`, `printer_config`, `whitelabel`, `module_status`

**Example — PATCH /api/settings/invoice_settings:**
```json
{
  "prefix": "INV",
  "number": 1,
  "template": "standard",
  "show_logo": true,
  "show_address": true,
  "terms": "Payment due within 30 days"
}
```

---

## Promotions

### GET /api/promotions
Query: `?active_only=true`

### POST /api/promotions
```json
{
  "name": "Summer Sale",
  "type": "percentage",
  "value": 20,
  "start_date": "2025-06-01",
  "end_date": "2025-08-31",
  "active": true
}
```

### PATCH /api/promotions/:id
### DELETE /api/promotions/:id

---

## Bookings

### GET /api/bookings
### GET /api/bookings/:id
### POST /api/bookings
```json
{
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "items": [{ "product_id": "prod_001", "quantity": 5 }],
  "booking_date": "2025-06-20",
  "note": "Advance booking"
}
```
### POST /api/bookings/:id/convert
Converts a booking to an order.

---

## Quotations

### GET /api/quotations
### GET /api/quotations/:id
### POST /api/quotations
```json
{
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "items": [{ "product_id": "prod_001", "quantity": 10, "price": 500 }],
  "valid_until": "2025-07-15",
  "note": "Price valid for 30 days"
}
```
### PATCH /api/quotations/:id
### DELETE /api/quotations/:id

---

## Deposits

### GET /api/deposits
### POST /api/deposits
```json
{
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "amount": 5000,
  "payment_method": "cash",
  "date": "2025-06-15",
  "note": "Advance payment for order"
}
```
### PATCH /api/deposits/:id
### DELETE /api/deposits/:id

---

## Installments

### GET /api/installments
### POST /api/installments
```json
{
  "customer_name": "John Doe",
  "total_amount": 50000,
  "down_payment": 10000,
  "installment_count": 6,
  "installment_amount": 6667,
  "interest_rate": 0,
  "start_date": "2025-07-01"
}
```
### PATCH /api/installments/:id
### DELETE /api/installments/:id

---

## Warranties

### GET /api/warranties
### POST /api/warranties
```json
{
  "product_id": "prod_001",
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "purchase_date": "2025-06-01",
  "expiry_date": "2027-06-01",
  "note": "2-year manufacturer warranty"
}
```
### PATCH /api/warranties/:id
### DELETE /api/warranties/:id

---

## Servicing

### GET /api/servicing
### POST /api/servicing
```json
{
  "product_id": "prod_001",
  "product_name": "Washing Machine",
  "customer_name": "John Doe",
  "customer_phone": "9876543210",
  "issue": "Not spinning",
  "status": "received",
  "estimated_cost": 1500,
  "received_date": "2025-06-15"
}
```
### PATCH /api/servicing/:id
### DELETE /api/servicing/:id

---

## Fixed Assets

### GET /api/fixed-assets
### POST /api/fixed-assets
```json
{
  "name": "POS Terminal",
  "purchase_date": "2025-01-15",
  "purchase_cost": 25000,
  "useful_life_years": 5,
  "depreciation_method": "straight_line",
  "note": "Main counter terminal"
}
```
### PATCH /api/fixed-assets/:id
### DELETE /api/fixed-assets/:id

---

## Delivery Partners

### GET /api/delivery-partners
### POST /api/delivery-partners
```json
{
  "name": "Swift Delivery",
  "phone": "9876543210",
  "commission_type": "percentage",
  "commission_value": 5
}
```
### PATCH /api/delivery-partners/:id
### DELETE /api/delivery-partners/:id

---

## Counters

### GET /api/counters
### POST /api/counters
```json
{
  "name": "Counter 1",
  "outlet_id": "outlet_001"
}
```
### PATCH /api/counters/:id
### DELETE /api/counters/:id

---

## Registers

### GET /api/registers
### POST /api/registers
```json
{
  "name": "Main Register",
  "outlet_id": "outlet_001"
}
```
### PATCH /api/registers/:id
### DELETE /api/registers/:id

---

## Denominations

### GET /api/denominations
### POST /api/denominations
```json
{
  "name": "₹2000",
  "value": 2000,
  "type": "note",
  "currency": "INR"
}
```
### PATCH /api/denominations/:id
### DELETE /api/denominations/:id

---

## Multiple Currencies

### GET /api/multiple-currencies
### POST /api/multiple-currencies
```json
{
  "code": "USD",
  "name": "US Dollar",
  "symbol": "$",
  "exchange_rate": 83.50
}
```
### PATCH /api/multiple-currencies/:id
### DELETE /api/multiple-currencies/:id

---

## Roles

### GET /api/roles
### POST /api/roles
```json
{
  "name": "Store Manager",
  "permissions": {
    "products": ["create", "read", "update", "delete"],
    "orders": ["create", "read", "update"],
    "users": ["read"]
  }
}
```
### PATCH /api/roles/:id
### DELETE /api/roles/:id

---

## Payment Methods

### GET /api/payment-methods
### POST /api/payment-methods
```json
{
  "name": "Credit Card",
  "code": "credit_card",
  "active": true
}
```
### PATCH /api/payment-methods/:id
### DELETE /api/payment-methods/:id

---

## Notifications

### GET /api/notifications
### GET /api/notifications/unread-count
### POST /api/notifications
```json
{
  "title": "Low Stock Alert",
  "message": "Product 'Basmati Rice' is below threshold",
  "type": "warning",
  "user_id": "usr_001"
}
```
### POST /api/notifications/generate
Auto-generate notifications (low stock, etc.)

### PATCH /api/notifications/:id/read

---

## WhatsApp

### POST /api/whatsapp/send
```json
{
  "to": "919876543210",
  "message": "Your order #INV-000001 is ready for pickup."
}
```

---

## Barcode Utils

### GET /api/tools/ean13/:code
Computes EAN-13 check digit for a 12-digit code.

**Response:**
```json
{
  "original": "890123456789",
  "ean13": "8901234567890"
}
```

---

## Data Management (Wipe)

### POST /api/wipe/generate
Generates dummy data for testing (50 products, 20 customers, 10 suppliers).

### DELETE /api/wipe/demo-data
Wipes all demo data (products, customers, suppliers, etc.)

### DELETE /api/wipe/transactional
Wipes orders, payments, transactions only.

### DELETE /api/wipe/all
Factory reset — wipes everything including users.

---

## Error Codes Summary

| Code | Meaning |
|------|---------|
| **400** | Bad Request (validation failed, insufficient stock) |
| **401** | Missing or invalid JWT token |
| **403** | Insufficient role permissions |
| **404** | Resource not found |
| **409** | Duplicate entry (SKU, email already exists) |
| **422** | Zod schema validation error |
| **500** | Internal server error |

**Standard Error Response Format:**
```json
{
  "detail": "Human-readable error message"
}
```

## Authentication Flow

```
1. POST /api/auth/login  →  Receive { token, user }
2. Include in all subsequent requests:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Role Hierarchy

| Role | Access Level |
|------|-------------|
| `admin` | Full access to all endpoints |
| `manager` | Most CRUD operations, no user management or wipe |
| `cashier` | POS operations: products (read), orders (create/read), customers |

---

> Generated for **No Bargaining POS** — Complete API Reference v2.0.0
