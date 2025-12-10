# Notification System - Complete Implementation Guide

## Overview

A full-stack notification system has been implemented for the 5SCENT application with:
- **Backend**: Laravel 12 API with notification management
- **Frontend**: Next.js 13+ with React components and context
- **Database**: Notification table with 5 notification types
- **UI**: Slide-in panel with notification cards, icons, and badges

---

## Database Schema

### Migration File
**Location**: `database/migrations/2025_12_10_update_notification_table_schema.php`

**Changes Applied**:
- Added two new notification types: `ProfileReminder` and `Delivery`
- Made `order_id` nullable (allows notifications without order relation)
- Added `updated_at` timestamp column

**Notification Types**:
1. **Payment** - Payment-related notifications
2. **OrderUpdate** - Order status changes
3. **Refund** - Refund processed
4. **ProfileReminder** - User to complete profile
5. **Delivery** - Order delivered (with review action)

**Table Structure**:
```
notification
├── notif_id (PRIMARY KEY)
├── user_id (FOREIGN KEY → user.user_id)
├── order_id (FOREIGN KEY → orders.order_id, NULLABLE)
├── message (VARCHAR 255)
├── notif_type (ENUM: Payment, OrderUpdate, Refund, ProfileReminder, Delivery)
├── is_read (TINYINT, default: 0)
├── created_at (DATETIME)
└── updated_at (DATETIME)
```

**Run Migration**:
```bash
php artisan migrate --force
```

---

## Backend Implementation

### 1. Notification Model
**File**: `app/Models/Notification.php`

**Key Features**:
- `timestamps = true` enabled for automatic timestamp tracking
- Boolean cast for `is_read` field
- Relationships to User and Order models
- Query scopes: `unread()` and `read()`

**Methods**:
```php
Notification::unread()     // Get unread notifications
Notification::read()       // Get read notifications
```

---

### 2. Notification Service
**File**: `app/Services/NotificationService.php`

**Static Methods**:

#### `createProfileReminderNotification($userId)`
Creates a ProfileReminder notification for users with incomplete profiles.
- Prevents duplicate unread notifications
- Auto-generated message

```php
NotificationService::createProfileReminderNotification($userId);
```

#### `createDeliveryNotification($orderId)`
Creates a Delivery notification when order is marked as delivered.

```php
NotificationService::createDeliveryNotification($orderId);
```

#### `createPaymentNotification($orderId, $message = null)`
Creates a Payment notification.

```php
NotificationService::createPaymentNotification($orderId, 'Payment successful!');
```

#### `createOrderUpdateNotification($orderId, $message = null)`
Creates an OrderUpdate notification for status changes.

#### `createRefundNotification($orderId, $message = null)`
Creates a Refund notification.

#### `markAsRead($notificationId)`
Marks single notification as read.

```php
NotificationService::markAsRead($notificationId);
```

#### `markAllAsRead($userId)`
Marks all notifications as read for a user.

```php
NotificationService::markAllAsRead($userId);
```

#### `getUnreadCount($userId)`
Gets unread notification count.

```php
$count = NotificationService::getUnreadCount($userId); // Returns: int
```

---

### 3. Notification Controller
**File**: `app/Http/Controllers/NotificationController.php`

#### `GET /api/notifications`
Fetches all notifications for authenticated user.

**Response**:
```json
{
  "success": true,
  "notifications": [
    {
      "notif_id": 1,
      "user_id": 5,
      "order_id": 123,
      "message": "Great news! Your order has been delivered...",
      "notif_type": "Delivery",
      "is_read": false,
      "created_at": "2025-12-10T12:34:56Z",
      "updated_at": "2025-12-10T12:34:56Z",
      "user": { "user_id": 5, "name": "John", "email": "john@example.com", "phone": "+6281234567890" },
      "order": { "order_id": 123, "status": "Delivered" }
    }
  ],
  "unread_count": 3
}
```

---

#### `PUT /api/notifications/{notificationId}/read`
Marks a notification as read.

**Request**:
```bash
curl -X PUT http://api.5scent.test/api/notifications/1/read
```

**Response**:
```json
{
  "success": true,
  "message": "Notification marked as read",
  "unread_count": 2
}
```

---

#### `POST /api/notifications/mark-all-read`
Marks all notifications as read for authenticated user.

**Response**:
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "unread_count": 0
}
```

---

#### `GET /api/notifications/unread-count`
Gets unread notification count.

**Response**:
```json
{
  "success": true,
  "unread_count": 3
}
```

---

### 4. Integration Points

#### OrderController
- **Location**: `app/Http/Controllers/OrderController.php`
- **Change**: Added `createDeliveryNotification()` when order is marked as delivered
- **Trigger**: `finish()` method

#### DashboardController
- **Location**: `app/Http/Controllers/DashboardController.php`
- **Change**: Added delivery notification trigger in `updateOrderStatus()` method
- **Trigger**: When admin changes status to "Delivered"

#### AuthController
- **Location**: `app/Http/Controllers/AuthController.php`
- **Changes**:
  1. Creates `ProfileReminder` notification on user registration
  2. Checks for incomplete profile in `me()` endpoint and creates notification if needed
- **Triggers**: Registration, authentication check

---

## Frontend Implementation

### 1. NotificationContext
**File**: `contexts/NotificationContext.tsx`

**Provides**:
- `notifications` - Array of all notifications
- `unreadCount` - Number of unread notifications
- `isLoading` - Loading state
- `fetchNotifications()` - Fetch all notifications
- `markAsRead(notificationId)` - Mark single notification as read
- `markAllAsRead()` - Mark all as read
- `getUnreadCount()` - Get unread count
- `getNotificationIcon(type)` - Get SVG icon for notification type

**Usage**:
```tsx
import { useNotification } from '@/contexts/NotificationContext';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotification();
  
  return (
    // Your component
  );
}
```

---

### 2. NotificationIcon Component
**File**: `components/NotificationIcon.tsx`

Displays:
- Bell icon (using `react-icons/fi`)
- Blue badge with unread count (positioned top-right)
- Positioned to the LEFT of the wishlist icon

**Props**:
```tsx
interface NotificationIconProps {
  onClick: () => void;  // Called when icon is clicked
}
```

**Styling**:
- Blue badge: `#2B7FFF`
- Shows "9+" if unread count > 9

---

### 3. NotificationOverlay Component
**File**: `components/NotificationOverlay.tsx`

Displays:
- Slide-in panel from right (0.3s animation)
- Backdrop with blur (10px) and 10% darkness
- Scrollable notification list
- Close button
- "Mark all as read" button (if unread count > 0)

**Features**:
- Prevents background scroll when open
- Handles notification actions (ProfileReminder → /profile, Delivery → /orders with review modal)
- Empty state: Shows message when no notifications

**Props**:
```tsx
interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}
```

---

### 4. NotificationCard Component
**File**: `components/NotificationCard.tsx`

**Displays**:
- Icon based on notification type
- Type badge
- Message
- Timestamp (relative, e.g., "5m ago")
- Action button (if applicable)
- Blue indicator dot (top-right) for unread

**Styling**:
- Unread: `#EFF6FF` background
- Read: `#FFFFFF` background
- Border: `#DBEAFE` (0.8px)
- Blue indicator: `#2B7FFF`, 2.5px diameter

**Actions**:
- **ProfileReminder**: "Complete Profile" button → `/profile`
- **Delivery**: "Write Review" button → `/orders?openReview={orderId}`
- Other types: No action button

---

### 5. Navigation Component Integration
**File**: `components/Navigation.tsx`

**Changes**:
- Added `NotificationIcon` component (positioned LEFT of wishlist icon)
- Added `NotificationOverlay` component (below navigation)
- Bell icon visible only when user is logged in
- Unread count badge shows on icon

**Icon Order** (left to right):
1. Notification Bell ← NEW
2. Wishlist (Heart)
3. Cart (Shopping Cart)
4. User Avatar

---

## Frontend Usage Flow

### 1. User Registration
```
Register → ProfileReminder notification created
↓
Login → /me endpoint checks profile → ProfileReminder shown if incomplete
```

### 2. Order Delivery
```
Admin marks order as "Delivered" in dashboard
↓
DashboardController → NotificationService::createDeliveryNotification()
↓
Delivery notification created with order_id reference
↓
Customer sees notification with "Write Review" button
↓
Click "Write Review" → Navigate to /orders with review modal opened for that order
```

### 3. Notification Actions
```
Click bell icon
↓
NotificationOverlay opens with slide-in animation
↓
Click notification card or action button
↓
If ProfileReminder: Navigate to /profile
If Delivery: Navigate to /orders with review modal for that order
↓
Notification marked as read
↓
Unread count decreases
```

---

## API Routes

All routes require authentication (`auth:sanctum` middleware):

```php
// routes/api.php

Route::middleware('auth:sanctum')->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);              // GET /api/notifications
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);  // GET /api/notifications/unread-count
    Route::put('/{id}/read', [NotificationController::class, 'markAsRead']); // PUT /api/notifications/{id}/read
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']); // POST /api/notifications/mark-all-read
});
```

---

## Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Unread background | Light Blue | `#EFF6FF` |
| Read background | White | `#FFFFFF` |
| Border | Light Blue | `#DBEAFE` |
| Unread indicator | Blue | `#2B7FFF` |
| Icon background | Light Blue | `#EFF6FF` |
| Badge (unread count) | Blue | `#2B7FFF` |

---

## Testing Checklist

- [ ] **Backend Migration**: Run `php artisan migrate` successfully
- [ ] **NotificationController**: Test all endpoints with Postman
- [ ] **ProfileReminder**: Register new user → Check notification created
- [ ] **ProfileReminder Check**: Login incomplete profile → Check /me creates notification
- [ ] **Delivery Notification**: Mark order as Delivered → Check notification created
- [ ] **Unread Badge**: Bell icon shows correct unread count
- [ ] **Overlay Animation**: Click bell → Slide-in animation smooth
- [ ] **Mark as Read**: Click notification → Background changes, unread count decreases
- [ ] **Mark All as Read**: Click button → All notifications marked, badge removed
- [ ] **ProfileReminder Action**: Click "Complete Profile" → Redirects to /profile
- [ ] **Delivery Action**: Click "Write Review" → Redirects to /orders with modal open
- [ ] **Background Scroll**: When overlay open → Background doesn't scroll
- [ ] **Close Overlay**: Click X or backdrop → Overlay closes smoothly
- [ ] **Empty State**: No notifications → Shows "No notifications" message
- [ ] **Timestamp Format**: Check relative timestamps (5m ago, 1h ago, etc.)

---

## Files Created/Modified

### Backend
- ✅ `database/migrations/2025_12_10_update_notification_table_schema.php` - CREATED
- ✅ `app/Models/Notification.php` - UPDATED
- ✅ `app/Services/NotificationService.php` - CREATED
- ✅ `app/Http/Controllers/NotificationController.php` - CREATED
- ✅ `app/Http/Controllers/OrderController.php` - UPDATED (added delivery notification)
- ✅ `app/Http/Controllers/DashboardController.php` - UPDATED (added delivery notification)
- ✅ `app/Http/Controllers/AuthController.php` - UPDATED (added ProfileReminder)
- ✅ `routes/api.php` - UPDATED (added notification routes)

### Frontend
- ✅ `contexts/NotificationContext.tsx` - CREATED
- ✅ `components/NotificationIcon.tsx` - CREATED
- ✅ `components/NotificationOverlay.tsx` - CREATED
- ✅ `components/NotificationCard.tsx` - CREATED
- ✅ `components/Navigation.tsx` - UPDATED (integrated notification system)
- ✅ `app/layout.tsx` - UPDATED (wrapped with NotificationProvider)

---

## Next Steps

1. **Run Migration**:
   ```bash
   php artisan migrate --force
   ```

2. **Test Backend Endpoints**: Use Postman to test all notification endpoints

3. **Frontend Testing**:
   - Register a new user → See ProfileReminder notification
   - Complete profile → Notification clears
   - Create order → Admin marks as Delivered → See Delivery notification
   - Click actions → Verify routing

4. **Styling Refinements**:
   - Adjust colors if needed in NotificationCard and NotificationOverlay
   - Fine-tune animation timing
   - Test responsive design on mobile

5. **Additional Features** (Future):
   - Real-time notifications using WebSockets/Pusher
   - Email notifications
   - Notification preferences/settings
   - Archive/delete notifications
   - Notification history/pagination

---

## Troubleshooting

### Migration Issues
- **"SQLSTATE[HY000]: General error"**: Drop the table and rerun migration
- **"Already migrated"**: Check `migrations` table, may need to rollback

### Frontend Not Showing Notifications
- Ensure `NotificationProvider` is in `layout.tsx`
- Check browser console for API errors
- Verify user is authenticated (check AuthContext)
- Check Network tab for API response

### Notifications Not Being Created
- Verify NotificationService is imported in controllers
- Check that user_id is being passed correctly
- Verify `order_id` is nullable in database schema
- Check database for notification records

### Overlay Not Closing
- Verify `onClose` callback is connected properly
- Check that `document.body.style.overflow` is being reset
- Test close button and backdrop click handlers

---

## Summary

The notification system is now fully implemented with:
- ✅ Database schema updated
- ✅ 5 notification types supported
- ✅ Backend API endpoints ready
- ✅ Frontend context and components created
- ✅ Integration with Navigation navbar
- ✅ ProfileReminder triggers on registration and profile check
- ✅ Delivery notifications when orders are marked delivered
- ✅ Beautiful UI with icons, badges, animations
- ✅ Scroll prevention when overlay is open
- ✅ Action buttons for quick navigation

Ready for testing and deployment!
