# QRIS Payment Page - Visual Reference & Component Map

## 🎨 UI Component Breakdown

```
┌─────────────────────────────────────────────────────┐
│  NAVBAR                                             │
│  ┌────────────────────────────────────────────────┐ │
│  │ 5SCENT              Home    Products           │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  MAIN CONTENT AREA (Centered)                       │
│                                                     │
│            ✅ SUCCESS ICON (green)                 │
│                                                     │
│           Order Confirmed!                         │
│   Please complete your payment using the          │
│   QR code below                                    │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │         QR CARD (rounded-2xl)           │      │
│  │                                         │      │
│  │         [QR CODE IMAGE HERE]            │      │
│  │         256x256 pixels                  │      │
│  │                                         │      │
│  │   Scan with any QRIS-enabled app        │      │
│  │   ⏱ Payment expires in 5:00             │      │
│  │                                         │      │
│  │   [Download QR Code] (download icon)    │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │    ORDER SUMMARY CARD (rounded-2xl)     │      │
│  │    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │      │
│  │  Order Code                #ORD-11-12... │      │
│  │  Customer Name            Hapis        │      │
│  │  Total Items              1 item(s)    │      │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │      │
│  │  Total Amount             Rp78.750     │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
│  ┌─────────────────────────────────────────┐      │
│  │    HOW TO PAY (blue background)        │      │
│  │    How to Pay:                         │      │
│  │    1. Open any QRIS-enabled app...    │      │
│  │    2. Select "Scan QR" or "QRIS"...   │      │
│  │    3. Scan the QR code above...       │      │
│  │    4. Confirm and complete...         │      │
│  └─────────────────────────────────────────┘      │
│                                                     │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Back to Homepage │  │ View My Orders   │      │
│  │ (white border)   │  │ (black bg)       │      │
│  │ (rounded-full)   │  │ (rounded-full)   │      │
│  └──────────────────┘  └──────────────────┘      │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  FOOTER                                             │
│  ┌──────┬──────────┬────────────────┬──────────┐   │
│  │5SCENT│Quick Links│Customer Service│ Contact │   │
│  │Desc. │About     │Shipping        │+1 555...│   │
│  │      │Products  │Returns         │info@... │   │
│  │      │Contact   │FAQ             │Address  │   │
│  └──────┴──────────┴────────────────┴──────────┘   │
│  © 2024 5SCENT. All rights reserved.               │
└─────────────────────────────────────────────────────┘
```

## 🔄 State Transitions

### State 1: PENDING (Default)
```
When: Page first loads
Show:
  ✅ Icon (green)
  "Order Confirmed!"
  QR Code
  Countdown: "5:00"
  Order Summary
  How to Pay
  Buttons (enabled)
Actions:
  - Polling every 5 seconds
  - Countdown every 1 second
  - Download button works
```

### State 2: EXPIRING SOON (< 1 minute)
```
When: Countdown reaches 1 minute
Show:
  ⚠️ Icon changes to orange
  Countdown text: "0:45"
  "Payment expires in" text: orange
Actions:
  - Same as pending
  - Visual warning to user
```

### State 3: EXPIRED
```
When: Countdown reaches 0:00
Show:
  ❌ "Payment Expired" overlay on QR
  Countdown: "0:00"
  "Payment Expired" message
Actions:
  - Download button: DISABLED
  - Polling: STOPS
  - Can still navigate away
```

### State 4: SUCCESS
```
When: Polling detects settlement status
Show:
  ✅ Icon (large, green)
  "Payment Successful!"
  "Your order is now being packaged..."
  Order Summary (still visible)
  Green toast: "Payment successful!"
Actions:
  - Auto-redirect to /orders after 2 seconds
  - Polling: STOPS
```

## 🎯 Component Interaction Map

```
QrisPaymentClient (Parent)
├── Navbar
│   ├── Brand "5SCENT"
│   └── Nav Links
├── Main Content Area
│   ├── Header Section
│   │   ├── Icon (success/error)
│   │   ├── Title
│   │   └── Subtitle
│   ├── QR Card
│   │   ├── QR Image
│   │   ├── Countdown Timer
│   │   └── Download Button
│   ├── Order Summary Card
│   │   ├── Order Code
│   │   ├── Customer Name
│   │   ├── Total Items
│   │   └── Total Amount
│   ├── How To Pay Box
│   │   └── Numbered Steps
│   └── Button Group
│       ├── Back Button
│       └── Orders Button
└── Footer
    ├── Brand Section
    ├── Quick Links
    ├── Customer Service
    └── Contact Info
```

## 🔌 Hook & Effect Map

```
QrisPaymentClient
├── useRouter() [Next.js]
│   └── router.push() on success
├── useRef()
│   ├── pollingIntervalRef
│   │   └── Stores interval ID
│   └── countdownIntervalRef
│       └── Stores interval ID
├── useState()
│   ├── timeRemaining (number)
│   │   └── Updated every 1s
│   ├── isExpired (boolean)
│   │   └── Set when timer reaches 0
│   ├── isPaymentSuccessful (boolean)
│   │   └── Set when status = 'settlement'
│   └── isLoading (boolean)
│       └── Used for button disabled state
├── useEffect() - Countdown
│   └── setInterval every 1s
│       └── Updates timeRemaining
├── useEffect() - Polling
│   └── setInterval every 5s
│       └── Calls /api/orders/{id}/payment-status
│       └── Clears on success/expired
└── Event Handlers
    ├── handleDownloadQR()
    ├── handleBackToHomepage()
    └── handleViewOrders()
```

## 🎨 Color Palette

```
Primary Colors:
  Black (#000000) - Buttons, headings
  White (#FFFFFF) - Background, text
  Gray (#6B7280) - Secondary text
  
Success States:
  Green (#16A34A) - Icons, badges
  Light Green (#ECFDF5) - Backgrounds
  
Warning States:
  Orange (#EA580C) - Expiring soon
  Light Orange (#FEF3C7) - Warning backgrounds
  
Error States:
  Red (#DC2626) - Expired
  Light Red (#FEE2E2) - Error backgrounds
  
Neutral:
  Gray (#F3F4F6) - Card backgrounds
  Gray (#E5E7EB) - Borders
```

## 📐 Spacing & Layout

```
Container:
  max-w-lg (448px on desktop)
  Full width on mobile
  Centered with mx-auto

Card Padding:
  p-6 to p-8 (24-32px)

Section Gaps:
  mb-4 to mb-8 (16-32px)
  gap-4 to gap-8 (16-32px)

Button Styling:
  py-3 px-4 (12px vertical, 16px horizontal)
  rounded-full (maximum border radius)
  min height: 48px (touch-friendly)

Text Sizing:
  H1: text-3xl font-bold (30px)
  H2: text-xl font-bold (20px)
  Body: text-base (16px)
  Small: text-sm (14px)
```

## 🔊 User Feedback

### Toast Notifications
```
Success:
  "Payment successful! Your order is being prepared."
  Duration: 4 seconds
  Color: Green

Error (Download):
  "Failed to download QR code"
  Duration: 3 seconds
  Color: Red

Error (Payment):
  "Payment expired. Please generate a new QR code."
  Duration: 4 seconds
  Color: Red
```

### Visual Feedback
```
Countdown Text Color:
  Normal (> 1 min): Gray (#6B7280)
  Warning (< 1 min): Orange (#EA580C)
  Expired (= 0): Red (#DC2626)

Icon Animation:
  Initial: Check in green circle
  Success: Check pulse animation (optional)
  
Button States:
  Normal: Hover background change
  Disabled: Gray color, cursor-not-allowed
  Loading: Opacity reduced
```

## 📱 Responsive Breakpoints

```
Mobile (< 640px):
  Full width cards
  Stack buttons vertically
  Smaller padding
  Single column layout
  
Tablet (640px - 1024px):
  Centered cards
  Buttons side-by-side
  Normal padding
  
Desktop (> 1024px):
  max-w-lg centered
  Buttons side-by-side
  Full footer layout
  Navigation visible
```

## 🔄 Data Flow Diagram

```
User                    Frontend              Backend              Midtrans
─────────────────────────────────────────────────────────────────────
  │
  ├─ Complete Order ──→ /checkout/qris ────→ Create QRIS ──────→ API Call
  │                                         ├─ Return QR URL
  │                                         └─ Store in DB
  │
  ├─ Navigate Page ───→ /orders/X/qris ────→ /qris-detail
  │                                         └─ Return Order Data
  │
  ├─ See QR Code      ────────────────────── [Display QR Image]
  │
  ├─ Start Countdown/Polling
  │     ↓ (every 1s)     (every 5s)
  │     ↓                ↓
  │     └─ Update Time ──→ /payment-status ← Check DB status
  │
  │ [Customer scans & pays]
  │                                         ← [Payment received]
  │                                         ├─ Update DB
  │                                         └─ Send Webhook ──→ Ngrok Tunnel
  │
  │                                         ← Webhook received
  │                                         └─ Update qris_transactions
  │
  ├─ Next Poll ───────→ /payment-status ← Detect change
  │                     └─ settlement!
  │
  ├─ Show Success ────── Auto-redirect ──→ /orders/X
  │
  └─ Order Confirmed! ✨
```

## 🎯 Click Targets & Touch Zones

All buttons have minimum 48x48px touch target:
```
[Back to Homepage] ═════════════════════ 48px min height
[View My Orders]   ═════════════════════ 48px min height
[Download QR]      ═════════════════════ 48px min height
```

Navigation links in footer also have adequate spacing.

## 🔐 Security Visual Indicators

- HTTPS URLs only (Midtrans)
- Secure communication via Bearer token
- No sensitive data visible in DOM
- Token stored in localStorage (secure for demo)
- All API calls validated server-side

---

**This document provides complete visual reference for the QRIS Payment Detail Page UI and interaction patterns.**

For code implementation details, see: `QRIS_PAYMENT_PAGE_COMPLETE.md`
For quick setup, see: `QRIS_QUICK_START.md`
