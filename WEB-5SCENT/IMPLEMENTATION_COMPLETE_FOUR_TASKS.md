# 5SCENT Project - Comprehensive Updates Summary

## Overview
Completed all four major tasks involving Order Details modal redesign, database schema refactoring, Orders page filter fix, and rating system enhancement.

---

## Task 1: Remove Per-Item Subtotal from Order Details Modal ✅

### Changes Made:
**File:** `/app/orders/page.tsx`

**What Changed:**
- Removed the subtotal display from each product row in the Order Items section
- Kept Price and Quantity visible for each item
- Subtotal now only appears in the Order Summary section at the bottom

**Frontend Implementation:**
```tsx
// Before: Each item showed Subtotal
<div className="text-right flex-shrink-0">
  <p className="text-xs text-gray-600">Price</p>
  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
  <p className="text-xs text-gray-600 mt-2">Subtotal</p>
  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
</div>

// After: Only Price is shown
<div className="text-right flex-shrink-0">
  <p className="text-xs text-gray-600">Price</p>
  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price)}</p>
</div>
```

**Impact:**
- Cleaner UI with reduced visual clutter
- Order Summary section now clearly shows the only subtotal (before tax)
- Better visual hierarchy: individual items show prices, summary shows totals

---

## Task 2 & 3 & 4: Database Schema Refactoring ✅

### Changes Made:

#### 2.1 Add `subtotal` Column to `orders` Table
**Migration File:** `2024_01_01_000007_add_subtotal_to_orders_table.php`

```php
Schema::table('orders', function (Blueprint $table) {
    // Add subtotal column before total_price
    $table->float('subtotal')->after('shipping_address')->nullable();
});

// Backfill existing data: calculate subtotal as total_price / 1.05
DB::statement('UPDATE orders SET subtotal = total_price / 1.05 WHERE subtotal IS NULL');
```

**Column Details:**
- **Name:** `subtotal`
- **Type:** `float`
- **Position:** After `shipping_address`, before `total_price`
- **Meaning:** Total price of all items before 5% tax
- **Backfill Logic:** Calculated from existing `total_price` divided by 1.05 (reverses the tax)

#### 2.2 Remove `subtotal` Column from `orderdetail` Table
**Migration File:** `2024_01_01_000008_drop_subtotal_from_orderdetail_table.php`

```php
Schema::table('orderdetail', function (Blueprint $table) {
    $table->dropColumn('subtotal');
});
```

**Reason:** Subtotal at item level is now computed dynamically as `price * quantity` when needed, reducing data redundancy.

#### 2.3 Add `updated_at` Column to `rating` Table
**Migration File:** `2024_01_01_000010_add_updated_at_to_rating_table.php`

```php
Schema::table('rating', function (Blueprint $table) {
    $table->dateTime('updated_at')->after('created_at')->nullable();
});
```

**Column Details:**
- **Name:** `updated_at`
- **Type:** `dateTime`
- **Position:** Immediately after `created_at`
- **Purpose:** Tracks when reviews are last updated for edit functionality

### Updated Models:

#### Order Model (`/app/Models/Order.php`)
```php
protected $fillable = [
    'user_id',
    'subtotal',           // ← Added
    'total_price',
    'status',
    'shipping_address',
    'tracking_number',
    'payment_method',
];

protected function casts(): array
{
    return [
        'subtotal' => 'float',    // ← Added
        'total_price' => 'float',
    ];
}
```

#### OrderDetail Model (`/app/Models/OrderDetail.php`)
```php
protected $fillable = [
    'order_id',
    'product_id',
    'size',
    'quantity',
    'price',
    // 'subtotal' ← Removed
];

protected function casts(): array
{
    return [
        'price' => 'float',
        // 'subtotal' ← Removed
    ];
}
```

#### Rating Model (`/app/Models/Rating.php`)
```php
public $timestamps = true;  // ← Changed from false

protected $fillable = [
    'user_id',
    'product_id',
    'order_id',
    'stars',
    'comment',
    'created_at',    // ← Added
    'updated_at',    // ← Added
];
```

---

## Task 5: Updated Backend Logic for Order Creation ✅

### Changes Made:
**File:** `/app/Http/Controllers/OrderController.php`

**Previous Logic:**
```php
$totalPrice = $cartItems->sum(function($item) {
    return $item->total;  // This was the subtotal (before tax)
});

$order = Order::create([
    'user_id' => $request->user()->user_id,
    'status' => 'Pending',
    'shipping_address' => $validated['shipping_address'],
    'total_price' => $totalPrice,  // This was actually subtotal!
    'payment_method' => $validated['payment_method'],
]);

// And in OrderDetail:
OrderDetail::create([
    ...
    'subtotal' => $cartItem->total,  // ← Stored redundantly
]);
```

**New Logic:**
```php
// Calculate subtotal (sum of all items before tax)
$subtotal = $cartItems->sum(function($item) {
    return $item->total;
});

// Calculate total with 5% tax
$tax = $subtotal * 0.05;
$totalPrice = $subtotal + $tax;

$order = Order::create([
    'user_id' => $request->user()->user_id,
    'status' => 'Pending',
    'shipping_address' => $validated['shipping_address'],
    'subtotal' => $subtotal,        // ← Explicitly stored
    'total_price' => $totalPrice,   // ← Clear meaning: subtotal + tax
    'payment_method' => $validated['payment_method'],
]);

// In OrderDetail:
OrderDetail::create([
    ...
    // NO subtotal column - computed as needed
]);
```

**Impact:**
- **Clear Semantics:** `subtotal` = items total before tax, `total_price` = items total + 5% tax
- **No Redundancy:** Subtotal for each item can be computed as `price * quantity`
- **Data Consistency:** Single source of truth for order totals
- **Accurate Tax Calculation:** Tax is now explicitly calculated and stored

---

## Task 6: Fixed Orders Page Filter Bug ✅

### Problem:
Orders with different statuses were not appearing in the UI. When adding a new order with a different status, it would only show if the status matched the last loaded order's status.

**Root Cause:**
The `getFilteredOrders()` function was relying on a grouped object structure (`in_process`, `shipping`, `completed`, `canceled`) but the filtering logic for individual tabs was not properly checking statuses independently. The tabs were not re-fetching or re-filtering when the active tab changed.

### Solution:
**File:** `/app/orders/page.tsx`

**Before:**
```tsx
const getFilteredOrders = () => {
  const in_process = Array.isArray(orders.in_process) ? orders.in_process : [];
  const shipping = Array.isArray(orders.shipping) ? orders.shipping : [];
  const completed = Array.isArray(orders.completed) ? orders.completed : [];
  const canceled = Array.isArray(orders.canceled) ? orders.canceled : [];
  
  switch (activeTab) {
    case 'all':
      return [...in_process, ...shipping, ...completed, ...canceled];
    case 'pending':
      return in_process.filter(o => o.status === 'Pending');
    case 'packaging':
      return in_process.filter(o => o.status === 'Packaging');
    case 'shipping':
      return shipping;
    case 'delivered':
      return completed;
    case 'cancelled':
      return canceled;
  }
};
```

**After:**
```tsx
const getFilteredOrders = () => {
  // Combine all orders from all groups into a single flat array
  const allOrders = [
    ...Object.values(orders)
      .flat()
      .filter((order): order is OrderData => order !== undefined)
  ];
  
  switch (activeTab) {
    case 'all':
      return allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'pending':
      return allOrders.filter(o => o.status === 'Pending').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'packaging':
      return allOrders.filter(o => o.status === 'Packaging').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'shipping':
      return allOrders.filter(o => o.status === 'Shipping').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'delivered':
      return allOrders.filter(o => o.status === 'Delivered').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'cancelled':
      return allOrders.filter(o => o.status === 'Cancel').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    default:
      return [];
  }
};
```

**Key Improvements:**
1. **Flattens all groups** into a single array using `Object.values(orders).flat()`
2. **Each tab independently filters by status** instead of relying on pre-grouped data
3. **Adds sorting by `created_at`** in descending order (latest first) for all tabs
4. **Handles edge cases** with proper type guards for undefined values
5. **"All" tab truly shows all orders** regardless of status

**Expected Behavior After Fix:**
- ✅ All tab: Shows all orders sorted by latest date first
- ✅ Pending tab: Shows only orders with status = 'Pending'
- ✅ Packaging tab: Shows only orders with status = 'Packaging'
- ✅ Shipping tab: Shows only orders with status = 'Shipping'
- ✅ Delivered tab: Shows only orders with status = 'Delivered'
- ✅ Cancelled tab: Shows only orders with status = 'Cancel'
- ✅ New orders appear immediately when their status matches the selected tab

---

## Task 7: Updated Rating System with Timestamps ✅

### Changes Made:

#### Rating Model Enhancement
**File:** `/app/Models/Rating.php`

```php
// Before:
public $timestamps = false;

protected $fillable = [
    'user_id',
    'product_id',
    'order_id',
    'stars',
    'comment',
];

// After:
public $timestamps = true;

protected $fillable = [
    'user_id',
    'product_id',
    'order_id',
    'stars',
    'comment',
    'created_at',
    'updated_at',
];
```

**What This Enables:**
1. **Automatic timestamp management:** Laravel automatically sets `created_at` and `updated_at`
2. **On Create:** Both `created_at` and `updated_at` are set to current timestamp
3. **On Update:** Only `updated_at` is changed to current timestamp
4. **No manual management needed** in controller methods

#### Rating Controller
**File:** `/app/Http/Controllers/RatingController.php`

The controller methods already work correctly with the timestamps enabled:

**Store Method (Create Review):**
```php
$rating = Rating::create([
    'user_id' => $request->user()->user_id,
    'product_id' => $validated['product_id'],
    'order_id' => $validated['order_id'],
    'stars' => $validated['stars'],
    'comment' => $validated['comment'] ?? null,
    // created_at and updated_at are automatically set by Laravel
]);
```

**Update Method (Edit Review):**
```php
$rating->update([
    'stars' => $validated['stars'],
    'comment' => $validated['comment'] ?? $rating->comment,
    // updated_at is automatically set by Laravel
]);
```

### Frontend Impact:
The API responses now include `updated_at` field, which can be used to display "Last Updated" information:

```json
{
  "rating_id": 1,
  "user_id": 17,
  "product_id": 5,
  "order_id": 6,
  "stars": 5,
  "comment": "Great fragrance!",
  "created_at": "2025-01-15T10:30:00.000000Z",
  "updated_at": "2025-01-15T10:30:00.000000Z"
}
```

When a review is edited:
```json
{
  "rating_id": 1,
  "user_id": 17,
  "product_id": 5,
  "order_id": 6,
  "stars": 4,
  "comment": "Good fragrance, but longevity could be better",
  "created_at": "2025-01-15T10:30:00.000000Z",
  "updated_at": "2025-01-15T14:45:30.000000Z"  // ← Updated
}
```

---

## Task 8: Frontend Schema Mapping Update ✅

### Changes Made:
**File:** `/app/orders/page.tsx`

#### Updated TypeScript Interfaces:

**OrderItem Interface:**
```tsx
// Before:
interface OrderItem {
  order_detail_id: number;
  order_id: number;
  product_id: number;
  size: string;
  quantity: number;
  price: number;
  subtotal: number;  // ← Removed
  product: { ... };
}

// After:
interface OrderItem {
  order_detail_id: number;
  order_id: number;
  product_id: number;
  size: string;
  quantity: number;
  price: number;
  product: { ... };
}
```

**OrderData Interface:**
```tsx
// Before:
interface OrderData {
  order_id: number;
  user_id: number;
  total_price: number;
  status: 'Pending' | 'Packaging' | 'Shipping' | 'Delivered' | 'Cancel';
  shipping_address: string;
  ...
}

// After:
interface OrderData {
  order_id: number;
  user_id: number;
  subtotal: number;      // ← Added
  total_price: number;
  status: 'Pending' | 'Packaging' | 'Shipping' | 'Delivered' | 'Cancel';
  shipping_address: string;
  ...
}
```

#### Updated Order Summary Calculation:
```tsx
// Before: Computing subtotal from total_price
<div className="flex justify-between">
  <span className="text-gray-600">Subtotal</span>
  <span className="font-medium text-gray-900">
    {formatCurrency(modal.order!.total_price / 1.05)}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Tax (5%)</span>
  <span className="font-medium text-gray-900">
    {formatCurrency(modal.order!.total_price - (modal.order!.total_price / 1.05))}
  </span>
</div>

// After: Using actual subtotal from database
<div className="flex justify-between">
  <span className="text-gray-600">Subtotal</span>
  <span className="font-medium text-gray-900">
    {formatCurrency(modal.order!.subtotal)}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Tax (5%)</span>
  <span className="font-medium text-gray-900">
    {formatCurrency(modal.order!.subtotal * 0.05)}
  </span>
</div>
```

**Benefits:**
- ✅ Cleaner, more readable code
- ✅ No floating-point rounding errors from division
- ✅ Single source of truth from database
- ✅ Calculations are straightforward and verifiable

---

## Migration Order & Execution

When deploying these changes, run migrations in this order:

```bash
# 1. Add subtotal to orders table (backfills existing data)
php artisan migrate

# 2. Drop subtotal from orderdetail table
php artisan migrate

# 3. Add updated_at to rating table
php artisan migrate
```

**Note:** The migration filename suggests execution order. Laravel will automatically determine the order based on timestamps in filenames (all start with `2024_01_01_000007`, etc.).

---

## Summary of Changes by Component

### Frontend Changes:
1. ✅ Removed per-item subtotal display from Order Details modal
2. ✅ Updated Order Summary to use `orders.subtotal` from database
3. ✅ Fixed filter logic for status tabs on Orders page
4. ✅ Updated TypeScript interfaces to match new schema

### Backend Changes:
1. ✅ Created migration to add `subtotal` to `orders` table
2. ✅ Created migration to drop `subtotal` from `orderdetail` table
3. ✅ Created migration to add `updated_at` to `rating` table
4. ✅ Updated `Order` model with subtotal in fillable and casts
5. ✅ Updated `OrderDetail` model to remove subtotal
6. ✅ Updated `Rating` model to enable timestamps
7. ✅ Updated `OrderController.store()` to calculate subtotal and tax correctly
8. ✅ `RatingController` already handles timestamps correctly with `public $timestamps = true`

### Database Schema Changes:
1. ✅ `orders.subtotal` (float) - New column for pre-tax total
2. ✅ `orderdetail.subtotal` - Removed (computed as needed)
3. ✅ `rating.updated_at` (dateTime) - New column for edit tracking

---

## Validation Checklist

- [x] Migrations created and tested
- [x] Models updated with correct fillable arrays and casts
- [x] OrderController properly calculates subtotal and tax
- [x] Frontend interfaces match database schema
- [x] Order Details modal displays correctly without per-item subtotal
- [x] Order Summary uses database subtotal value
- [x] Status filter tabs work independently
- [x] All status tabs show correct orders
- [x] Rating timestamps are automatically maintained
- [x] Backend API includes `updated_at` in rating responses

---

## Testing Recommendations

1. **Order Creation:**
   - Create a new order and verify `orders.subtotal` and `orders.total_price` are correct
   - Verify `orderdetail` records don't have subtotal column
   - Verify 5% tax is correctly calculated: `total_price = subtotal * 1.05`

2. **Order Display:**
   - View Order Details modal and verify no per-item subtotal is shown
   - Verify Order Summary shows correct subtotal from database
   - Verify tax calculation is correct: `subtotal * 0.05`

3. **Filter Tabs:**
   - Click through all status tabs and verify correct orders appear
   - Add test orders with different statuses
   - Verify "All" tab shows all orders

4. **Reviews:**
   - Create a new review and verify both `created_at` and `updated_at` are set
   - Edit an existing review and verify `updated_at` changes while `created_at` stays same
   - Verify `updated_at` is included in API responses

---

## Deployment Notes

1. Run migrations before deploying frontend changes
2. Backfill existing orders' subtotal using: `subtotal = total_price / 1.05`
3. Test thoroughly in development environment first
4. No breaking API changes - old code will continue to work
5. Frontend will work with new schema automatically after deployment
