# Quick Reference: Recent Changes

## Files Modified

### Frontend Changes
1. **`app/cart/page.tsx`** - Complete cart redesign
   - Empty state with shopping bag icon
   - Select All / Delete All controls
   - Improved item layout and styling
   - Better Order Summary sidebar

2. **`app/wishlist/page.tsx`** - Auth loading fix
   - Added loading state check
   - Shows skeleton while auth verifies
   - Prevents redirect flashing

3. **`components/Navigation.tsx`** - Already optimized for real-time badges
   - No changes needed
   - Badges already update in real-time

4. **`contexts/AuthContext.tsx`** - Auth improvements
   - Login persistence: Load user from localStorage immediately
   - Logout: Explicit redirect to /login

5. **`lib/animations.ts`** - Smooth animations
   - Duration: 0.5s (was 0.6s)
   - Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (overshoot effect)
   - Scale: 0.3 (was 0.5)
   - Added shadow effect

### Backend Changes
1. **`app/Models/Cart.php`** - Added `public $timestamps = false;`
2. **`app/Models/Wishlist.php`** - Added `public $timestamps = false;`

---

## How Features Work

### 1. Login Persistence on Refresh
```
User refreshes page
  ↓
AuthContext checks localStorage for token+user
  ↓
If exists: Set user immediately (no wait)
  ↓
Async verify token with API in background
  ↓
Only redirect if verification fails
```

### 2. Logout Redirect
```
User clicks logout
  ↓
Clear localStorage
  ↓
Clear auth state
  ↓
Force redirect to /login via window.location.href
```

### 3. Real-Time Badge Updates
```
User adds item to cart
  ↓
CartContext.addToCart() called
  ↓
API call to backend
  ↓
refreshCart() updates items state
  ↓
Dispatch 'cart-updated' event
  ↓
Navigation reads cartItemCount from items
  ↓
Badge automatically updates (React re-renders)
```

### 4. Select All / Delete All
```
User checks "Select all"
  ↓
All item checkboxes become checked
  ↓
All item IDs added to selectedItems array
  ↓
"Delete All" button shows with count
  ↓
User clicks "Delete All"
  ↓
Confirmation dialog appears
  ↓
If confirmed: Remove each item via removeFromCart()
  ↓
CartContext updates and dispatches event
  ↓
Cart reloads, shows empty state if no items left
```

### 5. Animation
```
User clicks "Add to Cart"
  ↓
animateToIcon() called with target icon element
  ↓
Clone product image element
  ↓
Position clone at click location
  ↓
Use requestAnimationFrame for smooth 0.5s animation
  ↓
Animate to icon with: scale(0.3) + translate + shadow
  ↓
Easing: cubic-bezier(0.34, 1.56, 0.64, 1)
  ↓
Remove clone after animation completes
```

---

## Component Hierarchy

```
Layout
├── Navigation
│   ├── Cart Badge (from CartContext)
│   └── Wishlist Badge (from useState)
├── CartPage
│   ├── Select All Checkbox
│   ├── Delete All Button
│   ├── Cart Items
│   │   ├── Item Checkbox
│   │   ├── Product Image
│   │   ├── Product Info
│   │   ├── Quantity Controls
│   │   └── Remove Button
│   └── Order Summary
│       ├── Subtotal
│       ├── Shipping
│       ├── Tax
│       ├── Total
│       └── Checkout Button
└── WishlistPage
    └── Wishlist Items
```

---

## State Management

### AuthContext
```typescript
{
  user: {
    id: number,
    email: string,
    name: string,
    profile_pic?: string
  } | null,
  loading: boolean,
  login: (email, password) => Promise<void>,
  logout: () => Promise<void>,
  register: (data) => Promise<void>,
  updateUser: (data) => Promise<void>
}
```

### CartContext
```typescript
{
  items: CartItem[],
  total: number,
  loading: boolean,
  addToCart: (productId, size, quantity) => Promise<void>,
  updateQuantity: (itemId, quantity) => Promise<void>,
  removeFromCart: (itemId) => Promise<void>,
  refreshCart: () => Promise<void>
}
```

### CartPage Local State
```typescript
{
  selectedItems: number[], // Array of cart_id
  selectAll: boolean        // Whether all are selected
}
```

---

## Key Imports

### Cart Page
```typescript
import { TrashIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
```

### Navigation
```typescript
import { ShoppingCartIcon, HeartIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
```

---

## Common Issues & Solutions

### Issue: Badge not updating
**Cause**: CartContext event not dispatched
**Solution**: Ensure `window.dispatchEvent(new Event('cart-updated'))` is called after API success

### Issue: Redirect on page refresh
**Cause**: Not using loading state
**Solution**: Check `if (!loading && !user)` before redirecting

### Issue: Delete All button not visible
**Cause**: selectedItems.length is 0
**Solution**: Check that items are selected via checkbox

### Issue: Animation is choppy
**Cause**: Not using GPU acceleration or wrong easing
**Solution**: Ensure `translateZ(0)` is in transform and correct easing cubic-bezier is used

---

## API Endpoints Used

### Cart
- `GET /api/cart` - Fetch cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/{id}` - Update quantity
- `DELETE /api/cart/{id}` - Remove from cart

### Wishlist
- `GET /api/wishlist` - Fetch wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/{id}` - Remove from wishlist

### Auth
- `POST /api/login` - Login
- `POST /api/register` - Register
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user

---

## Testing Checklist

- [ ] Cart persists after page refresh
- [ ] User stays logged in after refresh
- [ ] Logout redirects to /login
- [ ] Add to cart animation is smooth
- [ ] Cart badge updates immediately
- [ ] Select All checks all items
- [ ] Delete All removes all selected items
- [ ] Empty cart shows correct UI
- [ ] Quantity controls work
- [ ] Remove item works
- [ ] Wishlist page shows loading state
- [ ] Protected pages redirect when not logged in

---

## Development Notes

### Before Deploying
1. Clear browser cache and localStorage
2. Test in incognito/private mode
3. Verify all console errors are resolved
4. Test on mobile viewport
5. Check lighthouse scores

### Performance
- Animation uses requestAnimationFrame (GPU accelerated)
- Real-time updates use event dispatching (not polling)
- Loading states prevent unnecessary renders
- Images are optimized with Next.js Image component

### Accessibility
- Checkboxes are keyboard accessible
- Buttons have proper ARIA labels
- Color contrast meets WCAG AA
- Touch targets are 44x44px or larger
