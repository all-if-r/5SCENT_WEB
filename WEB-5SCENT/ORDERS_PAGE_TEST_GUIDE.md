# Orders Page Feature Test Guide

## ✅ All Implementation Complete

This document provides step-by-step instructions to test all new features implemented on the Orders page.

---

## 1. Tab Navigation & Filtering

### Test: All Tab
1. Navigate to `/orders`
2. Click the "All" tab
3. **Expected**: See all orders for the current user across all statuses (Pending, Packaging, Shipping, Delivered, Cancelled)
4. **Verify**: Orders with different statuses appear mixed together

### Test: Status-Specific Tabs
1. Click "Pending" tab → Should only show `status='Pending'` orders
2. Click "Packaging" tab → Should only show `status='Packaging'` orders
3. Click "Shipping" tab → Should only show `status='Shipping'` orders
4. Click "Delivered" tab → Should only show `status='Delivered'` orders
5. Click "Cancelled" tab → Should only show `status='Cancel'` orders
6. **Verify**: Each tab correctly filters by its status

---

## 2. Tracking Information Display

### Test: Tracking Row on Card (Shipping Orders)
1. Navigate to Shipping tab
2. Find an order with a tracking number
3. **Expected**: Below the order date, see:
   - Package icon (box shape)
   - Text: "Tracking: [tracking_number]"
   - Copy button on the right
4. **Verify**: Tracking row displays only for orders with `tracking_number != null`

### Test: Tracking Row on Card (Delivered Orders)
1. Navigate to Delivered tab
2. Find an order with a tracking number
3. **Expected**: Same tracking row layout as Shipping orders
4. **Verify**: Only shows when tracking_number exists

### Test: Copy Tracking Number (Card)
1. Click the copy button in the tracking row
2. **Expected**: 
   - Toast notification appears: "Tracking number copied"
   - Tracking number is copied to clipboard
3. Paste in a text field to verify

### Test: Tracking Information in Modal
1. Click "See Details" on a Shipping or Delivered order with tracking
2. **Expected Modal shows**:
   - Section titled "Tracking Information" with light purple background
   - Package icon
   - "Tracking Number" label with the actual number
   - Copy button
3. **Positioned**: After "Shipping Address" section, before "Order Items"
4. **Verify**: Section only appears if order has tracking_number

### Test: Copy in Modal
1. Click the copy button in the modal's Tracking Information section
2. **Expected**: Toast notification appears: "Tracking number copied"

### Test: No Tracking Number
1. Find an order without tracking_number (typically Pending/Packaging)
2. **Expected**: No tracking row on card
3. Open details modal
4. **Expected**: No Tracking Information section in modal

---

## 3. Shipping State: Mark as Received

### Test: Button Appearance
1. Navigate to Shipping tab
2. **Expected**: See "Mark as Received" button (black, full-width)
3. **Verify**: Button only appears for Shipping status orders

### Test: Confirmation Modal
1. Click "Mark as Received"
2. **Expected Modal**:
   - Title: "Confirm Order Received"
   - Message: "Has your order arrived correctly and in good condition?"
   - Two buttons: "Not Yet" (outline) and "Yes, Received" (black)
   - Semi-transparent dark overlay behind modal

### Test: Cancel Confirmation
1. In the confirmation modal, click "Not Yet"
2. **Expected**:
   - Modal closes
   - Order remains in Shipping status
   - Card still shows "Mark as Received" button

### Test: Confirm Received
1. Click "Mark as Received" again
2. Click "Yes, Received"
3. **Expected**:
   - Modal closes
   - Order status changes to "Delivered"
   - Order immediately disappears from Shipping tab
   - Order appears in Delivered tab (no refresh)
   - Order still visible in All tab but with "Delivered" status
   - Status pill changes from purple to green
   - Button changes from "Mark as Received" to "Give Review" or "Edit Review"

---

## 4. Packaging State: Cancel Order

### Test: Button Appearance
1. Navigate to Packaging tab
2. **Expected**: See "Cancel Order" button (red outline, red text, white background)
3. **Verify**: Button only appears for Packaging status orders

### Test: Confirmation Modal
1. Click "Cancel Order"
2. **Expected Modal**:
   - Title: "Cancel Order"
   - Message: "Are you sure you want to cancel this order? This action cannot be undone."
   - Two buttons: "Keep Order" (outline) and "Yes, Cancel" (red)
   - Semi-transparent dark overlay

### Test: Keep Order
1. In the confirmation modal, click "Keep Order"
2. **Expected**:
   - Modal closes
   - Order remains in Packaging status
   - Card still shows "Cancel Order" button

### Test: Confirm Cancel
1. Click "Cancel Order" again
2. Click "Yes, Cancel"
3. **Expected**:
   - Modal closes
   - Order status changes to "Cancel"
   - Backend restores stock for all items
   - Order immediately disappears from Packaging tab
   - Order appears in Cancelled tab (no refresh)
   - Order still visible in All tab but with "Cancelled" status
   - Status pill changes to red

---

## 5. Delivered State: Review Buttons

### Test: Give Review Button
1. Navigate to Delivered tab
2. Find an order that has NOT been reviewed
3. **Expected**: See "Give Review" button (black, full-width)

### Test: Edit Review Button
1. In same Delivered tab, find an order that HAS been reviewed
2. **Expected**: See "Edit Review" button (black, full-width)

### Test: Review Modal (Give Review)
1. Click "Give Review" on an unreviewed order
2. **Expected**: Modal opens with all products from that order
3. Each product should have:
   - Product image
   - Product name
   - 5-star rating input (filled/unfilled stars)
   - Comment textarea
4. "Submit All Reviews" button at bottom

### Test: Submit New Review
1. Rate and comment on all products
2. Click "Submit All Reviews"
3. **Expected**:
   - Toast: "Reviews submitted successfully!"
   - Modal closes
   - Button text IMMEDIATELY changes to "Edit Review" (no refresh needed)
   - Order stays in Delivered tab
   - `allReviewedOrders` state updates

### Test: Edit Review
1. Click "Edit Review" (on an order with reviews)
2. **Expected**: Modal opens with existing ratings and comments pre-filled
3. Update a review
4. Click "Update All Reviews"
5. **Expected**:
   - Toast: "Reviews updated successfully!"
   - Modal closes
   - Button remains "Edit Review"
   - No page refresh

---

## 6. Pending State

### Test: Button Appearance
1. Find Pending orders
2. **Expected**: See disabled "Processing" button (gray, not clickable)

---

## 7. Optimistic Updates

### Test: No Page Refresh on Status Change
1. Start on Shipping tab (has orders)
2. Click "Mark as Received" and confirm
3. **Expected**:
   - Order immediately disappears from Shipping tab
   - Switch to Delivered tab
   - **Expected**: Order appears there immediately (no reload)
   - No full page refresh occurred

### Test: Cross-Tab Consistency
1. Have "All" tab and "Shipping" tab visible side-by-side (if possible)
2. Mark an order as received
3. **Expected**:
   - Shipping tab: Order disappears
   - All tab: Order now shows "Delivered" status

---

## 8. Responsive Design

### Test: Mobile View
1. Open Orders page on mobile device (or use DevTools)
2. All buttons should remain readable and clickable
3. Tracking row should stack appropriately
4. Modals should be centered and properly sized
5. Copy buttons should work on touch devices

---

## 9. Error Handling

### Test: Network Error on Status Update
1. Open DevTools Network tab
2. Click "Mark as Received"
3. Confirm, then manually block the request
4. **Expected**: Toast error: "Failed to confirm order"
5. Order status should revert to original

### Test: Network Error on Review Submit
1. Try to submit a review while network is offline
2. **Expected**: Toast error: "Failed to submit reviews"
3. Modal should remain open
4. User can retry

---

## 10. Edge Cases

### Test: Order Without Tracking Number
1. Find Shipping or Delivered order without tracking_number
2. **Expected**: No tracking row on card
3. Modal: No Tracking Information section

### Test: Empty Order Details
1. Verify orders with no items don't break UI
2. **Expected**: Graceful handling

### Test: Very Long Tracking Number
1. Find or test with long tracking number
2. **Expected**: Text truncates or wraps appropriately

### Test: Multiple Tabs Open
1. Open Orders page in two browser tabs
2. Make an order status change in tab 1
3. Switch to tab 2
4. **Expected**: Tab 2 doesn't auto-update (manual refresh needed)
   - This is expected behavior for SPA

---

## 11. Database & Backend Verification

### Verify Backend Calls
Use DevTools Network tab to confirm:

- **Mark as Received**: `POST /orders/{id}/finish` → 200 OK
- **Cancel Order**: `POST /orders/{id}/cancel` → 200 OK
- **Submit Review**: `POST /ratings` → 201 Created
- **Update Review**: `PUT /ratings/{id}` → 200 OK
- **Get Orders**: `GET /orders?status=shipping` → 200 OK

### Verify Database
Check database for:
- ✅ `orders.status` updated correctly
- ✅ `orders.tracking_number` populated
- ✅ `rating.stars` and `rating.comment` created/updated
- ✅ `rating.updated_at` timestamp updated when editing
- ✅ Stock restored when cancelling (product stock_30ml/stock_50ml incremented)

---

## 12. Performance Check

- Page loads within 3 seconds
- Status updates feel instant (optimistic)
- No jank when opening modals
- Smooth transitions between tabs
- Copy button responds immediately

---

## Checklist Summary

- [ ] All 6 tabs work correctly
- [ ] Tracking row displays for Shipping/Delivered
- [ ] Copy tracking number works on card
- [ ] Copy tracking number works in modal
- [ ] Tracking Information section displays in modal
- [ ] Mark as Received button works
- [ ] Confirm Order Received modal works
- [ ] Order moves from Shipping to Delivered
- [ ] Cancel Order button works
- [ ] Cancel Order modal works
- [ ] Order moves from Packaging to Cancelled
- [ ] Give Review button shows
- [ ] Edit Review button shows
- [ ] Review submission works
- [ ] Button text updates immediately after review
- [ ] All updates are optimistic (no refresh)
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] All error cases handled
- [ ] Backend endpoints called correctly
- [ ] Database updated correctly

---

## Notes for Debugging

If something doesn't work:

1. **Check Console**: Look for JavaScript errors
2. **Check Network Tab**: Verify API calls are being made and succeeding
3. **Check Database**: Verify data was actually updated
4. **Check State**: Use React DevTools to inspect component state
5. **Clear Cache**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
6. **Restart Dev Server**: Sometimes needed after schema changes

---

## Success Criteria

✅ All tests pass = Feature complete and ready for production
