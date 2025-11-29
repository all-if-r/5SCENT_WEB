# Order ID Format & Admin Notifications - Quick Reference

## 🎯 What Was Done

### 1. New Order ID Format
- **Old Format**: `#ORD-2024-001`
- **New Format**: `#ORD-30-11-2025-001`
- **Pattern**: `ORD-{DD-MM-YYYY}-{3digit}`

### 2. Admin Change Notifications
When admins update order status, they now see notifications:
- ✅ **Success**: "Order status updated to Shipping" (green toast)
- ❌ **Error**: "Tracking number is required..." (red toast)
- ℹ️ **Info**: Other messages (blue toast)

## 📍 Where It's Applied

### Pages Updated
1. **Admin Orders Page** (`/admin/orders`)
   - Order cards show new format
   - Modal shows new format
   - Toast notifications on status change

2. **User Orders Page** (`/orders`)
   - Order cards show new format
   - Modal shows new format

3. **Profile Orders Tab** (in profile page)
   - Orders display new format

4. **Admin Dashboard** (`/admin/dashboard`)
   - Uses pre-formatted `order_no` field

## 💻 Code Usage

### Using formatOrderId Function

```tsx
import { formatOrderId } from '@/lib/utils';

// Example usage
const formatted = formatOrderId(1, '2025-11-30T10:30:00Z');
// Result: "ORD-30-11-2025-001"

// With Date object
const formatted2 = formatOrderId(1, new Date('2025-11-30'));
// Result: "ORD-30-11-2025-001"

// Without date (fallback)
const formatted3 = formatOrderId(1);
// Result: "ORD-001"
```

### Using Toast Notifications

```tsx
import { useToast } from '@/contexts/ToastContext';

function MyComponent() {
  const { showToast } = useToast();
  
  // Success notification
  showToast('Operation completed successfully', 'success');
  
  // Error notification
  showToast('Something went wrong', 'error');
  
  // Info notification
  showToast('Here is some information', 'info');
}
```

## 📊 Database Consideration

**Note**: The order ID formatting is done in the frontend. The database still stores the numeric `order_id`. This is intentional and provides:
- Backward compatibility
- Easy API integration
- Flexible formatting rules
- No database migrations needed

## 🔍 How to Test

### Test Order ID Format
1. Go to `/orders` page
2. Look at order numbers - should be `ORD-DD-MM-YYYY-###`
3. Check `/admin/orders` - same format there
4. Check profile orders tab - same format

### Test Admin Notifications
1. Go to `/admin/orders`
2. Click "View" on any order
3. Change the status
4. Add tracking number if needed
5. Click "Save Changes"
6. You should see a green toast notification with the message

### Test Error Notification
1. In order modal, select "Shipping" status
2. Leave tracking number empty
3. Click "Save Changes"
4. You should see a red toast notification

## 🚀 Frontend Files Modified

| File | Changes |
|------|---------|
| `lib/utils.ts` | Added `formatOrderId()` function |
| `app/admin/orders/page.tsx` | Added toast notifications + formatOrderId |
| `app/orders/page.tsx` | Updated to use formatOrderId |
| `components/profile/MyOrdersTab.tsx` | Updated to use formatOrderId |

## 📋 API Impact

**No API changes needed!** The formatting happens entirely on the frontend:
- API still returns numeric `order_id`
- API still returns `created_at` timestamp
- Frontend combines these to display formatted ID

## ⚙️ Configuration

### Toast Display Location
- Top-right corner of screen
- Auto-dismisses after 5 seconds
- Can be manually closed with X button

### Toast Colors
| Type | Background | Text | Icon |
|------|-----------|------|------|
| success | green-50 | green-800 | ✓ |
| error | red-50 | red-800 | ✗ |
| info | blue-50 | blue-800 | ℹ |

## 🔗 Related Functions

```typescript
// In lib/utils.ts
export function formatOrderId(orderId: number, createdAt?: string | Date): string
export function formatCurrency(value: number): string
export function roundRating(rating: number): number
export function cn(...inputs: ClassValue[])
```

## 💡 Best Practices

1. **Always pass the creation date** when calling `formatOrderId()`
   ```tsx
   // Good ✅
   formatOrderId(order.order_id, order.created_at)
   
   // Works but less ideal ❌
   formatOrderId(order.order_id)
   ```

2. **Use appropriate toast type**
   ```tsx
   // For success actions
   showToast('Order updated', 'success')
   
   // For errors
   showToast('Update failed', 'error')
   
   // For information
   showToast('Please note...', 'info')
   ```

3. **Keep toast messages concise**
   - Maximum 2-3 lines
   - Clear and actionable
   - No technical jargon

## 🐛 Troubleshooting

### Order ID shows as "ORD-001" instead of "ORD-DD-MM-YYYY-001"
- **Cause**: No `created_at` date passed
- **Fix**: Ensure you're passing `order.created_at` to `formatOrderId()`

### Toast notifications not showing
- **Cause**: Component not wrapped in `ToastProvider`
- **Fix**: Check that `layout.tsx` has `<ToastProvider>`

### Wrong date format
- **Cause**: Date timezone issue
- **Fix**: Ensure backend returns dates in ISO format (UTC)

## 📞 Support

For questions or issues:
1. Check the `ORDER_ID_FORMAT_AND_NOTIFICATIONS_COMPLETE.md` for detailed docs
2. Review the utility functions in `lib/utils.ts`
3. Check ToastContext in `contexts/ToastContext.tsx`

---

**Last Updated**: November 30, 2025
**Status**: ✅ Complete and Ready to Use
