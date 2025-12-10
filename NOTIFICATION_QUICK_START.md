# Notification System - Quick Start & Testing Guide

## 🚀 Quick Start

### 1. Run Migration
```bash
cd backend/laravel-5scent
php artisan migrate --force
```

### 2. Frontend is Ready
All components are integrated into the Navigation bar. Just ensure the app is running.

---

## 🧪 Testing Scenarios

### Test 1: ProfileReminder on Registration
1. Go to `/register`
2. Create a new account with incomplete profile (no address/city)
3. **Expected**: Notification bell shows "1" badge
4. Open notifications → See "Complete your profile..." message
5. Click "Complete Profile" → Redirects to `/profile`

### Test 2: ProfileReminder on Login
1. Login with existing user who has incomplete profile
2. **Expected**: Notification bell shows badge
3. Navigate to any page → Check for ProfileReminder notification

### Test 3: Delivery Notification
1. Create a test order in your account
2. Go to Admin Dashboard
3. Find the order, click it
4. Change status to "Delivered"
5. **Expected**: 
   - Backend creates Delivery notification
   - Customer sees notification in bell icon
   - Opens notification panel → See Delivery notification with "Write Review" button

### Test 4: Mark as Read
1. Click notification card
2. **Expected**: 
   - Notification background changes from light blue to white
   - Unread count decreases
   - Blue dot disappears

### Test 5: Mark All as Read
1. Have multiple unread notifications
2. Click "Mark all as read" button
3. **Expected**: All notifications marked, badge removed from bell icon

### Test 6: Overlay Animation
1. Click bell icon
2. **Expected**: Panel slides in from right with smooth animation
3. Click X or backdrop
4. **Expected**: Panel slides out smoothly

---

## 🎨 UI Reference

### Notification Card States

**Unread State**:
```
┌─────────────────────────────────────┐ (Unread: #EFF6FF)
│ ●                                   | (Blue indicator: top-right)
│ 🔔 [PROFILEREMINDER]                │ (Icon + Type badge)
│ Complete your profile...            │ (Message)
│ 5m ago                              │ (Timestamp)
│ [Complete Profile]                  │ (Action button - if applicable)
└─────────────────────────────────────┘
```

**Read State**:
```
┌─────────────────────────────────────┐ (Read: #FFFFFF)
│                                     │ (No indicator)
│ 🔔 [PROFILEREMINDER]                │
│ Complete your profile...            │
│ 5m ago                              │
│ [Complete Profile]                  │
└─────────────────────────────────────┘
```

### Overlay Layout

```
┌─────────────────────────────────────┐
│ Notifications              [X]       │ ← Header
├─────────────────────────────────────┤
│ 3 unread                            │
│ [Mark all as read]                  │ ← Action
├─────────────────────────────────────┤
│                                     │
│ [Notification Card 1 - Unread]      │
│ [Notification Card 2 - Unread]      │
│ [Notification Card 3 - Read]        │ ← Scrollable
│ [Notification Card 4 - Read]        │
│                                     │
├─────────────────────────────────────┘
```

---

## 📍 Icon Positions in Navigation

```
5SCENT          Home    Products         🔔  ❤️  🛒  👤
                                      ↑   ↑   ↑   ↑
                              Notification  Wishlist  Cart  Profile
```

**Notification Icon Features**:
- Bell icon (FiBell from react-icons)
- Blue badge (top-right) showing unread count
- Shows "9+" if more than 9 unread

---

## 📤 API Endpoints for Testing

### Get All Notifications
```bash
curl -X GET http://api.5scent.test/api/notifications \
  -H "Authorization: Bearer {token}"
```

### Mark Notification as Read
```bash
curl -X PUT http://api.5scent.test/api/notifications/{notif_id}/read \
  -H "Authorization: Bearer {token}"
```

### Mark All as Read
```bash
curl -X POST http://api.5scent.test/api/notifications/mark-all-read \
  -H "Authorization: Bearer {token}"
```

### Get Unread Count
```bash
curl -X GET http://api.5scent.test/api/notifications/unread-count \
  -H "Authorization: Bearer {token}"
```

---

## 🔧 Troubleshooting Checklist

### Bell Icon Not Showing
- [ ] User is logged in
- [ ] NotificationProvider is in layout.tsx
- [ ] react-icons/fi is installed
- [ ] Navigation component has NotificationIcon import

### Notifications Not Loading
- [ ] Backend migration ran successfully
- [ ] Check browser console for API errors
- [ ] API returns 200 status with notifications array
- [ ] User is authenticated (check token)

### Overlay Won't Close
- [ ] Check onClick handler on close button
- [ ] Verify backdrop click handler works
- [ ] Check document.body.style.overflow is reset

### ProfileReminder Not Appearing
- [ ] Check user.phone, user.address, user.city are empty
- [ ] NotificationService.createProfileReminderNotification() called in AuthController.me()
- [ ] Check database for notification record

### Delivery Notification Not Created
- [ ] Check DashboardController.updateOrderStatus() has NotificationService import
- [ ] Verify order status is changed to "Delivered"
- [ ] Check database for notification record with notif_type='Delivery'

---

## 📝 Important Notes

1. **order_id = 0 or NULL**: ProfileReminder notifications have no order relation
2. **Duplicate Prevention**: ProfileReminder won't create duplicate unread notifications
3. **Auto-Mark on Visit**: Notifications auto-marked as read when notification card is clicked
4. **Time Format**: Timestamps show relative time (5m ago, 1h ago, 1d ago)
5. **Scroll Prevention**: Background scroll is disabled when overlay is open

---

## 🎯 Features Implemented

✅ 5 notification types (Payment, OrderUpdate, Refund, ProfileReminder, Delivery)
✅ Notification bell with unread count badge
✅ Slide-in overlay with smooth animation
✅ Notification cards with icons and type badges
✅ Unread/Read visual states
✅ Blue indicator dot for unread notifications
✅ Action buttons (Complete Profile, Write Review)
✅ Mark as read functionality
✅ Mark all as read button
✅ ProfileReminder on registration
✅ ProfileReminder on incomplete profile
✅ Delivery notification when order delivered
✅ Backdrop blur effect
✅ Scroll prevention on overlay open
✅ Empty state message
✅ Responsive design

---

## 🚀 Next Steps

1. **Run Migration**: `php artisan migrate --force`
2. **Test Registration**: Create new account and check for ProfileReminder
3. **Test Delivery**: Create order, mark as delivered, check notification
4. **Test UI**: Click bell, test mark as read, test actions
5. **Fine-tune**: Adjust colors/animations as needed
6. **Deploy**: Push to production when ready

---

## 📞 Support

For issues or questions:
1. Check the `NOTIFICATION_SYSTEM_IMPLEMENTATION.md` file for detailed documentation
2. Review test checklist above
3. Check browser console for errors
4. Verify API responses with Postman
5. Check Laravel logs: `storage/logs/laravel.log`

---

**Status**: ✅ Complete and Ready for Testing
