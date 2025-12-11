# QRIS Payment Testing Guide

## Prerequisites
- Midtrans Sandbox Account: https://dashboard.sandbox.midtrans.com
- Server Key & Client Key from Midtrans dashboard
- Ngrok account for webhook testing: https://ngrok.com
- Laravel server running on `http://localhost:8000`

## Step 1: Configure Environment Variables

Edit `.env` file:

```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true
```

Get your credentials from: https://dashboard.sandbox.midtrans.com/settings/config/development

## Step 2: Start Development Environment

```bash
# Terminal 1: Laravel Server
cd backend/laravel-5scent
php artisan serve
# Server runs on http://localhost:8000

# Terminal 2: Ngrok Tunnel
ngrok http 8000
# Note the URL: https://xxxxxxxx.ngrok.io

# Terminal 3: (Optional) Watch logs
cd backend/laravel-5scent
tail -f storage/logs/laravel.log
```

## Step 3: Configure Midtrans Webhook

1. Go to: https://dashboard.sandbox.midtrans.com/settings/config/notification_url
2. Under "PAYMENT NOTIFICATION URL", set:
   ```
   https://YOUR_NGROK_URL/api/midtrans/notification
   ```
3. Save changes

Example:
```
https://abc123xyz.ngrok.io/api/midtrans/notification
```

## Step 4: Test QRIS Payment Creation

### Create an Order First
```bash
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "product_id": 1,
    "size": "30ml",
    "quantity": 1,
    "address_line": "123 Main St",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "district": "South Jakarta",
    "postal_code": "12345",
    "phone_number": "081234567890"
  }'
```

Response (note the `order_id`):
```json
{
  "success": true,
  "order": {
    "order_id": 123,
    "total_price": 100000,
    "status": "pending"
  }
}
```

### Generate QRIS Payment

```bash
curl -X POST http://localhost:8000/api/checkout/qris \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"order_id": 123}'
```

Response:
```json
{
  "success": true,
  "qr_url": "https://api.sandbox.midtrans.com/qris/39121234567890123456789012345",
  "midtrans_order_id": "ORDER-123-1702384800",
  "status": "pending",
  "expired_at": "2025-12-11T10:05:00Z"
}
```

## Step 5: Simulate Payment

1. Copy the `qr_url` from response
2. Open it in browser (or use curl):
   ```bash
   curl "https://api.sandbox.midtrans.com/qris/39121234567890123456789012345"
   ```
3. This opens the QRIS payment simulator
4. Click "Confirm" or "Simulate Payment"
5. You should see in Terminal 3 (logs):
   ```
   [2025-12-11 10:01:00] laravel.INFO: Midtrans notification received
   [2025-12-11 10:01:01] laravel.INFO: Order marked as paid and moved to packaging
   ```

## Step 6: Verify Payment Status

Check if order was updated:
```bash
curl http://localhost:8000/api/orders/123 \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

Should show:
```json
{
  "order_id": 123,
  "status": "Packaging",
  "payment_status": "success"
}
```

Check payment transaction record:
```bash
# In Laravel tinker
php artisan tinker

>>> $order = App\Models\Order::find(123);
>>> $order->paymentTransaction;
```

Should show:
```
PaymentTransaction {
  qris_transaction_id: 1,
  order_id: 123,
  midtrans_order_id: "ORDER-123-1702384800",
  status: "settlement",
  gross_amount: 100000,
  expired_at: "2025-12-11 10:05:00"
}
```

## Step 7: Test Expiry

QRIS codes expire after 5 minutes. To test:

1. Generate QRIS for an order
2. Wait or modify `expired_at` in database
3. Try to simulate payment after expiry
4. Order should show `payment_status: "expired"`

```bash
# Check qris_transactions table
SELECT * FROM qris_transactions WHERE order_id = 123;
```

Expected status progression:
```
pending → settlement (successful payment)
pending → expire (5 minutes passed without payment)
pending → cancel (customer cancelled)
pending → deny (fraud detection)
```

## Troubleshooting

### Issue: "Webhook not received"
- Check ngrok URL is correct in Midtrans dashboard
- Verify ngrok tunnel is running
- Check logs: `tail -f storage/logs/laravel.log`
- Test webhook manually:
  ```bash
  curl -X POST https://YOUR_NGROK_URL/api/midtrans/notification \
    -H "Content-Type: application/json" \
    -d '{
      "order_id": "ORDER-123-1702384800",
      "transaction_status": "settlement",
      "transaction_id": "test123",
      "gross_amount": "100000"
    }'
  ```

### Issue: "QR URL not found"
- Check Midtrans API response in logs
- Verify server key is correct
- Ensure sandbox account has QRIS payment enabled

### Issue: "Order not in pending status"
- Order must have `status = "Pending"` (capital P)
- Check current order status: `select * from orders where order_id = 123;`

### Issue: "Order has already been paid"
- QR code already processed
- Generate new QRIS for different order
- Or reset order status in database (dev only)

## Database Inspection

```bash
php artisan tinker

# Check order
>>> $order = App\Models\Order::find(123);
>>> $order->status;
>>> $order->payment_status;

# Check payment transaction
>>> $order->paymentTransaction;
>>> $order->paymentTransaction->status;
>>> $order->paymentTransaction->expired_at;

# Check raw notification
>>> $order->paymentTransaction->raw_notification;
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 404 on `/api/checkout/qris` | Route not registered | Check `routes/api.php` has the route |
| 401 Unauthorized | Missing auth token | Add valid `Authorization: Bearer` header |
| 400 "Order not found" | Wrong order_id | Verify order exists: `select * from orders where order_id = X;` |
| 400 "Order not in pending" | Order already processed | Reset order: `update orders set status = 'Pending' where order_id = X;` |
| 500 "Failed to generate QR" | Midtrans API error | Check server key in .env, verify API key is valid |
| Webhook not received | Ngrok not running | Check `ngrok http 8000` is running in Terminal 2 |
| 200 but webhook ignored | Order not found | Check order_id format: `ORDER-123-1702384800` |

## Next: Frontend Implementation

Once backend testing passes, implement frontend:

1. **Show QR Code**:
   ```jsx
   <img src={qrUrl} alt="QRIS QR Code" />
   ```

2. **Countdown Timer**:
   ```jsx
   const timeLeft = new Date(expiredAt) - new Date();
   const minutes = Math.floor(timeLeft / 60000);
   const seconds = Math.floor((timeLeft % 60000) / 1000);
   ```

3. **Poll Status**:
   ```jsx
   useEffect(() => {
     const interval = setInterval(async () => {
       const response = await axios.get(`/api/orders/${orderId}`);
       if (response.data.payment_status === 'success') {
         redirect('/orders');
       }
     }, 5000);
     return () => clearInterval(interval);
   }, []);
   ```

4. **Handle Expiry**:
   - Show "QR Expired" message when time runs out
   - Provide "Generate New QR" button
   - Clear expired QR from display

---

**Last Updated**: December 11, 2025
**Status**: Ready for Testing ✅
