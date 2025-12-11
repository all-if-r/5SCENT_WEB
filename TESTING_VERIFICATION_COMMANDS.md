# 🧪 QRIS Fixes - Testing & Verification Commands

## Pre-Test Setup

```bash
# 1. Clear Laravel cache
php artisan cache:clear
php artisan config:clear
php artisan view:clear

# 2. Verify Midtrans configuration
php artisan tinker
>>> config('midtrans.server_key')
>>> config('midtrans.client_key')
>>> config('midtrans.is_production')
>>> exit

# 3. Start tailing logs
tail -f storage/logs/laravel.log &

# 4. Verify ngrok is running
# Check: https://localhost:4040/inspect/http
```

---

## Test 1: QRIS Payment Creation

### Frontend Steps
```
1. Go to http://localhost:3000/products
2. Add product to cart
3. Go to http://localhost:3000/cart
4. Click "Checkout"
5. Fill delivery details
6. Select payment method: "QRIS"
7. Click "Confirm Payment"
```

### Backend Verification
```bash
# Check logs for API call
grep "Calling Midtrans Core API" storage/logs/laravel.log

# Expected output:
# [2025-12-11 10:00:00] local.INFO: Calling Midtrans Core API [...]
# [2025-12-11 10:00:01] local.INFO: Midtrans API response received [...]
# [2025-12-11 10:00:01] local.INFO: QRIS transaction created/updated [...]

# Verify database - using MySQL
mysql -u root -p 5scent_db << EOF
SELECT 
    qris_transaction_id,
    order_id,
    midtrans_transaction_id,
    qr_url,
    status,
    expired_at,
    raw_notification IS NOT NULL as has_raw_notification
FROM qris_transactions
ORDER BY created_at DESC
LIMIT 1;
EOF

# Expected output:
# qris_transaction_id: 1 (or higher)
# order_id: 123 (your test order)
# midtrans_transaction_id: abc123def456 (REAL value)
# qr_url: https://api.sandbox.midtrans.com/... (REAL URL)
# status: pending
# expired_at: 2025-12-11 10:05:00 (5 minutes from now)
# has_raw_notification: 1 (TRUE)
```

### Frontend Verification
```javascript
// Open browser console (F12) while on QRIS page
// Check for errors: Should see NONE about CORS or QR code

// In Network tab:
// 1. Look for GET /api/orders/{orderId}/qris-detail
//    Response should have:
//    { "qris": { "qr_url": "https://..." } }

// QR code should display correctly
// Should be scannable (try with phone if mobile available)
```

### Midtrans Sandbox Verification
```
1. Go to https://app.sandbox.midtrans.com/
2. Login with credentials
3. Go to "Transactions" or "Transaction List"
4. Look for most recent transaction
   Expected:
   - Order ID: ORDER-123-1702xxx (matches your order)
   - Status: Pending
   - Amount: Correct amount
   - Payment Method: QRIS
```

---

## Test 2: Check Database Data

### Complete Data Check
```sql
-- 1. Check qris_transactions
SELECT 
    qris_transaction_id,
    order_id,
    midtrans_order_id,
    midtrans_transaction_id,
    payment_type,
    gross_amount,
    qr_url,
    status,
    expired_at,
    SUBSTRING(raw_notification, 1, 100) as raw_notification_preview,
    created_at
FROM qris_transactions
WHERE order_id = YOUR_ORDER_ID;

-- Expected:
-- midtrans_transaction_id: NOT NULL, NOT MOCK
-- qr_url: Starts with https://api.sandbox.midtrans.com/
-- raw_notification: JSON string (NOT NULL)
-- status: 'pending'

-- 2. Check orders
SELECT 
    order_id,
    user_id,
    status,
    payment_method,
    total_price,
    created_at
FROM orders
WHERE order_id = YOUR_ORDER_ID;

-- Expected:
-- status: 'Pending' (before settlement)
-- payment_method: 'QRIS'

-- 3. Check payment
SELECT 
    payment_id,
    order_id,
    method,
    amount,
    status,
    created_at
FROM payment
WHERE order_id = YOUR_ORDER_ID;

-- Expected:
-- method: 'QRIS'
-- amount: Correct amount
-- status: 'pending' (before webhook)
```

### SQL Commands in Terminal
```bash
# Run all checks at once
mysql -u root -p 5scent_db << 'EOF'

-- QRIS Transactions
SELECT 
    'QRIS_TRANSACTIONS' as section,
    qris_transaction_id, order_id, midtrans_transaction_id, 
    qr_url IS NOT NULL as has_qr_url,
    raw_notification IS NOT NULL as has_raw_notification
FROM qris_transactions
WHERE order_id = 123
LIMIT 1;

-- Orders
SELECT 
    'ORDERS' as section,
    order_id, status, payment_method, total_price
FROM orders
WHERE order_id = 123
LIMIT 1;

-- Payment
SELECT 
    'PAYMENT' as section,
    payment_id, order_id, method, status
FROM payment
WHERE order_id = 123
LIMIT 1;

EOF
```

---

## Test 3: Webhook Settlement Simulation

### Option A: Using Midtrans Sandbox (Recommended)
```
1. Go to https://app.sandbox.midtrans.com/transactions
2. Find your pending QRIS transaction
3. Click on it
4. Look for "Approve" or "Mark as Paid" button
5. Click to simulate settlement
6. Should receive webhook at ngrok URL
```

### Option B: Manual Webhook Test (Advanced)
```bash
# Get the order_id from your test
ORDER_ID=123
TRANSACTION_ID="abc123def456"  # From your qris_transactions table
MIDTRANS_ORDER_ID="ORDER-123-1702xxx"  # From your qris_transactions table

# Send test webhook manually
curl -X POST http://localhost:8000/api/midtrans/notification \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'$MIDTRANS_ORDER_ID'",
    "transaction_id": "'$TRANSACTION_ID'",
    "transaction_status": "settlement",
    "payment_type": "qris",
    "gross_amount": "100000.00",
    "currency": "IDR"
  }'

# Expected response:
# { "status": "ok" }
```

### After Settlement - Verify Updates
```sql
-- Check if status updated to settlement
SELECT 
    qris_transaction_id,
    order_id,
    status,
    SUBSTRING(raw_notification, 1, 50) as raw_notif_preview,
    updated_at
FROM qris_transactions
WHERE order_id = 123;

-- Expected:
-- status: 'settlement' (NOT 'pending')
-- updated_at: Recent timestamp

-- Check order status
SELECT order_id, status, updated_at
FROM orders
WHERE order_id = 123;

-- Expected:
-- status: 'Packaging' (NOT 'Pending')

-- Check payment status
SELECT order_id, status, updated_at
FROM payment
WHERE order_id = 123;

-- Expected:
-- status: 'success' (NOT 'pending')
```

### Check Logs for Settlement
```bash
# Look for settlement logs
grep -i "settlement\|packaging\|payment status" storage/logs/laravel.log | tail -20

# Expected logs:
# [INFO] Midtrans notification received [order_id, transaction_status=settlement]
# [INFO] Order auto-transitioned to Packaging
# [INFO] Payment status updated [order_id, payment_status=success]
```

---

## Test 4: Payment Expiry Simulation

### Option A: Wait for Natural Expiry
```
1. Create QRIS payment
2. Do NOT scan QR code
3. Wait 5 minutes
4. Midtrans auto-sends expiry webhook
5. Check database (orders.status should be Cancelled)
```

### Option B: Manual Expiry Test
```bash
# Send expiry webhook manually
ORDER_ID=123
TRANSACTION_ID="abc123def456"
MIDTRANS_ORDER_ID="ORDER-123-1702xxx"

curl -X POST http://localhost:8000/api/midtrans/notification \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "'$MIDTRANS_ORDER_ID'",
    "transaction_id": "'$TRANSACTION_ID'",
    "transaction_status": "expire",
    "payment_type": "qris",
    "gross_amount": "100000.00",
    "currency": "IDR"
  }'
```

### Verify Expiry Updates
```sql
SELECT order_id, status, updated_at
FROM orders
WHERE order_id = 123;

-- Expected:
-- status: 'Cancelled'

SELECT order_id, status, updated_at
FROM payment
WHERE order_id = 123;

-- Expected:
-- status: 'failed'

SELECT order_id, status, updated_at
FROM qris_transactions
WHERE order_id = 123;

-- Expected:
-- status: 'expire'
```

---

## Test 5: Admin Dashboard

### Frontend Test
```javascript
// Open http://localhost:3000/admin/dashboard
// Press F12 to open Developer Tools

// Check Console tab:
// Should see NO errors about:
// - "Encountered two children with the same key"
// - Any React warnings

// Check Elements:
// Best Sellers section should render correctly
// All cards visible and styled properly
```

### Check Specific Section
```javascript
// In browser console:
const bestSellers = document.querySelectorAll('[key*="best-seller"]');
console.log('Best sellers found:', bestSellers.length);

// Should show items without key-related errors
```

---

## Complete Test Flow - All Steps

```bash
#!/bin/bash
# Complete testing script

echo "=== QRIS Integration Test Suite ==="
echo

# 1. Setup
echo "1. Setting up..."
php artisan cache:clear
php artisan config:clear
echo "✅ Cache cleared"
echo

# 2. Create test order
echo "2. Creating test order..."
ORDER_ID=123  # Replace with actual order ID created via frontend
echo "✅ Test order ID: $ORDER_ID"
echo

# 3. Check QRIS creation
echo "3. Testing QRIS payment creation..."
LOGS=$(grep "QRIS transaction created" storage/logs/laravel.log | tail -1)
if [ -n "$LOGS" ]; then
    echo "✅ QRIS creation logged"
else
    echo "❌ QRIS creation NOT logged"
fi
echo

# 4. Check database
echo "4. Checking database..."
mysql -u root -p 5scent_db << EOF
SELECT 
    CASE 
        WHEN midtrans_transaction_id IS NOT NULL THEN '✅ Has transaction ID'
        ELSE '❌ Missing transaction ID'
    END as transaction_id_check,
    CASE 
        WHEN qr_url LIKE 'https://api.sandbox.midtrans.com/%' THEN '✅ Has valid QR URL'
        ELSE '❌ Invalid QR URL'
    END as qr_url_check,
    CASE 
        WHEN raw_notification IS NOT NULL THEN '✅ Has raw notification'
        ELSE '❌ Missing raw notification'
    END as raw_notification_check
FROM qris_transactions
WHERE order_id = $ORDER_ID;
EOF
echo

# 5. Test settlement
echo "5. Testing webhook settlement..."
TRANSACTION_ID=$(mysql -u root -p 5scent_db -N -e \
    "SELECT midtrans_transaction_id FROM qris_transactions WHERE order_id = $ORDER_ID LIMIT 1")

curl -X POST http://localhost:8000/api/midtrans/notification \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ORDER-'$ORDER_ID'-xxx",
    "transaction_id": "'$TRANSACTION_ID'",
    "transaction_status": "settlement",
    "payment_type": "qris"
  }' 2>/dev/null

echo "✅ Webhook sent"
sleep 2

# 6. Verify updates
echo "6. Verifying database updates after settlement..."
mysql -u root -p 5scent_db << EOF
SELECT 
    CASE 
        WHEN o.status = 'Packaging' THEN '✅ Order → Packaging'
        ELSE '❌ Order status: ' || o.status
    END as order_status_check,
    CASE 
        WHEN p.status = 'success' THEN '✅ Payment → Success'
        ELSE '❌ Payment status: ' || p.status
    END as payment_status_check,
    CASE 
        WHEN qt.status = 'settlement' THEN '✅ QRIS → Settlement'
        ELSE '❌ QRIS status: ' || qt.status
    END as qris_status_check
FROM orders o
LEFT JOIN payment p ON o.order_id = p.order_id
LEFT JOIN qris_transactions qt ON o.order_id = qt.order_id
WHERE o.order_id = $ORDER_ID;
EOF
echo

# 7. Check logs
echo "7. Checking logs..."
SETTLEMENT_LOGS=$(grep -c "Order auto-transitioned to Packaging" storage/logs/laravel.log)
if [ $SETTLEMENT_LOGS -gt 0 ]; then
    echo "✅ Settlement logged $SETTLEMENT_LOGS time(s)"
else
    echo "❌ Settlement NOT logged"
fi
echo

echo "=== Test Complete ==="
```

---

## Troubleshooting Commands

### If QRIS Creation Fails
```bash
# Check logs
tail -30 storage/logs/laravel.log | grep -i "qris\|midtrans\|error"

# Check Midtrans configuration
php artisan tinker
>>> config('midtrans.server_key')  // Should not be empty
>>> config('midtrans.is_production')  // Should be false

# Test Midtrans connectivity
curl -X GET https://api.sandbox.midtrans.com/v2/ping

# Response: { "ping": "pong" }
```

### If Webhook Doesn't Update
```bash
# Check ngrok is running and has correct URL
# In Midtrans settings, verify:
# Settings → Configuration → Notification URL
# Should be: https://{your-id}.ngrok-free.dev/api/midtrans/notification

# Test webhook manually
curl -X POST http://localhost:8000/api/midtrans/notification \
  -H "Content-Type: application/json" \
  -d '{"order_id":"TEST","transaction_status":"settlement"}'

# Should respond: { "status": "ok" }

# Check logs
grep "Midtrans notification" storage/logs/laravel.log
```

### If Database Not Updating
```bash
# Check if event listener is firing
grep "PaymentTransaction status changed" storage/logs/laravel.log

# Check order relationship
php artisan tinker
>>> $pt = \App\Models\PaymentTransaction::find(1);
>>> $pt->order  // Should load order
>>> $pt->order->status  // Check status
```

### If Admin Dashboard Has Errors
```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev

# Check browser console
# Press F12, go to Console tab
# Should be completely clean (no errors)

# If still errors, check specific component
grep -n "key=" app/admin/dashboard/page.tsx
# All keys should be unique
```

---

## Performance Check

```bash
# Measure API response time
time curl -X POST http://localhost:8000/api/payments/qris/create \
  -H "Content-Type: application/json" \
  -d '{"order_id": 123}'

# Expected: < 2 seconds (including Midtrans API call)

# Check database query performance
mysql -u root -p 5scent_db
mysql> EXPLAIN SELECT * FROM qris_transactions WHERE order_id = 123;
# Should use index on order_id
```

---

## Final Validation Checklist

```
REQUIREMENT                              COMMAND/LOCATION            EXPECTED RESULT
─────────────────────────────────────────────────────────────────────────────────
QRIS in Midtrans dashboard              Midtrans Sandbox dashboard   Transaction visible ✅
QR code works                            Frontend QRIS page           Scannable/valid ✅
Database fields populated                MySQL query                 All fields filled ✅
Order auto-status update                 MySQL query                 Packaging/Cancelled ✅
Payment auto-status update               MySQL query                 Success/Failed ✅
Webhook logging                          grep logs                   Both tables updated ✅
No React errors                          Browser F12 console         Clean console ✅
Error handling works                     Bad data test               Proper error response ✅
```

---

**All tests should pass with ✅ marks for production readiness**

**Last Updated:** December 11, 2025
