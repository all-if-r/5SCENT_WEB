# QRIS Payment Page - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Terminal 1: Start Laravel
```bash
cd backend/laravel-5scent
php artisan serve
# ✅ Runs on http://localhost:8000
```

### Terminal 2: Start Ngrok Tunnel
```bash
& "E:\ngrok\ngrok.exe" http 8000
# ✅ Will show URL like: https://mariela-nondiametral-translucently.ngrok-free.dev
```

**IMPORTANT**: If you get a NEW ngrok URL (it changes when you restart), update it in:
- Midtrans Dashboard → Payment Settings → Notification URL
- Set to: `https://YOUR_NEW_URL/api/midtrans/notification`

### Terminal 3: Start Next.js Frontend
```bash
cd frontend
npm run dev
# ✅ Runs on http://localhost:3000
```

---

## 📋 Testing Flow

### 1. Create an Order
```bash
# Visit http://localhost:3000
# Add product to cart
# Proceed to checkout
# Select QRIS payment
# Confirm order
```

### 2. QRIS Page Loads
```
http://localhost:3000/orders/[orderId]/qris
```

You should see:
- ✅ Green checkmark icon
- QR Code (displayed with image from Midtrans)
- Countdown: "Payment expires in 5:00"
- Order Summary with:
  - Order Code: #ORD-DD-MM-YYYY-XXX
  - Customer Name
  - Total Items
  - Total Amount

### 3. Simulate Payment
1. Get the QR URL from page
2. Open it in browser (or get QR from page)
3. Midtrans simulator will appear
4. Click "Confirm Payment" or "Simulate Payment"

### 4. Watch Magic Happen ✨
The page will:
- Keep polling every 5 seconds
- Detect payment completion via webhook
- Show success state
- Auto-redirect to orders page

---

## 🧪 Testing Checklist

- [ ] QR code displays properly
- [ ] Countdown shows 5:00 and decrements
- [ ] Download QR button works
- [ ] Payment simulation completes
- [ ] Frontend detects payment (watch console logs)
- [ ] Success state appears
- [ ] Auto-redirect works
- [ ] Order status changed to "Packaging"

---

## 🔍 Check If It's Working

### Check Backend Logs
```bash
cd backend/laravel-5scent
tail -f storage/logs/laravel.log
```

Watch for:
```
[2025-12-11 10:00:01] laravel.INFO: Creating QRIS payment
[2025-12-11 10:00:02] laravel.INFO: QRIS payment created successfully
[2025-12-11 10:00:15] laravel.INFO: Midtrans notification received
[2025-12-11 10:00:16] laravel.INFO: Order marked as paid and moved to packaging
```

### Check Frontend Console
Open DevTools (F12) in browser:
```
✅ Polling: checking payment status
✅ Payment successful! Order status updated to settlement
```

### Check Database
```bash
cd backend/laravel-5scent
php artisan tinker

>>> $order = App\Models\Order::find(YOUR_ORDER_ID);
>>> $order->status;                          // Should be "Packaging"
>>> $order->paymentTransaction->status;      // Should be "settlement"
```

---

## ❌ Common Issues

### Issue: "ngrok: The term 'ngrok' is not recognized"
**Solution**: Use full path:
```bash
& "E:\ngrok\ngrok.exe" http 8000
```

### Issue: "QR code not showing"
**Solution**: Check browser console (F12) for errors. Verify:
- [ ] Ngrok tunnel is running
- [ ] Laravel server is running
- [ ] API endpoint returns QR URL

### Issue: "Webhook not received"
**Solution**: 
1. Check Midtrans dashboard notification URL is correct
2. Verify ngrok tunnel is active (should show connections)
3. Check Laravel logs for webhook receipt

### Issue: "Payment page stuck on waiting"
**Solution**: Check:
- [ ] Ngrok tunnel still running?
- [ ] Did you simulate payment in Midtrans?
- [ ] Open browser console - any errors?

---

## 📱 UI Layout

```
┌─────────────────────────────────┐
│  5SCENT  |  Home  |  Products   │  ← Navbar
├─────────────────────────────────┤
│                                 │
│         ✅ Success Icon         │
│    Order Confirmed!             │  ← Header
│   Please complete payment...    │
│                                 │
│    ┌──────────────────────┐     │
│    │                      │     │
│    │   ██  ██  ██  ██    │     │  ← QR Card
│    │   ██  ██  ██  ██    │     │
│    │   ██  ██  ██  ██    │     │
│    │                      │     │
│    │  ⏱ Payment expires   │     │
│    │    in 5:00           │     │
│    │                      │     │
│    │  [Download QR]       │     │
│    └──────────────────────┘     │
│                                 │
│   Order Summary                 │
│   Order Code    #ORD-11-12-... │
│   Customer      John Doe        │
│   Total Items   1 item(s)       │
│   Total Amount  Rp78.750        │
│                                 │
│   How to Pay:                   │
│   1. Open QRIS app...          │
│   2. Scan QR...                │
│   3. Confirm...                │
│                                 │
│   [Back to Homepage] [My Orders]│
│                                 │
└─────────────────────────────────┘
```

---

## 📊 What's Happening Behind the Scenes

```
Frontend                          Backend                 Midtrans
────────────────────────────────────────────────────────────────
User completes
checkout
         │
         ├─ POST /checkout/qris ──→ Generate QRIS charge
         │                         ├─ Create payment record
         │                         └─ Return QR URL
         │
Redirect to QRIS page
         │
         ├─ GET /qris-detail ────→ Fetch order data
         │
Display QR + Countdown
         │
         ├─ Poll payment status every 5s
         │     ↓ (waiting for payment)
         │     ↓
         │     ↓
Customer scans QR
& completes payment               ──→ Process payment
         │                        ├─ Send webhook
         │                        └─ Webhook received!
         │
Webhook updates database
         │
←─ Poll detects status ─── GET /payment-status ← Check qris_transactions
         │
Show success state
         │
Auto-redirect to /orders
```

---

## 🔐 Security

- ✅ Only authenticated users can access their QRIS pages
- ✅ Users can only see their own order's QRIS payment
- ✅ Webhook validates order and payment before updating
- ✅ All sensitive data (keys, tokens) in backend only
- ✅ Frontend never sees Midtrans server key

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `app/utils/orderHelpers.ts` | Formatting helpers (order code, currency, countdown) |
| `app/orders/[orderId]/qris/page.tsx` | Server component (data fetching) |
| `app/orders/[orderId]/qris/QrisPaymentClient.tsx` | Client component (UI + polling + countdown) |
| `app/Http/Controllers/OrderQrisController.php` | Backend API endpoints |
| `routes/api.php` | Routes configuration |

---

## 🎯 Next Steps

After testing locally:

1. **Deploy to production**
   - Change Midtrans to production keys
   - Update webhook URL to production domain
   - Set `MIDTRANS_IS_PRODUCTION=true`

2. **Add email notifications**
   - Send "Payment Successful" email
   - Send "Payment Failed" email

3. **Enhance UI**
   - Add loading spinner during polling
   - Add retry button if payment fails
   - Add QR code history

4. **Monitor**
   - Track payment completion rate
   - Alert on webhook failures
   - Log all payment events

---

**Happy Testing! 🚀**

Questions? Check the logs in Terminal 1 or browser DevTools (F12).
