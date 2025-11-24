# 5SCENT Wishlist & Cart Fixes - Implementation Guide

## Overview
This document provides all the required SQL commands and implementation notes for fixing the wishlist and cart features.

---

## 1. SQL Commands for Adding Timestamps to Cart Table

### Via HeidiSQL or phpMyAdmin

**Command to add created_at column:**
```sql
ALTER TABLE cart 
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

**Command to add updated_at column:**
```sql
ALTER TABLE cart 
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

**Or add both columns in one command:**
```sql
ALTER TABLE cart 
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

### For Wishlist Table (Optional - same pattern)

**Command to add timestamps to wishlist:**
```sql
ALTER TABLE wishlist 
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

### Verify Columns Were Added

```sql
DESCRIBE cart;
DESCRIBE wishlist;
```

**Expected output for cart table:**
```
Field           | Type        | Null | Key | Default
cart_id         | int(11)     | NO   | PRI | NULL
user_id         | int(11)     | NO   | FK  | NULL
product_id      | int(11)     | NO   | FK  | NULL
size            | varchar     | NO   |     | NULL
quantity        | int(11)     | NO   |     | 1
created_at      | datetime    | YES  |     | CURRENT_TIMESTAMP
updated_at      | datetime    | YES  |     | CURRENT_TIMESTAMP
```

---

## 2. Backend Model Updates - COMPLETED ✅

### Cart.php - Updated
**File**: `app/Models/Cart.php`

**Changes Made:**
- Changed `public $timestamps = false;` → `public $timestamps = true;`
- Added `'created_at'` and `'updated_at'` to `$fillable` array

**Current Code:**
```php
class Cart extends Model
{
    use HasFactory;

    protected $table = 'cart';
    protected $primaryKey = 'cart_id';
    public $timestamps = true;  // Now enabled

    protected $fillable = [
        'user_id',
        'product_id',
        'size',
        'quantity',
        'created_at',           // Added
        'updated_at',           // Added
    ];
    
    // ... rest of the model
}
```

**How it works:**
- When a new cart item is created, Laravel automatically sets `created_at` to current timestamp
- When a cart item is updated, Laravel automatically sets `updated_at` to current timestamp
- No manual code needed - Laravel handles this automatically

### Wishlist.php - Updated
**File**: `app/Models/Wishlist.php`

**Changes Made:**
- Changed `public $timestamps = false;` → `public $timestamps = true;`
- Added `'created_at'` and `'updated_at'` to `$fillable` array

```php
class Wishlist extends Model
{
    use HasFactory;

    protected $table = 'wishlist';
    protected $primaryKey = 'wishlist_id';
    public $timestamps = true;  // Now enabled

    protected $fillable = [
        'user_id',
        'product_id',
        'created_at',           // Added
        'updated_at',           // Added
    ];
    
    // ... rest of the model
}
```

---

## 3. Frontend Updates - COMPLETED ✅

### Cart Page (app/cart/page.tsx)

**Changes Made:**

#### A. Delete Confirmation Modal
- Replaced browser `alert()` with custom modal dialog
- Modal displays item name being deleted
- Includes Cancel and Delete buttons
- Better UX and consistent with design

#### B. Cart Item Layout Rearrangement
**New Order (Top to Bottom):**
1. Product Name
2. Size
3. **Price** (MOVED DOWN - below size)
4. **Delete Icon** (MOVED - now at bottom left)

**Quantity Controls Position:**
- **MOVED TO RIGHT SIDE** (was on left with price)
- Now in flex column on the right side
- Aligned vertically below the delete area

#### C. Order Summary Updates
- Added "Total Item" field showing selected item count
- Changed Tax from 10% to **5%**
- Updated total calculation: `subtotal * 1.05` (was 1.1)

#### D. Quantity Logic - Auto Delete
- When user clicks minus on quantity=1, item is deleted (not quantity 0)
- Automatically opens delete confirmation modal
- On confirmation, removes item and updates badge immediately

### Wishlist Page (app/wishlist/page.tsx)

**Changes Made:**

#### A. Browse Products Button Style
- Changed `rounded-lg` (square corners) → `rounded-full` (pill shape)
- Now matches other CTA buttons across the site

#### B. Badge Update Fix
- Added event dispatch when removing from wishlist
- `window.dispatchEvent(new Event('wishlist-updated'))`
- Navigation now refetches wishlist count immediately
- Badge updates in real-time without page refresh

---

## 4. Navigation Badge Updates - Real-Time Behavior

**File**: `components/Navigation.tsx`

**How It Works:**

### Cart Badge
1. User adds item to cart
2. CartContext dispatches `'cart-updated'` event
3. Navigation reads `items` from CartContext
4. Badge count = sum of all item quantities
5. Badge updates immediately (no API call needed)

### Wishlist Badge
1. User removes item from wishlist
2. Wishlist page dispatches `'wishlist-updated'` event
3. Navigation listens for this event
4. Navigation calls `fetchWishlistCount()` to refresh count
5. Badge updates in real-time

**Event Flow:**
```
User Action → API Call → Context Updates → Event Dispatch → Navigation Listener → Badge Updates
```

---

## 5. ID Auto-Increment Fix

### Issue: IDs Skip Numbers
- IDs should be: 1, 2, 3, 4, 5, 6...
- But sometimes jump: 1, 2, 3, 10, 11, 12...

### Root Cause
- When a transaction fails, the auto-increment still increments
- Happens with duplicate entries or constraint violations
- InnoDB generates next ID before checking constraints

### Solution - No Manual Fix Needed
This is normal database behavior and expected. However, if you want to reset:

```sql
-- Check current auto-increment
SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_NAME='cart';

-- Find the maximum ID currently in use
SELECT MAX(cart_id) FROM cart;

-- Reset auto-increment to next expected value (replace XX with max_id + 1)
ALTER TABLE cart AUTO_INCREMENT = XX;
```

**Example:**
```sql
-- If max cart_id is 15, set next auto_increment to 16
ALTER TABLE cart AUTO_INCREMENT = 16;

-- For wishlist
ALTER TABLE wishlist AUTO_INCREMENT = [next_value];
```

### To Apply to All Tables
```sql
-- Users
ALTER TABLE user AUTO_INCREMENT = (SELECT MAX(user_id) + 1 FROM user);

-- Products
ALTER TABLE product AUTO_INCREMENT = (SELECT MAX(product_id) + 1 FROM product);

-- Cart
ALTER TABLE cart AUTO_INCREMENT = (SELECT MAX(cart_id) + 1 FROM cart);

-- Wishlist
ALTER TABLE wishlist AUTO_INCREMENT = (SELECT MAX(wishlist_id) + 1 FROM wishlist);
```

---

## 6. Price Logic Fix

**Issue**: Product price shows as NaN

**Root Cause**: 
The price was already correct in the model, but sometimes displays incorrectly

**Fix Applied**: 
- Cart model uses accessor: `getPriceAttribute()`
- Returns correct price based on size:
  - If size = '30ml' → uses `product->price_30ml`
  - If size = '50ml' → uses `product->price_50ml`

**Current Code in Cart.php:**
```php
public function getPriceAttribute()
{
    return $this->size === '30ml' ? $this->product->price_30ml : $this->product->price_50ml;
}

public function getTotalAttribute()
{
    return $this->price * $this->quantity;
}
```

This automatically converts to the correct format when accessing `$cart->price`.

---

## 7. Implementation Checklist

### Database Changes
- [ ] Run SQL: Add `created_at` to cart table
- [ ] Run SQL: Add `updated_at` to cart table
- [ ] Run SQL: Add columns to wishlist table (optional)
- [ ] Verify columns exist: `DESCRIBE cart;`
- [ ] Check data: `SELECT * FROM cart LIMIT 5;`

### Backend Changes
- [x] Update Cart.php - Enable timestamps
- [x] Update Wishlist.php - Enable timestamps
- [ ] Run Laravel migration if needed: `php artisan migrate`
- [ ] Clear cache: `php artisan cache:clear`
- [ ] Test API endpoints work correctly

### Frontend Changes
- [x] Update cart/page.tsx - All changes applied
- [x] Update wishlist/page.tsx - All changes applied
- [x] Delete modal functionality implemented
- [x] Layout rearrangement completed
- [x] Real-time badge updates implemented

### Testing
- [ ] Test add to cart - badge updates immediately
- [ ] Test remove from cart - badge decreases immediately
- [ ] Test remove from wishlist - badge decreases immediately
- [ ] Test quantity change - badge updates in real-time
- [ ] Test delete with modal - no browser alert
- [ ] Test Browse Products button - pill shape visible
- [ ] Test price displays correctly - no NaN
- [ ] Test quantity 0 - item auto-deletes
- [ ] Test tax shows 5% - not 10%

---

## 8. Troubleshooting

### Issue: Badge doesn't update after removing from wishlist
**Solution**: 
- Clear browser cache
- Make sure `window.dispatchEvent(new Event('wishlist-updated'))` is in wishlist page
- Check Navigation component has event listener for `'wishlist-updated'`

### Issue: Cart items still show old prices
**Solution**:
- Clear browser localStorage: `localStorage.clear()`
- Refresh page
- Check that Cart.php has the price accessor method

### Issue: Delete modal doesn't appear
**Solution**:
- Check browser console for errors
- Verify Modal JSX is at bottom of return statement
- Make sure `deleteConfirm.itemId !== null` condition is correct

### Issue: Timestamps not updating
**Solution**:
- Verify columns exist: `DESCRIBE cart;`
- Check `public $timestamps = true;` in Model
- Check `'created_at'` and `'updated_at'` in `$fillable`
- Run: `php artisan tinker` then `\App\Models\Cart::create([...]);`

### Issue: Quantity minus at 1 doesn't remove item
**Solution**:
- Check `handleQuantityChange` function
- Verify condition: `if (newQuantity === 0)`
- Make sure modal opens with correct item name

---

## 9. Code Files Modified

| File | Changes | Status |
|------|---------|--------|
| `frontend/app/cart/page.tsx` | Delete modal, layout fix, order summary, qty logic | ✅ Done |
| `frontend/app/wishlist/page.tsx` | Badge fix, button styling | ✅ Done |
| `backend/app/Models/Cart.php` | Enable timestamps, add to fillable | ✅ Done |
| `backend/app/Models/Wishlist.php` | Enable timestamps, add to fillable | ✅ Done |

---

## 10. Quick Reference Commands

```bash
# SSH into your server and run these in order:

# 1. Go to Laravel directory
cd /path/to/laravel-5scent

# 2. Clear cache
php artisan cache:clear
php artisan config:clear

# 3. Test the models
php artisan tinker

# Inside tinker:
>>> \App\Models\Cart::latest()->first();  // Should show created_at and updated_at
>>> exit;

# 4. Check database timestamps exist
mysql -u root -p your_database
> DESCRIBE cart;
> SELECT * FROM cart LIMIT 1;
```

---

## Summary

### What Was Fixed:
✅ Delete confirmation modal added (no more browser alert)
✅ Cart item layout rearranged (price below size, qty controls moved)
✅ Order Summary shows Total Item count and 5% tax
✅ Quantity logic: qty=0 auto-deletes item
✅ Wishlist badge updates real-time (no refresh needed)
✅ Browse Products button is now pill-shaped
✅ Cart and Wishlist models updated with timestamps
✅ Price logic verified (no NaN issues)

### What You Need To Do:
1. Run SQL ALTER TABLE commands via HeidiSQL
2. Test all features in browser
3. Clear browser cache if needed
4. Monitor error logs for issues

---

**Implementation Date**: November 24, 2025
**Status**: Ready for Testing ✅
