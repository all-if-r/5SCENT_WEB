# QRIS Payment System - Bug Fixes Summary

## Issues Fixed

### 1. **500 Error on markQrisExpired Endpoint** ✅ FIXED

**Root Cause**: Database schema mismatch
- The `PaymentTransaction` model was configured to use `qris_transactions` table
- But the migration was creating `payment_transactions` table
- When the endpoint tried to query `payment_transactions`, it failed with 500 error

**Solution Applied**:
1. Updated migration `2025_12_11_000001_create_payment_transactions_table.php` to:
   - Create `qris_transactions` table instead of `payment_transactions`
   - Use correct primary key `qris_transaction_id` with `$table->id('qris_transaction_id')`
   - Add `'expired'` status to the enum values
   - Properly drop conflicting tables to avoid migration conflicts

2. Updated `OrderQrisController::markQrisExpired()` method to:
   - Use raw DB query with correct table name: `DB::table('qris_transactions')`
   - Add comprehensive error logging with stack trace
   - Return detailed error messages for debugging
   - Add `DB` import: `use Illuminate\Support\Facades\DB;`

**Files Modified**:
- `backend/laravel-5scent/database/migrations/2025_12_11_000001_create_payment_transactions_table.php`
- `backend/laravel-5scent/app/Http/Controllers/OrderQrisController.php`

**Testing Steps**:
1. Run migrations: `php artisan migrate`
2. Create a QRIS payment for an order
3. Wait for it to expire (1 minute)
4. Refresh the page
5. Check that:
   - No 500 error is returned
   - Order status changes to "Cancelled"
   - Payment notification appears in sidebar saying "Your payment has expired"
   - Database shows order status as 'Cancelled' and qris_transactions status as 'expired'

---

### 2. **Timer Shows 2 Minutes Instead of 1 Minute** ⚠️ INVESTIGATION NEEDED

**Current Status**: Code appears correct but behavior reported as incorrect

**Code Review Findings**:
- Backend correctly sets `addMinutes(1)` in QrisPaymentController
- Frontend correctly caps at `Math.min(remaining, 60000)` which is 1 minute = 60,000ms
- The `formatCountdown()` function correctly converts milliseconds to MM:SS format

**Hypothesis**:
- Could be timezone mismatch between client and server
- Could be stale browser cache
- Could be visual misreading of the display
- Could be Midtrans API returning different expiry than what we set

**Testing Steps**:
1. Clear browser cache completely
2. Create fresh QRIS payment
3. Check browser console - look at initial `timeRemaining` value from QrisPaymentClient
4. If it's 120000 (2 minutes), the backend is returning 2-minute expiry
5. If it's 60000 (1 minute), but displays as 2:00, there's a UI calculation issue

**Debug Code** (add to QrisPaymentClient.tsx after useState):
```tsx
console.log('Initial expiry time:', qris.expired_at);
console.log('Current time:', new Date().toISOString());
const now = new Date().getTime();
const expireTime = new Date(qris.expired_at).getTime();
console.log('Time remaining (ms):', Math.max(0, expireTime - now));
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] Run `php artisan migrate` to apply the updated migration
- [ ] Verify `qris_transactions` table exists with correct schema:
  - [ ] Primary key: `qris_transaction_id`
  - [ ] Columns: order_id, midtrans_order_id, midtrans_transaction_id, payment_type, gross_amount, qr_url, status, expired_at, raw_notification, created_at, updated_at
  - [ ] Status enum includes: 'pending', 'settlement', 'expire', 'cancel', 'deny', 'expired'
- [ ] Verify no `payment_transactions` table exists
- [ ] Test QRIS payment creation
- [ ] Test QRIS expiry handling

---

## Expected Behavior After Fixes

### Payment Expiry Flow:
1. User views QRIS payment page at `/orders/{orderId}/qris`
2. Timer counts down from 1:00 to 0:00
3. When timer reaches 0:00:
   - Frontend detects expiry via timestamp comparison
   - Calls `POST /api/orders/{orderId}/qris-expired`
   - Backend updates order status to "Cancelled"
   - Backend updates qris_transactions status to "expired"
   - Backend creates notification: "Your payment has expired. Please create a new payment."
   - Frontend shows "Payment Expired" screen with red styling
   - User can generate new payment or go back to orders list

### If Payment Made Before Expiry:
1. User scans QR code and completes payment
2. Midtrans sends webhook notification (via ngrok tunnel)
3. Backend receives webhook and updates qris_transactions status to "settlement"
4. Frontend polling detects status change
5. Frontend shows "Payment successful!" message
6. User redirected to order page after 2 seconds

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `database/migrations/2025_12_11_000001_create_payment_transactions_table.php` | Create `qris_transactions` instead of `payment_transactions`, add `'expired'` to status enum |
| `app/Http/Controllers/OrderQrisController.php` | Add DB import, fix `markQrisExpired()` to use `DB::table('qris_transactions')` with error logging |

---

## Rollback Steps (if needed)

If something goes wrong:
1. Run `php artisan migrate:rollback`
2. The migration will:
   - Drop the `qris_transactions` table
   - This will clear all QRIS payment records (data loss)
3. Revert the OrderQrisController.php changes from version control
4. Re-run migrations once issues are resolved

