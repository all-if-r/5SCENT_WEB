# Phone Number Refactoring - Implementation Complete

## Migration Status ✅

**Migration File:** `2025_12_10_add_phone_number_to_orders.php`
**Status:** Successfully executed (Batch 10)

```bash
php artisan migrate --path=database/migrations/2025_12_10_add_phone_number_to_orders.php --force
```

---

## Database Schema

### Orders Table - New Column

**Added:**
- `phone_number` VARCHAR(20) NULL
- **Position:** Before `address_line` column
- **Format:** Stored as +62... (e.g., +6281234567890)

---

## Backend Implementation

### 1. PhoneNormalizer Service

**File:** `app/Services/PhoneNormalizer.php`

**Purpose:** Normalize phone numbers to +62 format

**Logic:**
```php
// If already starts with +62, return as is
// If starts with 0, replace with +62
// If starts with 62 (without +), add +
// If all digits, add +62 prefix
// Otherwise, return as-is to avoid data loss
```

**Example Conversions:**
- `081234567890` → `+6281234567890`
- `+6281234567890` → `+6281234567890` (no change)
- `6281234567890` → `+6281234567890`
- `01234567890` → `+6281234567890`

### 2. Order Model

**File:** `app/Models/Order.php`

**Updated $fillable:**
```php
protected $fillable = [
    'user_id',
    'subtotal',
    'total_price',
    'status',
    'phone_number',        // NEW
    'address_line',
    'district',
    'city',
    'province',
    'postal_code',
    'tracking_number',
    'payment_method',
];
```

### 3. OrderController

**File:** `app/Http/Controllers/OrderController.php`

**Changes:**

1. **Import PhoneNormalizer:**
```php
use App\Services\PhoneNormalizer;
```

2. **Updated Validation:**
```php
$validated = $request->validate([
    'cart_ids' => 'required|array',
    'cart_ids.*' => 'exists:cart,cart_id',
    'phone_number' => 'required|string|max:20',
    'address_line' => 'required|string|max:255',
    'district' => 'required|string|max:255',
    'city' => 'required|string|max:255',
    'province' => 'required|string|max:255',
    'postal_code' => 'required|string|max:20',
    'payment_method' => 'required|in:QRIS,Virtual_Account,Cash',
]);
```

3. **Normalize and Save Phone:**
```php
// Normalize phone number to +62 format
$normalizedPhone = PhoneNormalizer::normalize($validated['phone_number']);

$order = Order::create([
    'user_id' => $request->user()->user_id,
    'status' => $orderStatus,
    'phone_number' => $normalizedPhone,  // Saved as +62...
    'address_line' => $validated['address_line'],
    'district' => $validated['district'],
    'city' => $validated['city'],
    'province' => $validated['province'],
    'postal_code' => $validated['postal_code'],
    'subtotal' => $subtotal,
    'total_price' => $totalPrice,
    'payment_method' => $validated['payment_method'],
]);
```

---

## Frontend Implementation

### 1. Checkout Page

**File:** `app/checkout/page.tsx`

**Change:** Updated API request to send phone_number

```typescript
const response = await api.post('/orders', {
    cart_ids: selectedItemIds,
    phone_number: formData.phoneNumber,      // NEW - sent from form
    address_line: formData.addressLine,
    district: formData.district,
    city: formData.city,
    province: formData.province,
    postal_code: formData.postalCode,
    payment_method: paymentMethod,
});
```

**Notes:**
- `formData.phoneNumber` comes from the checkout form
- "Use My Data" button still pre-fills from `user.phone` (optional)
- Customer can modify the phone number before checkout
- The submitted value is saved to `orders.phone_number`

### 2. Customer Order History Modal

**File:** `app/orders/page.tsx`

**Changes:**

1. **Updated OrderData Interface:**
```typescript
interface OrderData {
    order_id: number;
    user_id: number;
    total_price: number;
    status: '...',
    phone_number?: string;        // NEW
    address_line?: string;
    district?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    tracking_number?: string;
    payment_method?: '...';
    created_at: string;
    updated_at: string;
    details: OrderItem[];
    user?: {
        name: string;
        phone?: string;
    };
    payment?: {...};
}
```

2. **Phone Display with Fallback:**
```tsx
<p className="text-sm font-medium text-gray-900">
    {modal.order.phone_number || modal.order.user?.phone || 'N/A'}
</p>
```

**Priority:**
1. `order.phone_number` (order-specific phone)
2. `user.phone` (profile phone as fallback)
3. 'N/A' (if both empty)

### 3. Admin Order Management Modal

**File:** `app/admin/orders/page.tsx`

**Changes:**

1. **Updated Order Interface:**
```typescript
interface Order {
    order_id: number;
    user_id: number;
    status: string;
    tracking_number: string | null;
    subtotal: number;
    total_price: number;
    phone_number: string | null;     // NEW
    address_line: string | null;
    district: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    created_at: string;
    payment_method?: string;
    payment?: Payment;
    user?: {
        name: string;
        email: string;
        phone?: string;
    };
    details?: OrderItem[];
}
```

2. **Phone Display with Fallback:**
```tsx
<div className="text-sm font-medium text-gray-900">
    {selectedOrder.phone_number || selectedOrder.user?.phone || 'N/A'}
</div>
```

**Priority (Same as Customer):**
1. `order.phone_number` (order-specific phone)
2. `user.phone` (profile phone as fallback)
3. 'N/A' (if both empty)

---

## API Contract

### Checkout Endpoint
**Endpoint:** `POST /orders`

**Request Body:**
```json
{
    "cart_ids": [1, 2, 3],
    "phone_number": "081234567890",
    "address_line": "Jl. Anta",
    "district": "Antapanoy",
    "city": "Bandung",
    "province": "Jawa Barat",
    "postal_code": "12345",
    "payment_method": "QRIS"
}
```

**Backend Processing:**
- Validates phone_number is required and max 20 chars
- Normalizes to +62... format
- Saves to `orders.phone_number`

**Response:**
```json
{
    "order_id": 1,
    "user_id": 5,
    "status": "Pending",
    "phone_number": "+6281234567890",
    "address_line": "Jl. Anta",
    "district": "Antapanoy",
    "city": "Bandung",
    "province": "Jawa Barat",
    "postal_code": "12345",
    "subtotal": 100000,
    "total_price": 105000,
    "payment_method": "QRIS",
    "created_at": "2025-12-10T12:34:56Z",
    "payment": {...}
}
```

### Order Retrieval (Customer & Admin)
**Response Includes:**
```json
{
    "order_id": 1,
    "phone_number": "+6281234567890",
    "user": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+6282987654321"
    }
}
```

**Display Logic:**
- Use `phone_number` if available (order-specific)
- Fall back to `user.phone` if order phone is null
- Show 'N/A' if both are empty

---

## Behavior Changes

### ✅ What Works as Before
- "Use My Data" button pre-fills phone field from user profile
- Customer can modify the phone number during checkout
- All other order functionality unchanged

### ✅ What's Fixed
- **Order Specificity:** Each order now has its own phone number
- **Data Accuracy:** If user changed their phone after ordering, old orders still show the phone used at checkout
- **API Priority:** Phone is read from order first, then user profile as fallback
- **Consistency:** Both customer and admin views use the same priority

### ⚠️ Breaking Changes
- API now requires `phone_number` field (not optional)
- Response includes `phone_number` in order object
- Old code expecting phone only from user profile may need updates

---

## Phone Number Normalization Examples

| Input | Stored As | Notes |
|-------|-----------|-------|
| `081234567890` | `+6281234567890` | Local format → International |
| `+6281234567890` | `+6281234567890` | Already normalized → No change |
| `6281234567890` | `+6281234567890` | Country code without + → Add + |
| `01234567890` | `+6281234567890` | Old format → Convert 0 to +62 |
| `invalid` | `invalid` | Invalid format → Stored as-is (no crash) |

---

## Migration File

**Location:** `database/migrations/2025_12_10_add_phone_number_to_orders.php`

**Up Method:**
```php
public function up(): void
{
    Schema::table('orders', function (Blueprint $table) {
        $table->string('phone_number', 20)->nullable()->before('address_line');
    });
}
```

**Down Method:**
```php
public function down(): void
{
    Schema::table('orders', function (Blueprint $table) {
        $table->dropColumn('phone_number');
    });
}
```

**Status:** ✅ Already Migrated (Batch 10)

---

## Testing Checklist

- [ ] **Database:** Verify `phone_number` column exists in orders table
- [ ] **Checkout - With "Use My Data":**
  - Add items to cart
  - Click "Use My Data"
  - Verify phone pre-filled from user profile
  - Proceed to checkout
  - Verify order has correct phone in database
- [ ] **Checkout - Manual Phone Entry:**
  - Add items to cart
  - Don't use "Use My Data"
  - Manually enter phone (e.g., 081234567890)
  - Proceed to checkout
  - Verify order saved as +6281234567890 in database
- [ ] **Checkout - Already +62 Format:**
  - Manually enter phone as +6281234567890
  - Proceed to checkout
  - Verify stored without modification
- [ ] **Order History - Phone Display:**
  - View customer order history
  - Verify phone shown is from order, not profile
  - Change user profile phone number
  - Verify old orders still show original phone
- [ ] **Admin Orders - Phone Display:**
  - Open admin order management
  - Click order detail
  - Verify phone shown is from order, not profile
  - Verify phone displays correctly in list view
- [ ] **Fallback Logic:**
  - Create order with custom phone
  - View order (should show order phone)
  - Clear order phone_number (set NULL in DB)
  - View order (should fall back to user.phone)
  - Clear user.phone
  - View order (should show 'N/A')

---

## Rollback Instructions

If needed, the migration can be safely rolled back:

```bash
php artisan migrate:rollback --path=database/migrations/2025_12_10_add_phone_number_to_orders.php --force
```

This will:
1. Drop the `phone_number` column from orders table
2. Restore the database to pre-migration state

**Data Loss Warning:** Any phone numbers stored in the column will be lost on rollback.

---

## Files Modified

### Backend
- ✅ `app/Services/PhoneNormalizer.php` - CREATED
- ✅ `app/Models/Order.php` - Updated $fillable
- ✅ `app/Http/Controllers/OrderController.php` - Updated validation and store method
- ✅ `database/migrations/2025_12_10_add_phone_number_to_orders.php` - CREATED & EXECUTED

### Frontend
- ✅ `app/checkout/page.tsx` - Updated API payload
- ✅ `app/orders/page.tsx` - Updated interface and display logic
- ✅ `app/admin/orders/page.tsx` - Updated interface and display logic

---

## Summary

✅ **Database:** Phone number column added to orders table
✅ **Backend:** PhoneNormalizer service created, OrderController updated to accept and normalize phone
✅ **Frontend - Checkout:** Phone number sent with order creation
✅ **Frontend - Customer:** Order history displays phone from order with user fallback
✅ **Frontend - Admin:** Order detail modal displays phone from order with user fallback
✅ **Migration:** Successfully executed (Batch 10)

**Status:** Ready for testing!
