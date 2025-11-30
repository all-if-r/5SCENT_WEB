# POS Tool - Quick Reference & Testing Guide

## Quick Start

1. **Access POS Tool**: Navigate to `/admin/pos` in the admin dashboard
2. **Search Product**: Enter product name or ID and click "Search"
3. **Select Size**: Choose 30ml or 50ml
4. **Set Quantity**: Enter desired quantity
5. **Add to Cart**: Click "Add to Cart" button
6. **Fill Payment Details**: 
   - Enter customer name (required)
   - Enter phone number in +62 format (required)
   - Select payment method (Cash/QRIS/Virtual Account)
   - If Cash: enter cash received amount
7. **Download Receipt**: Click "Download Receipt" button
8. **Order Created**: Order automatically created with #POS-DD-MM-YYYY-XXX pattern

---

## Testing Scenarios

### Scenario 1: Successful Cash Transaction
**Steps**:
1. Search and select product (e.g., "Lavender")
2. Select size: 30ml
3. Quantity: 2
4. Add to cart
5. Customer name: "Ahmad"
6. Phone: "+6281234567890"
7. Payment: Cash
8. Cash received: 200000
9. Click "Download Receipt"

**Expected Results**:
- ✅ Cart shows 1 item (30ml x 2)
- ✅ Subtotal calculated correctly
- ✅ Change shows: 200000 - subtotal
- ✅ Receipt downloads with filename
- ✅ Order created in Orders page with #POS-30-11-2025-XXX pattern

---

### Scenario 2: Multiple Items Cart
**Steps**:
1. Add item 1: Product A, 30ml, qty 1
2. Add item 2: Product B, 50ml, qty 3
3. Add same item (Product A, 30ml): qty 1 (should merge)
4. Complete transaction

**Expected Results**:
- ✅ Cart shows 2 unique items (not 3)
- ✅ Product A quantity shows 2 (not 1)
- ✅ Subtotal = (Item1_price × 2) + (Item2_price × 3)

---

### Scenario 3: Remove Item from Cart
**Steps**:
1. Add multiple items to cart
2. Click trash icon on one item
3. Verify cart updates

**Expected Results**:
- ✅ Item removed immediately
- ✅ Cart count decreases
- ✅ Subtotal recalculates
- ✅ Toast message: "Item removed from cart"

---

### Scenario 4: Payment Method Conditional Logic
**Steps**:
1. Select payment method: "Cash" → verify "Cash Received" field appears
2. Switch to "QRIS" → verify "Cash Received" field disappears
3. Switch to "Virtual Account" → verify field still hidden
4. Switch back to "Cash" → field reappears

**Expected Results**:
- ✅ All conditional renders work correctly
- ✅ Change calculation only shows for Cash

---

### Scenario 5: Validation Errors

#### 5a: Empty Cart Submission
**Expected**: Error message "Cart is empty"

#### 5b: Missing Customer Name
**Expected**: Error message "Please enter customer name"

#### 5c: Invalid Phone Number
**Invalid formats** (should show error):
- `62812345678` (missing +)
- `+61812345678` (wrong country code)
- `+628123` (too short)
- `+62812345678901234567` (too long)

**Valid formats** (should work):
- `+6281234567890` (11 digits after +62)
- `+628123456789` (9 digits after +62)
- `+6281234567` (8 digits after +62)

#### 5d: Insufficient Cash
- Enter subtotal 100000
- Cash received: 90000
- **Expected**: Error "Cash received must be greater than or equal to subtotal"

#### 5e: Missing Cash Received
- Select "Cash" payment
- Leave "Cash Received" empty
- **Expected**: Error "Please enter cash received amount"

---

## API Testing

### Test Search Endpoint
```bash
GET http://localhost:8000/api/admin/pos/products/search?q=lavender
Headers: Authorization: Bearer {token}
```

**Expected Response**:
```json
[
  {
    "product_id": 1,
    "name": "Lavender Essential Oil 30ml",
    "price_30ml": 50000,
    "price_50ml": 75000,
    "stock_30ml": 10,
    "stock_50ml": 15
  }
]
```

### Test Create Transaction
```bash
POST http://localhost:8000/api/admin/pos/transactions
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "customer_name": "Ahmad",
  "phone": "+6281234567890",
  "payment_method": "Cash",
  "cash_received": 200000,
  "items": [
    {
      "product_id": 1,
      "size": "30ml",
      "quantity": 2,
      "price": 50000,
      "subtotal": 100000
    }
  ]
}
```

**Expected Response**:
```json
{
  "transaction_id": 1,
  "order_id": "POS-30-11-2025-001",
  "customer_name": "Ahmad",
  "phone": "+6281234567890",
  "total_price": 100000,
  "payment_method": "Cash",
  "cash_received": 200000,
  "change": 100000,
  "items": [...]
}
```

### Test Receipt Download
```bash
GET http://localhost:8000/api/admin/pos/transactions/1/receipt
Headers: Authorization: Bearer {token}
```

**Expected Response**: PDF file downloads

---

## Database Queries for Verification

### Check Transaction Created
```sql
SELECT * FROM pos_transaction WHERE customer_name = 'Ahmad';
```

### Check Items Created
```sql
SELECT * FROM pos_item WHERE transaction_id = 1;
```

### Check Order Created
```sql
SELECT * FROM orders WHERE order_id LIKE 'POS-%';
```

### Verify Order Details
```sql
SELECT * FROM order_details WHERE order_id = (
  SELECT order_id FROM orders WHERE order_id = 'POS-30-11-2025-001'
);
```

### Check Stock Updated
```sql
SELECT product_id, stock_30ml, stock_50ml FROM products WHERE product_id = 1;
```

---

## PDF Receipt Verification

When receipt downloads, verify it contains:

- [ ] 5SCENT branding (header)
- [ ] Current date and time
- [ ] Admin name
- [ ] Customer name: "Ahmad"
- [ ] Customer phone: "+6281234567890"
- [ ] Item table with:
  - Product name
  - Size (30ml)
  - Quantity (2)
  - Price (50000)
  - Subtotal (100000)
- [ ] Subtotal: 100000
- [ ] Cash Received: 200000
- [ ] Change: 100000
- [ ] Payment Method: Cash
- [ ] Thank you message
- [ ] Receipt ID

---

## Common Issues & Solutions

### Issue: "Failed to search products"
**Solution**: 
- Check API endpoint is `/admin/pos/products/search`
- Verify search query is not empty
- Check backend API is running

### Issue: Receipt doesn't download
**Solution**:
- Install DomPDF: `composer require barryvdh/laravel-dompdf`
- Check browser download settings
- Check browser console for errors

### Issue: Order not appearing in Orders page
**Solution**:
- Verify createPosOrder() is implemented in PosController
- Check orders table exists
- Check migration was run: `php artisan migrate`

### Issue: Phone validation fails
**Solution**:
- Use format: `+62` followed by 8-12 digits
- Examples: `+6281234567890`, `+628123456789`
- Remove spaces or dashes

### Issue: Stock not updating
**Solution**:
- Verify product has stock_30ml and stock_50ml columns
- Check transaction creation was successful
- Review PosController for stock update logic

---

## Performance Tips

1. **Search Optimization**: 
   - Results limited to 10 items per search
   - Use specific product names for faster results

2. **Large Cart**:
   - Cart scrolls if more than 6 items
   - Can handle unlimited items

3. **Receipt Generation**:
   - PDF takes 1-2 seconds to generate
   - Download starts automatically after transaction

---

## Browser Requirements

- **Minimum**: Chrome 90, Firefox 88, Safari 14, Edge 90
- **Recommended**: Latest versions
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+

---

## File Downloads

After successful transaction, receipt filename is:
`pos-receipt-{transaction_id}-{customer_name_underscored}.pdf`

Examples:
- `pos-receipt-1-ahmad.pdf`
- `pos-receipt-2-john_doe.pdf`
- `pos-receipt-3-siti_nurhaliza.pdf`

---

## Phone Number Examples

✅ **Valid**:
- `+6281234567890`
- `+628123456789`
- `+6281234567`
- `+62812345`

❌ **Invalid**:
- `081234567890` (missing country code)
- `+6281234` (too short)
- `+628123456789012345` (too long)
- `+628123456 789` (contains space)

---

## Order Code Pattern

Generated automatically for each POS transaction:

**Format**: `POS-DD-MM-YYYY-XXX`

**Examples**:
- Date: November 30, 2025 → `POS-30-11-2025-001` (first transaction that day)
- Date: November 30, 2025 → `POS-30-11-2025-002` (second transaction that day)
- Date: December 1, 2025 → `POS-01-12-2025-001` (first transaction next day)

**Key Points**:
- Sequence (XXX) resets daily
- Automatically generated by backend
- Links to both pos_transaction and orders tables

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review POS_TOOL_IMPLEMENTATION_COMPLETE.md for full documentation
3. Check browser console for error messages
4. Check Laravel logs: `storage/logs/laravel.log`

**Last Updated**: November 30, 2025
**Status**: ✅ Production Ready
