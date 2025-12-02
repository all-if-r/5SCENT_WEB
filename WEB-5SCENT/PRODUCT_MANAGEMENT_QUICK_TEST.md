# Product Management - Quick Test Checklist

## ✅ Fixed Issues

### 1. Database Missing Timestamps
- **Migration**: `2025_11_27_add_timestamps_to_productimage_table.php` ✅
- **Status**: Executed successfully
- **Columns Added**: `created_at`, `updated_at`

### 2. Toast Notifications Added
- Import: `import { useToast } from '@/contexts/ToastContext'` ✅
- Hook: `const { showToast } = useToast()` ✅
- Success messages on create/edit/delete ✅
- Error messages on failures ✅

### 3. Console Logging for Debugging
- FormData contents logged before send ✅
- Images array state logged ✅
- FormData contents logged after images appended ✅

---

## Quick Test Flow

### Test 1: Create Product (5 mins)
```
1. Admin > Products > + Add Product
2. Fill in ALL fields (name, notes, prices, stock)
3. Upload image to slot 1 (50ml) - REQUIRED
4. Click "Add Product"
5. ✅ Green toast should appear: "Product 'X' created successfully!"
6. ✅ Product in list with image
```

**Console**: Open DevTools → Console before clicking "Add Product"
- Should see "FormData contents:" logged
- Should see "images[0]:" with File name

### Test 2: Edit Product (5 mins)
```
1. Find product from Test 1
2. Click edit (pencil) icon
3. Change price: 100 → 120
4. Change image for slot 1 (upload new file)
5. Click "Update Product"
6. ✅ Green toast: "Product 'X' updated successfully!"
7. ✅ Price updated in list
8. ✅ New image file appears in /public/products/
```

**Console**: Watch for FormData and images logs

### Test 3: Delete Product (2 mins)
```
1. Find product from Test 2
2. Click delete (trash) icon
3. Confirm deletion
4. ✅ Green toast: "'X' deleted successfully!"
5. ✅ Product removed from list
6. ✅ Image files deleted from /public/products/
```

---

## Database Verification

Open MySQL client and run:
```sql
-- Check productimage columns (should include created_at, updated_at)
DESCRIBE productimage;

-- Check a product's images
SELECT * FROM productimage WHERE product_id = 1 LIMIT 1;

-- Should show:
-- image_id | product_id | image_url | is_50ml | created_at | updated_at
```

---

## File System Check
Navigate to: `frontend/web-5scent/public/products/`

Should see files like: `Test_Product_0.png`, `Test_Product_1.png`, etc.

---

## If Something Breaks

**Check these in order**:
1. Browser console for "FormData contents:" logs
2. Browser network tab - see what's being sent
3. Laravel log: `tail backend/laravel-5scent/storage/logs/laravel.log`
4. Database: `DESCRIBE productimage` - verify columns exist

---

## Summary of Changes

| Component | Change | Status |
|-----------|--------|--------|
| Database | Add `created_at`, `updated_at` columns | ✅ Migration created & run |
| Frontend | Import & use `useToast()` hook | ✅ Added to products page |
| Frontend | Show success toasts on create/edit/delete | ✅ Implemented |
| Frontend | Show error toasts on failures | ✅ Implemented |
| Frontend | Add FormData logging for debugging | ✅ Added 3 console.log points |

**Next step**: Test the flow above and watch browser console logs!
