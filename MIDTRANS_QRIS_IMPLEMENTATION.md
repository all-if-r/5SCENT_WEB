# Midtrans QRIS Integration - Implementation Complete ✅

## Summary
Successfully integrated Midtrans QRIS Core API for handling QR code-based payments. The implementation includes:
- QRIS payment initiation with 5-minute expiry
- Webhook notification handling for payment status updates
- Automatic order status updates on successful payment
- Proper error handling and logging

## Database Schema
**Table**: `qris_transactions`
```
- qris_transaction_id (BIGINT, Primary Key, AUTO_INCREMENT)
- order_id (BIGINT, Foreign Key → orders.order_id)
- midtrans_order_id (VARCHAR 50)
- midtrans_transaction_id (VARCHAR 100, nullable)
- payment_type (VARCHAR 20) - e.g., 'qris'
- gross_amount (BIGINT, unsigned)
- qr_url (TEXT)
- status (ENUM: pending, settlement, expire, cancel, deny)
- expired_at (DATETIME)
- raw_notification (LONGTEXT) - Stores raw JSON from Midtrans
- created_at, updated_at (TIMESTAMP)
```

## Models

### PaymentTransaction.php
```php
- Table: qris_transactions
- Primary Key: qris_transaction_id
- Relationship: belongsTo(Order::class, 'order_id')
- Casts: raw_notification as json
```

### Order.php (Updated)
```php
- New Relationship: paymentTransaction() → hasOne(PaymentTransaction::class, 'order_id', 'order_id')
- Allows: $order->paymentTransaction()->get()
```

## API Endpoints

### 1. Create QRIS Payment (Protected Route)
**POST** `/api/checkout/qris`

**Request**:
```json
{
  "order_id": 123
}
```

**Response (Success)**:
```json
{
  "success": true,
  "qr_url": "https://api.sandbox.midtrans.com/qris/...",
  "midtrans_order_id": "ORDER-123-1702384800",
  "status": "pending",
  "expired_at": "2025-12-11T10:05:00Z",
  "message": "QRIS payment created successfully"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "message": "Order has already been paid" | "Order is not in pending status" | etc.
}
```

### 2. Midtrans Webhook Notification (Public Route)
**POST** `/api/midtrans/notification`

**Incoming Payload from Midtrans**:
```json
{
  "transaction_time": "2025-12-11 10:00:00",
  "transaction_status": "settlement",
  "transaction_id": "abc123def456",
  "order_id": "ORDER-123-1702384800",
  "payment_type": "qris",
  "gross_amount": "100000.00",
  "fraud_status": "accept"
}
```

**Response (Always 200)**:
```json
{
  "status": "ok"
}
```

## Controllers

### QrisPaymentController.php
**Method**: `createQrisPayment(Request $request)`

**Flow**:
1. Validate order_id exists and is in pending status
2. Check if payment already settled (prevent duplicates)
3. Configure Midtrans SDK
4. Build QRIS charge payload with 5-minute expiry:
   - payment_type: 'qris'
   - custom_expiry: 5 minutes from order time
   - qris acquirer: 'gopay'
5. Call `Midtrans\CoreApi::charge($payload)`
6. Extract QR URL from response actions array
7. Create/update qris_transactions record with:
   - midtrans_order_id, midtrans_transaction_id, qr_url
   - status: 'pending'
   - expired_at: now + 5 minutes
8. Return QR URL and expiration to frontend

**Error Handling**:
- Validates order_id existence
- Checks order status (must be pending)
- Prevents re-payment if already settled
- Logs all operations and errors
- Returns descriptive error messages

### MidtransNotificationController.php
**Method**: `handleNotification(Request $request)`

**Flow**:
1. Receive Midtrans webhook notification
2. Log incoming payload
3. Extract order_id (from "ORDER-{order_id}-{timestamp}" format)
4. Find Order by order_id
5. Find or create PaymentTransaction record
6. Update PaymentTransaction:
   - status: Map Midtrans transaction_status
   - raw_notification: Store full JSON payload
7. Update linked Order based on payment status:
   - **settlement**: payment_status='success', order_status='pending'→'packaging'
   - **expire**: payment_status='expired', order_status unchanged
   - **cancel/deny**: payment_status='failed', order_status unchanged
8. Return HTTP 200 (always, to acknowledge receipt)

**Status Mappings**:
- 'capture' or 'settlement' → 'settlement'
- 'pending' → 'pending'
- 'expire' → 'expire'
- 'cancel' → 'cancel'
- 'deny' or 'failure' → 'deny'

## Service Layer

### MidtransService.php (Enhanced)
**Static Method**: `configure(): void`

**Purpose**: Initialize Midtrans SDK for Core API usage

**Configuration**:
```php
Config::$serverKey = config('midtrans.server_key')
Config::$clientKey = config('midtrans.client_key')
Config::$isProduction = config('midtrans.is_production', false)
Config::$isSanitized = config('midtrans.is_sanitized', true)
Config::$is3ds = config('midtrans.is_3ds', true)
```

**Usage**:
```php
MidtransService::configure();
$response = \Midtrans\CoreApi::charge($payload);
```

## Configuration

### .env
```
MIDTRANS_SERVER_KEY=YOUR_MIDTRANS_SANDBOX_SERVER_KEY_HERE
MIDTRANS_CLIENT_KEY=YOUR_MIDTRANS_SANDBOX_CLIENT_KEY_HERE
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
```

### config/midtrans.php
```php
return [
    'server_key' => env('MIDTRANS_SERVER_KEY'),
    'client_key' => env('MIDTRANS_CLIENT_KEY'),
    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
    'is_sanitized' => env('MIDTRANS_IS_SANITIZED', true),
    'is_3ds' => env('MIDTRANS_IS_3DS', true),
];
```

## Frontend Integration Flow

### Buy Now → QRIS Checkout → Payment Success

**Step 1**: User clicks "Buy Now" on product
```
GET /checkout?mode=buy-now
```

**Step 2**: Frontend displays checkout summary with "Pay with QRIS" button

**Step 3**: User clicks "Pay with QRIS"
```
POST /api/checkout/qris
Body: { "order_id": 123 }
```

**Step 4**: Frontend receives QR URL
```json
{
  "qr_url": "https://api.sandbox.midtrans.com/qris/...",
  "expired_at": "2025-12-11T10:05:00Z"
}
```

**Step 5**: Frontend displays QRIS QR code
- Show QR image via `<img src={qr_url} />`
- Display countdown timer from expired_at
- Show expiry warning when < 1 minute remaining
- Poll order status every 5 seconds

**Step 6**: Customer scans with QRIS-capable app (e.g., GCash, Gopay)
- Completes payment in Midtrans sandbox simulator
- Midtrans sends webhook to `/api/midtrans/notification`

**Step 7**: Webhook updates order and payment records
- PaymentTransaction.status → 'settlement'
- Order.order_status → 'packaging'
- Order.payment_status → 'success'

**Step 8**: Frontend poll detects order status change
- Redirects to `/orders` with success message
- Shows "Payment Successful" notification

## Testing with Ngrok

### Setup (One Time)
```bash
# Login to ngrok account
ngrok config add-authtoken YOUR_AUTH_TOKEN

# Generate ngrok URL
ngrok http 8000
```

### Configuration in Midtrans Dashboard
1. Go to: https://dashboard.sandbox.midtrans.com/settings/config/notification_url
2. Set URL to: `https://YOUR_NGROK_URL/api/midtrans/notification`
3. Save changes

### Test Flow
```bash
# Terminal 1: Start Laravel server
cd backend/laravel-5scent
php artisan serve

# Terminal 2: Start ngrok tunnel
ngrok http 8000
# Copy the URL shown (e.g., https://abc123.ngrok.io)

# Terminal 3: Test with cURL
curl -X POST http://localhost:8000/api/checkout/qris \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"order_id": 123}'

# Response includes QR URL
# Go to Midtrans Sandbox: https://app.sandbox.midtrans.com/qris/simulator
# Enter the order_id shown in response
# Simulate payment
# Check webhook was received
```

## Security Considerations

1. **Webhook Verification**: 
   - Midtrans sends X-Signature header
   - Should verify signature before processing (recommended but optional)
   - Currently logs all notifications for audit trail

2. **Foreign Key Constraints**:
   - cascade delete: Deleting order automatically removes payment record
   - Prevents orphaned payment records

3. **Error Handling**:
   - All errors logged to `storage/logs/laravel.log`
   - Webhook endpoint returns 200 even on error (prevents retries)
   - QR creation failures return descriptive error messages

4. **Rate Limiting**:
   - Consider adding rate limit to `/api/checkout/qris` in production
   - Webhook endpoint already public (no auth required)

## Logging

All operations logged to `storage/logs/laravel.log`:
- Order validation failures
- QRIS payment creation attempts
- Midtrans API responses
- Webhook notifications received
- Order status update operations
- All errors with full stack traces

**Log Examples**:
```
[2025-12-11 10:00:00] laravel.INFO: Creating QRIS payment {"order_id":123,"midtrans_order_id":"ORDER-123-1702384800","payload":{...}}
[2025-12-11 10:00:01] laravel.INFO: QRIS payment created successfully {"order_id":123,"payment_transaction_id":1,"qr_url":"https://..."}
[2025-12-11 10:01:00] laravel.INFO: Midtrans notification received {"order_id":"ORDER-123-1702384800","transaction_status":"settlement","payload":{...}}
[2025-12-11 10:01:01] laravel.INFO: Order marked as paid and moved to packaging {"order_id":123}
```

## Summary of Changes

✅ **Database**: 
- Created `qris_transactions` table with proper foreign key and indexes

✅ **Models**:
- Updated `PaymentTransaction` to use `qris_transactions` table and `qris_transaction_id` primary key
- Updated `Order` relationship: `paymentTransaction()` with correct foreign key mapping

✅ **Controllers**:
- Created `QrisPaymentController` with QRIS charge creation logic
- Created `MidtransNotificationController` with webhook handling and order updates

✅ **Services**:
- Enhanced `MidtransService` with static `configure()` method for Core API initialization

✅ **Routes**:
- Added POST `/api/checkout/qris` (protected) → QrisPaymentController
- Added POST `/api/midtrans/notification` (public) → MidtransNotificationController

✅ **Configuration**:
- Added Midtrans config to `.env` with placeholders
- Verified `config/midtrans.php` reads all environment variables

## Next Steps for Frontend

1. **QR Display Component**:
   - Show QR image at `${qr_url}`
   - Display expiry countdown
   - Auto-refresh/redirect on payment success

2. **Polling Logic**:
   - Poll `/api/orders/{order_id}` every 5 seconds
   - Check `payment_status === 'success'`
   - Redirect to `/orders` with success toast

3. **Error Handling**:
   - Show "QR expired" message if expired_at passed
   - Provide "Generate new QR" button
   - Display Midtrans error messages to user

## Deployment Notes

Before going live:
1. Replace sandbox credentials with production credentials in `.env`
2. Set `MIDTRANS_IS_PRODUCTION=true` in `.env`
3. Enable webhook signature verification in MidtransNotificationController
4. Configure Midtrans dashboard with production ngrok/domain URL
5. Test full flow in production sandbox first
6. Monitor logs for any issues
7. Set up alerts for failed payments and webhook failures

---

**Implementation Date**: December 11, 2025
**Status**: ✅ Complete and Ready for Testing
**Midtrans SDK Version**: 2.6.2
**Laravel Version**: 12.0+
