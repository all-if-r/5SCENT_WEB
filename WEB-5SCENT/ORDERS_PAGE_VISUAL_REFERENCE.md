# Orders Page Visual Reference Guide

## 📱 Order Card Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Order #ORD-2024-002                      [Shipped - Purple] │
│ 2024-11-08                                                   │
├─────────────────────────────────────────────────────────────┤
│ 📦 Tracking: 5SCENT2024001TRK                        [Copy] │
├─────────────────────────────────────────────────────────────┤
│ [Thumb] Morning Dew                                 Rp 119.000
│         50ml × 1                                           
│ [Thumb] Midnight Rose                               Rp 159.000
│         50ml × 1                                           
├─────────────────────────────────────────────────────────────┤
│ Payment Method                              QRIS            │
│ Total                                       Rp 278.000      │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┬──────────────────────────────────────┐ │
│ │  See Details     │   Mark as Received (Shipping)       │ │
│ │  (outline)       │   OR                                │ │
│ │                  │   Cancel Order (Packaging - red)    │ │
│ │                  │   OR                                │ │
│ │                  │   Give/Edit Review (Delivered)      │ │
│ └──────────────────┴──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Modal: Confirm Order Received

```
                    ┌─────────────────────────┐
                    │ Confirm Order Received  │
                    ├─────────────────────────┤
                    │                         │
                    │ Has your order arrived  │
                    │ correctly and in good   │
                    │ condition?              │
                    │                         │
                    │ ┌─────────┬───────────┐ │
                    │ │Not Yet  │Yes,Rcvd  │ │
                    │ └─────────┴───────────┘ │
                    └─────────────────────────┘
                  (Semi-transparent overlay)
```

## ❌ Modal: Cancel Order

```
                    ┌─────────────────────────┐
                    │    Cancel Order         │
                    ├─────────────────────────┤
                    │                         │
                    │ Are you sure you want   │
                    │ to cancel this order?   │
                    │ This action cannot      │
                    │ be undone.              │
                    │                         │
                    │ ┌──────────┬──────────┐ │
                    │ │Keep Order│Yes,Cancel│ │
                    │ └──────────┴──────────┘ │
                    └─────────────────────────┘
                  (Semi-transparent overlay)
```

## 📋 Order Details Modal: Tracking Information

```
┌─────────────────────────────────────────────────────────────┐
│ Order #ORD-2024-002                                         │
├─────────────────────────────────────────────────────────────┤
│ Customer Information                                         │
│ [Card with name, phone]                                     │
├─────────────────────────────────────────────────────────────┤
│ Shipping Address                                            │
│ 📍 456 Park Avenue, Manhattan, New York, NY 10022          │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Tracking Information                    [Light Purple]│   │
│ │ 📦 Tracking Number                                 [Copy]│
│ │    5SCENT2024001TRK                                  │   │
│ └───────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│ Order Items                                                 │
│ [Items list with images, sizes, quantities, prices]        │
├─────────────────────────────────────────────────────────────┤
│ Your Reviews (if any)                                       │
│ [Reviews with ratings and comments]                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 State Flow Diagram

### Shipping to Delivered Flow
```
Order Card (Shipping)
        ↓
   [Mark as Received]
        ↓
Confirmation Modal Opens
        ↓
    User Confirms
        ↓
   API Call: POST /orders/{id}/finish
        ↓
   State Updates (Optimistic)
        ↓
Modal Closes
        ↓
Order Card (Delivered) with Review Button
        ↓
Tracking Row Still Visible with "Edit Review"
```

### Packaging to Cancelled Flow
```
Order Card (Packaging)
        ↓
   [Cancel Order]
        ↓
Confirmation Modal Opens
        ↓
    User Confirms
        ↓
   API Call: POST /orders/{id}/cancel
        ↓
   Backend Restores Stock
        ↓
   State Updates (Optimistic)
        ↓
Modal Closes
        ↓
Order Card (Cancelled) - Red Status
```

### Review Flow
```
Order Card (Delivered)
        ↓
   [Give Review/Edit Review]
        ↓
Review Modal Opens
        ↓
User Rates & Comments All Products
        ↓
   [Submit Reviews]
        ↓
   API Call: POST /ratings or PUT /ratings/{id}
        ↓
   State Updates Immediately
        ↓
Button Text Changes Instantly
        ↓
Toast: "Success"
```

## 📊 Tab Architecture

```
┌─ All Tab
│  └─ All orders (no filter)
│     └─ Display all statuses
│
├─ Pending Tab
│  └─ Filter: status = 'Pending'
│     └─ Button: Processing (disabled)
│
├─ Packaging Tab
│  └─ Filter: status = 'Packaging'
│     └─ Button: Cancel Order (red outline)
│
├─ Shipping Tab
│  └─ Filter: status = 'Shipping'
│     └─ Button: Mark as Received (black)
│     └─ Tracking: Always visible
│
├─ Delivered Tab
│  └─ Filter: status = 'Delivered'
│     └─ Button: Give/Edit Review (black)
│     └─ Tracking: Always visible
│
└─ Cancelled Tab
   └─ Filter: status = 'Cancel'
      └─ Button: None (order completed)
```

## 🎨 Color Coding

| Status | Color | Pill | Button | Icon |
|--------|-------|------|--------|------|
| Pending | Yellow | bg-yellow-100 | Gray/Disabled | - |
| Packaging | Blue | bg-blue-100 | Red Outline | - |
| Shipping | Purple | bg-purple-100 | Black Solid | Purple |
| Delivered | Green | bg-green-100 | Black Solid | Green |
| Cancelled | Red | bg-red-100 | None | - |

## 📍 Tracking Information Visibility

```
Order Status    | Card Tracking Row | Modal Tracking Section
─────────────────────────────────────────────────────
Pending         | ✗                 | ✗
Packaging       | ✗                 | ✗
Shipping        | ✓ (if number)     | ✓ (if number)
Delivered       | ✓ (if number)     | ✓ (if number)
Cancelled       | ✗                 | ✗

Legend:
✓ = Shown if tracking_number is not null
✗ = Always hidden
```

## 🔘 Button States by Status

```
Status      | Button 1         | Button 2
────────────────────────────────────────────
Pending     | See Details      | Processing (disabled)
Packaging   | See Details      | Cancel Order (red)
Shipping    | See Details      | Mark as Received (black)
Delivered   | See Details      | Give Review / Edit Review (black)
Cancelled   | See Details      | None
```

## 📝 Form Elements: Review Modal

```
For each product in order:
┌─────────────────────────────────────┐
│ [Product Image]                     │
│ Product Name                        │
│ ★ ★ ★ ★ ☆  (Interactive Rating)   │
│ [Comment Box - Textarea]            │
│ [Comment Text: Lorem ipsum...]      │
└─────────────────────────────────────┘

[Submit All Reviews] or [Update All Reviews]
```

## 🔐 Authentication & Authorization

```
Request to API
        ↓
Check: User Authenticated? → If NO: 401
        ↓
Check: User owns order? → If NO: 403
        ↓
Check: Order status valid? → If NO: 400
        ↓
Check: Stock available? (for cancel)
        ↓
Execute Operation
        ↓
Update Database
        ↓
Return 200/201 Success
```

## ⚡ Performance Metrics

```
Page Load:              ~2-3 seconds
Tab Switch:             ~500ms (API call)
Status Update:          <200ms (optimistic)
Modal Open:             <100ms
Copy Action:            Instant (~50ms)
Review Submit:          ~1-2 seconds (API + state)
Button Text Update:     Instant (state driven)
```

## 🧪 User Interaction Flowchart

```
                        Order Page Loads
                               ↓
                    User Views Orders
                      ↙    ↓    ↘
                   Click  Click  Click
                   Tab    Button Details
                    ↓       ↓      ↓
            Filter   Open    Open
            Orders   Modal   Details
                ↓                ↓
            Update           View Order
            Display          Info & Reviews
```

## 📱 Responsive Breakpoints

```
Mobile (<640px):
├─ Stack buttons vertically
├─ Full-width modals with padding
├─ Single column layout
└─ Touch-friendly button size (44px min)

Tablet (640px-1024px):
├─ Buttons side-by-side
├─ Modal max-width: 80%
└─ Comfortable spacing

Desktop (>1024px):
├─ Buttons side-by-side
├─ Modal max-width: 600px
└─ Standard layout
```

## 🎯 Error Handling Flow

```
User Action
        ↓
Try API Call
        ↓
    Network Error?
        ↓
    Connection Timeout?
        ↓
    Server Error (5xx)?
        ↓
    Client Error (4xx)?
        ↓
Show Toast: Error Message
        ↓
Revert State if Needed
        ↓
User Can Retry
```

---

This visual guide helps understand the complete structure and flow of the Orders page implementation.
