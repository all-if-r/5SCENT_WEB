# 🧾 Point of Sale (POS) System Guide

Complete guide for the POS module in 5SCENT.

## Overview

The POS system allows admins to process in-store sales with item scanning, quantity input, payment calculation, and receipt printing.

## Features

- ✅ Item lookup by code
- ✅ Quantity management
- ✅ Automatic price calculation
- ✅ Change calculation
- ✅ Transaction recording
- ✅ Stock management
- ✅ Receipt generation

## Backend API

### Endpoints

#### Get Item by Code
```
GET /api/admin/pos/items/code/{code}
```

Returns item details including name, price, and stock.

#### List All Items
```
GET /api/admin/pos/items
```

Returns all POS items.

#### Create Transaction
```
POST /api/admin/pos/transactions
Body: {
  items: [
    { item_code: "ITEM001", quantity: 2 },
    { item_code: "ITEM002", quantity: 1 }
  ],
  money_given: 500000
}
```

Creates a new transaction and returns transaction details.

#### CRUD Operations
- `POST /api/admin/pos/items` - Create item
- `PUT /api/admin/pos/items/{id}` - Update item
- `DELETE /api/admin/pos/items/{id}` - Delete item

## Frontend Implementation

### POS Page

Located at `/admin/pos`, the POS interface includes:

1. **Item Input Section**
   - Item code input (supports barcode scanning)
   - Quantity selector
   - Add to cart button

2. **Cart Display**
   - List of selected items
   - Quantity adjustment
   - Item removal
   - Subtotal per item

3. **Payment Section**
   - Total amount display
   - Money given input
   - Change calculation
   - Complete transaction button

### Usage Flow

1. **Scan/Enter Item Code**
   - Enter item code in input field
   - Press Enter or click "Add Item"
   - Item appears in cart

2. **Adjust Quantities**
   - Use +/- buttons to adjust
   - Or manually edit quantity

3. **Enter Payment**
   - Enter amount given by customer
   - Change is calculated automatically

4. **Complete Transaction**
   - Click "Complete Transaction"
   - Transaction is saved
   - Stock is updated
   - Receipt can be printed

## Database Schema

### pos_item Table

```sql
- id (primary key)
- item_code (unique)
- name
- unit_price
- stock
- timestamps
```

### pos_transaction Table

```sql
- id (primary key)
- transaction_number
- item_code (foreign key)
- quantity
- unit_price
- subtotal
- total
- money_given
- change
- transaction_date
- timestamps
```

## Transaction Number Format

Format: `POS-YYYYMMDD-XXXXXX`

Example: `POS-20240115-A3B2C1`

## Stock Management

When a transaction is completed:

1. Stock is automatically decremented
2. Each item's stock is reduced by quantity sold
3. Stock cannot go below 0

## Receipt Printing

### Implementation

Receipt printing can be implemented using:

1. **Browser Print**: `window.print()` (current implementation)
2. **PDF Generation**: Use libraries like jsPDF
3. **Thermal Printer**: Integrate with thermal printer APIs

### Receipt Content

- Transaction number
- Date and time
- Items list with quantities and prices
- Subtotal
- Total
- Money given
- Change

## Best Practices

1. **Item Codes**: Use consistent, scannable codes
2. **Stock Checks**: Always verify stock before adding to cart
3. **Payment Validation**: Ensure money given >= total
4. **Error Handling**: Show clear error messages
5. **Receipts**: Keep transaction records for accounting

## Security

- POS endpoints require admin authentication
- All transactions are logged
- Stock updates are atomic (database transactions)

## Future Enhancements

- Barcode scanner integration
- Multiple payment methods
- Discount/coupon system
- Sales reports
- Inventory management
- Customer lookup
- Return/refund processing



